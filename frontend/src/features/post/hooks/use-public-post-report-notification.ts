"use client"

import { useEffect, useState } from "react"
import {
  announcePublicPostReportCreated,
  PUBLIC_POST_REPORT_BROWSER_EVENT,
  PUBLIC_POST_REPORT_SSE_EVENT,
  publicPostReportEventsUrl,
} from "@/features/post/lib/public-post-report-events"

export function usePublicPostReportNotification() {
  const [hasNewReport, setHasNewReport] = useState(false)

  useEffect(() => {
    const handleBrowserEvent = () => setHasNewReport(true)
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
    const handleSseEvent = () => announcePublicPostReportCreated()
    eventSource.addEventListener(
      PUBLIC_POST_REPORT_SSE_EVENT,
      handleSseEvent
    )

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
