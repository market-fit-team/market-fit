import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { usePublicPostReportNotification } from "@/features/post/hooks/use-public-post-report-notification"

class MockEventSource {
  static instance: MockEventSource | null = null
  listeners = new Map<string, EventListener>()
  close = vi.fn()

  constructor(public url: string) {
    MockEventSource.instance = this
  }

  addEventListener(name: string, listener: EventListener) {
    this.listeners.set(name, listener)
  }

  removeEventListener(name: string) {
    this.listeners.delete(name)
  }

  emit(name: string) {
    this.listeners.get(name)?.(new Event(name))
  }
}

describe("usePublicPostReportNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    MockEventSource.instance = null
  })

  it("공개 리포트 SSE를 받으면 새 알림 상태를 표시하고 초기화한다", () => {
    vi.stubGlobal("EventSource", MockEventSource)
    const { result } = renderHook(() => usePublicPostReportNotification())

    act(() => MockEventSource.instance?.emit("post-report.created"))
    expect(result.current.hasNewReport).toBe(true)

    act(() => result.current.clearNewReport())
    expect(result.current.hasNewReport).toBe(false)
  })
})
