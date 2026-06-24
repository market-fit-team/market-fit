import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToolPolicyList } from "@/features/llm-chat/components/tool-policy/tool-policy-list"
import { llmChatTools } from "@/features/llm-chat/testing/fixtures"

describe("ToolPolicyList", () => {
  it("도구당 하나의 행을 렌더링한다", () => {
    render(
      <ToolPolicyList
        tools={llmChatTools}
        allowedToolNames={new Set(["search_web"])}
        onToggleTool={vi.fn()}
      />
    )

    expect(screen.getByText("search_web")).toBeInTheDocument()
    expect(screen.getByText("send_email")).toBeInTheDocument()
  })

  it("클릭된 도구 이름을 onToggleTool에 전달한다", async () => {
    const onToggleTool = vi.fn()

    render(
      <ToolPolicyList
        tools={llmChatTools}
        allowedToolNames={new Set()}
        onToggleTool={onToggleTool}
      />
    )

    await userEvent.click(screen.getAllByRole("switch")[1]!)
    expect(onToggleTool).toHaveBeenCalledWith("send_email")
  })
})
