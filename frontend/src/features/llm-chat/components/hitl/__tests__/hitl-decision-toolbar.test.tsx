import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HitlDecisionToolbar } from "@/features/llm-chat/components/hitl/hitl-decision-toolbar"

describe("HitlDecisionToolbar", () => {
  it("허용된 결정 버튼만 보여준다", () => {
    render(
      <HitlDecisionToolbar
        activeDecision="approve"
        allowedDecisions={["approve", "reject"]}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /respond/i })
    ).not.toBeInTheDocument()
  })

  it("버튼이 클릭되었을 때 onSelect를 호출한다", async () => {
    const onSelect = vi.fn()

    render(
      <HitlDecisionToolbar
        activeDecision="approve"
        allowedDecisions={["approve", "edit"]}
        onSelect={onSelect}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    expect(onSelect).toHaveBeenCalledWith("edit")
  })
})
