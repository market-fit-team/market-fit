import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PublicPostReportBell } from "@/features/post/components/public-post-report-bell/public-post-report-bell"

class MockEventSource {
  static listener: EventListener | null = null
  close = vi.fn()

  addEventListener(name: string, listener: EventListener) {
    if (name === "post-report.created") MockEventSource.listener = listener
  }

  removeEventListener() {
    MockEventSource.listener = null
  }
}

describe("PublicPostReportBell", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    MockEventSource.listener = null
  })

  it("새 이벤트에는 색상을 바꾸고 클릭하면 원래 색상으로 되돌린다", () => {
    vi.stubGlobal("EventSource", MockEventSource)
    render(<PublicPostReportBell />)

    const initial = screen.getByRole("button", {
      name: "새 AI 리포트 알림 없음",
    })
    expect(initial.querySelector("svg")).toHaveClass("text-muted-foreground")

    act(() => MockEventSource.listener?.(new Event("post-report.created")))
    const notified = screen.getByRole("button", {
      name: "새 AI 리포트 알림 확인",
    })
    expect(notified.querySelector("svg")).toHaveClass("text-primary")

    fireEvent.click(notified)
    expect(
      screen
        .getByRole("button", { name: "새 AI 리포트 알림 없음" })
        .querySelector("svg")
    ).toHaveClass("text-muted-foreground")
  })
})
