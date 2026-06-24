"use client"

import { useEffect, useState } from "react"
import { type MainPost, getMainPosts } from "@/features/post/api/get-main-posts"
import { PUBLIC_POST_REPORT_BROWSER_EVENT } from "@/features/post/lib/public-post-report-events"

const DEFAULT_ERROR_MESSAGE = "메인 Post를 불러오지 못했습니다."

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : DEFAULT_ERROR_MESSAGE

export function useMainPosts(limit = 10) {
  const [result, setResult] = useState<{
    limit: number | null
    posts: MainPost[]
    error: string | null
  }>({
    limit: null,
    posts: [],
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()

    const loadPosts = () => getMainPosts(limit, controller.signal)
      .then((posts) => {
        setResult({ limit, posts, error: null })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          limit,
          posts: [],
          error: getErrorMessage(cause),
        })
      })

    void loadPosts()
    const handleCreated = () => void loadPosts()
    window.addEventListener(PUBLIC_POST_REPORT_BROWSER_EVENT, handleCreated)

    return () => {
      controller.abort()
      window.removeEventListener(
        PUBLIC_POST_REPORT_BROWSER_EVENT,
        handleCreated
      )
    }
  }, [limit])

  const isLoading = result.limit !== limit

  return {
    posts: isLoading ? [] : result.posts,
    isLoading,
    error: isLoading ? null : result.error,
  }
}
