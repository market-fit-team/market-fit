import { z } from "zod"
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  DISPLAY_NAME_REGEX,
} from "@/features/profile/lib/profile-defaults"
import { JOBS } from "@/features/profile/lib/profile-jobs"

export const profileFormSchema = z.object({
  age: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 150),
      "나이는 0~150 사이의 정수만 입력할 수 있습니다."
    ),
  avatarSeed: z.string().min(1),
  displayName: z
    .string()
    .trim()
    .min(
      DISPLAY_NAME_MIN_LENGTH,
      `닉네임은 ${DISPLAY_NAME_MIN_LENGTH}자 이상이어야 합니다.`
    )
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `닉네임은 ${DISPLAY_NAME_MAX_LENGTH}자 이하여야 합니다.`
    )
    .refine(
      (value) => value.toLowerCase() !== "default",
      "default는 사용할 수 없습니다."
    )
    .refine(
      (value) => DISPLAY_NAME_REGEX.test(value),
      "닉네임은 공백/특수문자 없이 영문, 한글, 숫자만 사용할 수 있고 숫자로 시작할 수 없습니다."
    ),
  job: z
    .string()
    .refine(
      (value) => value === "" || JOBS.includes(value as (typeof JOBS)[number]),
      "직업을 다시 선택해주세요."
    ),
})

export type ProfileFormValues = z.input<typeof profileFormSchema>
