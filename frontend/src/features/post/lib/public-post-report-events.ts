export const PUBLIC_POST_REPORT_SSE_EVENT = "post-report.created"
export const PUBLIC_POST_REPORT_BROWSER_EVENT = "public-post-report-created"

export const publicPostReportEventsUrl = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"}/api/post/api/posts/events`

export const announcePublicPostReportCreated = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PUBLIC_POST_REPORT_BROWSER_EVENT))
}
