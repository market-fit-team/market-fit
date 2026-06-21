import type { PostSourceType } from "@/features/post/types/post"

export type MainPost = {
  id: string
  title: string
  summary: string
  thumbnailUrl: string | null
  sourceType: PostSourceType
  createdAt: string
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20
const mainPostsApiUrl = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8081"}/api/posts/main`
const normalizeLimit = (limit: number) => {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

const getErrorMessage = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as {
      detail?: string
      message?: string
    }
    return body.detail ?? body.message
  }

  const body = await response.text()
  return body || undefined
}

export async function getMainPosts(
  limit = DEFAULT_LIMIT,
  signal?: AbortSignal
): Promise<MainPost[]> {
  const query = new URLSearchParams({
    limit: normalizeLimit(limit).toString(),
  })
  const response = await fetch(`${mainPostsApiUrl}?${query}`, {
    method: "GET",
    signal,
  })

  if (!response.ok) {
    const message = await getErrorMessage(response)
    throw new Error(message ?? "메인 Post를 불러오지 못했습니다.")
  }

  return response.json() as Promise<MainPost[]>
}
