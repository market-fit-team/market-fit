import {
  UserProfilePayload,
  type UserProfilePayloadOutput,
} from "@/shared/api/generated/onboarding/schemas"

const BASE36_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const PROFILE_CODE_PREFIX = "r"
const SURVEY_AWARE_PROFILE_CODE_VERSION = 3
const PROFILE_SCORE_BUCKETS = 101
const PROFILE_GROUP_SIZE = 3
const PROFILE_GROUP_WIDTH = 4
const SHARED_PROFILE_NAME = "공유 코드 프로필"

const ONBOARDING_CATEGORY_CODES = [
  "CS100001",
  "CS100003",
  "CS100004",
  "CS100005",
  "CS100007",
] as const

const ONBOARDING_PROFILE_CODE_FIELDS = [
  "budget_level",
  "stability_level",
  "subway_dependency_level",
  "weekend_preference_level",
  "evening_preference_level",
  "resident_focus_level",
  "worker_focus_level",
  "rent_sensitivity_level",
  "competition_tolerance_level",
] as const

type OnboardingProfileCodeField =
  (typeof ONBOARDING_PROFILE_CODE_FIELDS)[number]

export type DecodedOnboardingProfileCode = {
  preferredCategoryCode: string
  profileCode: string
  surveyCode: string
  userProfile: UserProfilePayloadOutput
}

export class InvalidOnboardingProfileCodeError extends Error {}

const intToBase36 = (value: number, width = 1) => {
  if (value < 0) {
    throw new InvalidOnboardingProfileCodeError(
      "base36 변환값은 0 이상이어야 합니다."
    )
  }

  let encoded = ""
  let current = value

  if (current === 0) {
    encoded = "0"
  }

  while (current > 0) {
    const remainder = current % 36
    current = Math.floor(current / 36)
    encoded = BASE36_ALPHABET[remainder] + encoded
  }

  return encoded.padStart(width, "0")
}

const base36ToInt = (value: string) => {
  const decoded = Number.parseInt(value, 36)

  if (Number.isNaN(decoded)) {
    throw new InvalidOnboardingProfileCodeError(
      "base36 문자열을 해석할 수 없습니다."
    )
  }

  return decoded
}

const validateSurveyCode = (surveyCode: string) => {
  const normalized = surveyCode.trim().toUpperCase()

  if (normalized.length !== 1 || !BASE36_ALPHABET.includes(normalized)) {
    throw new InvalidOnboardingProfileCodeError(
      "설문 코드는 base36 한 글자여야 합니다."
    )
  }

  return normalized
}

const decodeScoreGroup = (chunk: string) => {
  const value = base36ToInt(chunk)

  if (value < 0 || value >= PROFILE_SCORE_BUCKETS ** PROFILE_GROUP_SIZE) {
    throw new InvalidOnboardingProfileCodeError(
      "점수 그룹 값이 범위를 벗어났습니다."
    )
  }

  const decoded = [0, 0, 0]
  let current = value

  for (let index = PROFILE_GROUP_SIZE - 1; index >= 0; index -= 1) {
    const remainder = current % PROFILE_SCORE_BUCKETS
    current = Math.floor(current / PROFILE_SCORE_BUCKETS)
    decoded[index] = Number((remainder / 100).toFixed(2))
  }

  return decoded
}

const decodeScores = (normalizedProfileCode: string) => {
  const decodedScores: number[] = []

  if (normalizedProfileCode.length !== 16) {
    throw new InvalidOnboardingProfileCodeError(
      "공유 코드 길이가 올바르지 않습니다."
    )
  }

  for (let start = 4; start < 16; start += PROFILE_GROUP_WIDTH) {
    decodedScores.push(
      ...decodeScoreGroup(
        normalizedProfileCode.slice(start, start + PROFILE_GROUP_WIDTH)
      )
    )
  }

  return decodedScores
}

const buildDecodedUserProfile = (
  normalizedProfileCode: string,
  preferredCategoryCode: string,
  decodedScores: number[]
) => {
  const payload: Partial<
    Record<OnboardingProfileCodeField, number> & UserProfilePayloadOutput
  > = {
    preferred_category_code: preferredCategoryCode,
    profile_name: SHARED_PROFILE_NAME,
    user_id: `shared_${normalizedProfileCode.toLowerCase()}`,
  }

  ONBOARDING_PROFILE_CODE_FIELDS.forEach((fieldName, index) => {
    payload[fieldName] = decodedScores[index]
  })

  return UserProfilePayload.parse(payload)
}

export const decodeOnboardingProfileCode = (
  profileCode: string
): DecodedOnboardingProfileCode => {
  const normalized = profileCode.trim().toUpperCase()

  if (
    normalized.length < 3 ||
    !normalized.startsWith(PROFILE_CODE_PREFIX.toUpperCase())
  ) {
    throw new InvalidOnboardingProfileCodeError(
      "공유 코드 형식이 올바르지 않습니다."
    )
  }

  const version = base36ToInt(normalized[1] ?? "")

  if (version !== SURVEY_AWARE_PROFILE_CODE_VERSION) {
    throw new InvalidOnboardingProfileCodeError(
      "지원하지 않는 공유 코드 버전입니다."
    )
  }

  const surveyCode = validateSurveyCode(normalized[2] ?? "")
  const categoryIndex = base36ToInt(normalized[3] ?? "")
  const preferredCategoryCode = ONBOARDING_CATEGORY_CODES[categoryIndex]

  if (!preferredCategoryCode) {
    throw new InvalidOnboardingProfileCodeError(
      "업종 인덱스가 범위를 벗어났습니다."
    )
  }

  const decodedScores = decodeScores(normalized)
  const userProfile = buildDecodedUserProfile(
    normalized,
    preferredCategoryCode,
    decodedScores
  )

  return {
    preferredCategoryCode,
    profileCode: normalized.toLowerCase(),
    surveyCode,
    userProfile,
  }
}

export const encodeOnboardingProfileCode = (
  userProfile: UserProfilePayloadOutput,
  surveyCode: string
) => {
  const normalizedSurveyCode = validateSurveyCode(surveyCode)
  const categoryIndex = ONBOARDING_CATEGORY_CODES.findIndex(
    (categoryCode) => categoryCode === userProfile.preferred_category_code
  )

  if (categoryIndex < 0) {
    throw new InvalidOnboardingProfileCodeError(
      "등록되지 않은 업종 코드는 공유 코드로 변환할 수 없습니다."
    )
  }

  const chunks: string[] = []

  for (
    let offset = 0;
    offset < ONBOARDING_PROFILE_CODE_FIELDS.length;
    offset += PROFILE_GROUP_SIZE
  ) {
    let value = 0

    ONBOARDING_PROFILE_CODE_FIELDS.slice(
      offset,
      offset + PROFILE_GROUP_SIZE
    ).forEach((fieldName) => {
      const quantized = Math.round(Number(userProfile[fieldName]) * 100)

      if (quantized < 0 || quantized >= PROFILE_SCORE_BUCKETS) {
        throw new InvalidOnboardingProfileCodeError(
          "점수는 0 이상 1 이하여야 합니다."
        )
      }

      value = value * PROFILE_SCORE_BUCKETS + quantized
    })

    chunks.push(intToBase36(value, PROFILE_GROUP_WIDTH))
  }

  return `${PROFILE_CODE_PREFIX}${intToBase36(
    SURVEY_AWARE_PROFILE_CODE_VERSION
  )}${normalizedSurveyCode}${intToBase36(categoryIndex)}${chunks.join("")}`.toLowerCase()
}
