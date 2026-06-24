import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HitlInterruptCard } from "@/features/llm-chat/components/hitl/hitl-interrupt-card"
import { createHitlInterrupts } from "@/features/llm-chat/testing/fixtures"

describe("HitlInterruptCard", () => {
  it("평탄화된 액션 요청과 허용된 결정을 렌더링한다", () => {
    render(
      <HitlInterruptCard
        interrupts={createHitlInterrupts()}
        onDecide={vi.fn()}
      />
    )

    expect(screen.getByText("send_email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /respond/i })).toBeInTheDocument()
  })

  it("편집 결정이 선택되었을 때 에디터를 보여준다", async () => {
    render(
      <HitlInterruptCard
        interrupts={createHitlInterrupts()}
        onDecide={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /edit/i }))

    expect(screen.getByDisplayValue("send_email")).toBeInTheDocument()
  })

  it("입력된 메시지와 함께 응답(respond) 결정을 제출한다", async () => {
    const onDecide = vi.fn()

    render(
      <HitlInterruptCard
        interrupts={createHitlInterrupts()}
        onDecide={onDecide}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /respond/i }))
    await userEvent.type(
      screen.getByPlaceholderText("AI에게 전달할 응답"),
      "사용자가 직접 답변합니다."
    )
    await userEvent.click(screen.getByRole("button", { name: "결정 전달" }))

    expect(onDecide).toHaveBeenCalledWith([
      {
        type: "respond",
        message: "사용자가 직접 답변합니다.",
      },
    ])
  })
})
