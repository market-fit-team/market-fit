import { afterEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { usePublicPostReportNotification } from "@/features/post/hooks/use-public-post-report-notification"

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
  },
}))

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

  emit(name: string, data: unknown) {
    this.listeners.get(name)?.(
      new MessageEvent(name, { data: JSON.stringify(data) })
    )
  }
}

describe("usePublicPostReportNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    toastSuccess.mockReset()
    MockEventSource.instance = null
  })

  it("FRANCHISE SSE를 받으면 새 알림 상태와 toast를 표시하고 초기화한다", () => {
    vi.stubGlobal("EventSource", MockEventSource)
    const { result } = renderHook(() => usePublicPostReportNotification())

    act(() =>
      MockEventSource.instance?.emit("post-report.created", {
        notificationCategory: "FRANCHISE",
        message: "새로운 프랜차이즈 AI 칼럼이 생성되었습니다.",
      })
    )
    expect(result.current.hasNewReport).toBe(true)
    expect(toastSuccess).toHaveBeenCalledWith(
      "새로운 프랜차이즈 AI 칼럼이 생성되었습니다.",
      expect.objectContaining({
        action: expect.objectContaining({ label: "바로 보기" }),
      })
    )

    act(() => result.current.clearNewReport())
    expect(result.current.hasNewReport).toBe(false)
  })

  it("FRANCHISE가 아닌 SSE는 알림을 표시하지 않는다", () => {
    vi.stubGlobal("EventSource", MockEventSource)
    const { result } = renderHook(() => usePublicPostReportNotification())

    act(() =>
      MockEventSource.instance?.emit("post-report.created", {
        notificationCategory: null,
      })
    )

    expect(result.current.hasNewReport).toBe(false)
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
