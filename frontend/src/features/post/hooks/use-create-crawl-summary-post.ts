"use client"

import { useState } from "react"
import { createCrawlSummaryPost } from "@/features/post/api/create-crawl-summary-post"
import { announcePublicPostReportCreated } from "@/features/post/lib/public-post-report-events"
import type {
  CrawlSummaryPost,
  CreateCrawlSummaryPostInput,
} from "@/features/post/types/post"

type CreateStatus = "idle" | "loading" | "success" | "error"

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail
  }
  return "크롤링 요약 Post를 생성하지 못했습니다."
}

export function useCreateCrawlSummaryPost() {
  const [status, setStatus] = useState<CreateStatus>("idle")
  const [data, setData] = useState<CrawlSummaryPost | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async (input: CreateCrawlSummaryPostInput) => {
    setStatus("loading")
    setError(null)
    setData(null)

    try {
      const post = await createCrawlSummaryPost(input)
      setData(post)
      setStatus("success")
      if (input.visibility === "PUBLIC") {
        announcePublicPostReportCreated()
      }
      return post
    } catch (cause) {
      setError(getErrorMessage(cause))
      setStatus("error")
      throw cause
    }
  }

  const reset = () => {
    setStatus("idle")
    setData(null)
    setError(null)
  }

  return {
    create,
    reset,
    status,
    data,
    error,
    isLoading: status === "loading",
  }
}
