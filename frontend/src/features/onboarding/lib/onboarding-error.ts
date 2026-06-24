import { problemDetailSchema } from "@/shared/api/problem-detail-schema"

export const getOnboardingErrorMessage = (
  error: unknown,
  fallbackMessage: string
) => {
  const parsedError = problemDetailSchema.safeParse(error)

  if (parsedError.success) {
    return parsedError.data.detail ?? parsedError.data.title ?? fallbackMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string" && error.length > 0) {
    return error
  }

  return fallbackMessage
}

export const getOnboardingErrorStatus = (error: unknown) => {
  const parsedError = problemDetailSchema.safeParse(error)

  if (parsedError.success) {
    return parsedError.data.status
  }

  return undefined
}
