"use client"

import { Bell } from "lucide-react"
import { usePublicPostReportNotification } from "@/features/post/hooks/use-public-post-report-notification"

export function PublicPostReportBell() {
  const { hasNewReport, clearNewReport } = usePublicPostReportNotification()

  return (
    <button
      type="button"
      aria-label={
        hasNewReport ? "새 AI 리포트 알림 확인" : "새 AI 리포트 알림 없음"
      }
      className="inline-flex size-9 items-center justify-center rounded-md"
      onClick={clearNewReport}
    >
      <Bell
        aria-hidden="true"
        className={
          hasNewReport
            ? "size-5 text-primary transition-colors"
            : "size-5 text-muted-foreground transition-colors"
        }
      />
    </button>
  )
}
