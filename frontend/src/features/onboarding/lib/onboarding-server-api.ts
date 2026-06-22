import "server-only"
import { DEFAULT_ONBOARDING_API_ORIGIN } from "@/features/onboarding/lib/onboarding-defaults"
import {
  SurveyDefinitionResponse,
  type SurveyDefinitionResponseOutput,
} from "@/shared/api/generated/onboarding/schemas"
import { problemDetailSchema } from "@/shared/api/problem-detail-schema"

const resolveOnboardingApiOrigin = () => {
  return process.env.NEXT_PUBLIC_API_ORIGIN ?? DEFAULT_ONBOARDING_API_ORIGIN
}

const createOnboardingApiUrl = (path: string) => {
  return `${resolveOnboardingApiOrigin()}/api/onboarding${path}`
}

const parseResponseBody = async (response: Response) => {
  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return response.json()
  }

  return response.text()
}

const fetchPublicOnboardingJson = async <T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  options?: RequestInit
) => {
  const response = await fetch(createOnboardingApiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await parseResponseBody(response)
    const parsedProblem = problemDetailSchema.safeParse(body)

    if (parsedProblem.success) {
      throw parsedProblem.data
    }

    throw {
      detail: typeof body === "string" ? body : "요청 처리에 실패했습니다.",
      status: response.status,
      title: response.statusText,
    }
  }

  return schema.parse(await parseResponseBody(response))
}

export const getActiveOnboardingSurveyDefinition =
  async (): Promise<SurveyDefinitionResponseOutput> => {
    return fetchPublicOnboardingJson(
      "/surveys/active",
      SurveyDefinitionResponse,
      {
        method: "GET",
        next: { revalidate: 3600 },
      }
    )
  }
