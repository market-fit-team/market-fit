import type {
  CatalogResponse,
  EvaluationResponse,
  PredictResponse,
  ResolvedProfileResponse,
  UserProfile,
} from "@/app/example/two-tower/_components/two-tower-types"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ONBOARDING_API_BASE_URL ??
  "http://localhost:8088/api/onboarding"

export const DEMO_AUTH_USER_UUID =
  process.env.NEXT_PUBLIC_TWO_TOWER_DEMO_AUTH_USER_UUID ??
  "123e4567-e89b-12d3-a456-426614174000"

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const fetchCatalog = () =>
  fetchJson<CatalogResponse>("/two-tower/catalog")

export const fetchPrediction = (userProfile: UserProfile, topK = 5) =>
  fetchJson<PredictResponse>("/two-tower/predict", {
    method: "POST",
    body: JSON.stringify({
      top_k: topK,
      user_profile: userProfile,
    }),
  })

export const trainTwoTowerModel = (epochs = 16) =>
  fetchJson<EvaluationResponse>("/two-tower/train", {
    method: "POST",
    body: JSON.stringify({ epochs }),
  })

export const fetchSavedProfile = async (
  authUserUuid: string,
  topK = 5
): Promise<ResolvedProfileResponse | null> => {
  const response = await fetch(
    `${API_BASE_URL}/two-tower/profiles/users/${authUserUuid}?top_k=${topK}`
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<ResolvedProfileResponse>
}

export const saveUserTowerProfile = (
  authUserUuid: string,
  userProfile: UserProfile,
  topK = 5
) =>
  fetchJson<ResolvedProfileResponse>(
    `/two-tower/profiles/users/${authUserUuid}`,
    {
      method: "PUT",
      body: JSON.stringify({
        top_k: topK,
        source: "manual",
        user_profile: userProfile,
      }),
    }
  )

export const fetchProfileByCode = (profileCode: string, topK = 5) =>
  fetchJson<ResolvedProfileResponse>(
    `/two-tower/profiles/code/${profileCode}?top_k=${topK}`
  )

export { API_BASE_URL }
