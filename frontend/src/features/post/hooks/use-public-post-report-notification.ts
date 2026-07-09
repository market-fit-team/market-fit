"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  PUBLIC_POST_REPORT_BROWSER_EVENT,
  PUBLIC_POST_REPORT_SSE_EVENT,
  type PublicPostReportBrowserEventDetail,
  announcePublicPostReportCreated,
  publicPostReportEventsUrl,
} from "@/features/post/lib/public-post-report-events"

type PublicPostReportSsePayload = {
  notificationCategory?: "FRANCHISE" | null
  message?: string | null
  postIds?: string[]
  createdCount?: number
  representativePostId?: string | null
  representativeTitle?: string | null
}

const parsePayload = (event: Event): PublicPostReportSsePayload | null => {
  if (!("data" in event) || typeof event.data !== "string") return null
  try {
    return JSON.parse(event.data) as PublicPostReportSsePayload
  } catch {
    return null
  }
}

const isFranchiseEvent = (detail?: PublicPostReportBrowserEventDetail | null) =>
  detail?.notificationCategory === "FRANCHISE"

export function usePublicPostReportNotification() {
  const [hasNewReport, setHasNewReport] = useState(false)

  useEffect(() => {
    const handleBrowserEvent = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as PublicPostReportBrowserEventDetail | null)
          : null
      if (!isFranchiseEvent(detail)) return

      setHasNewReport(true)
      toast.success(
        detail?.message ?? "새로운 프랜차이즈 AI 칼럼이 생성되었습니다.",
        {
          action: {
            label: "바로 보기",
            onClick: () => {
              document
                .getElementById("main-post-carousel-title")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            },
          },
        }
      )
    }
    window.addEventListener(
      PUBLIC_POST_REPORT_BROWSER_EVENT,
      handleBrowserEvent
    )

    if (typeof EventSource === "undefined") {
      return () =>
        window.removeEventListener(
          PUBLIC_POST_REPORT_BROWSER_EVENT,
          handleBrowserEvent
        )
    }

    const eventSource = new EventSource(publicPostReportEventsUrl)
    eventSource.onerror = () => undefined
    const handleSseEvent = (event: Event) => {
      const payload = parsePayload(event)
      if (payload?.notificationCategory !== "FRANCHISE") return
      announcePublicPostReportCreated({
        notificationCategory: payload.notificationCategory,
        message: payload.message,
        postIds: payload.postIds,
        createdCount: payload.createdCount,
        representativePostId: payload.representativePostId,
        representativeTitle: payload.representativeTitle,
      })
    }
    eventSource.addEventListener(PUBLIC_POST_REPORT_SSE_EVENT, handleSseEvent)

    return () => {
      eventSource.removeEventListener(
        PUBLIC_POST_REPORT_SSE_EVENT,
        handleSseEvent
      )
      eventSource.close()
      window.removeEventListener(
        PUBLIC_POST_REPORT_BROWSER_EVENT,
        handleBrowserEvent
      )
    }
  }, [])

  return {
    hasNewReport,
    clearNewReport: () => setHasNewReport(false),
  }
}
