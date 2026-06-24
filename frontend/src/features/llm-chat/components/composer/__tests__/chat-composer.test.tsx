import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatComposer } from "@/features/llm-chat/components/composer/chat-composer"
import {
  createToolPolicyState,
  llmChatTools,
} from "@/features/llm-chat/testing/fixtures"

describe("ChatComposer", () => {
  it("빈 메시지는 제출하지 않는다", async () => {
    const onSubmit = vi.fn()

    render(
      <ChatComposer
        disabled={false}
        onSubmit={onSubmit}
        tools={llmChatTools}
        toolPolicy={createToolPolicyState()}
        onToggleTool={vi.fn()}
        streamStatus="idle"
        modelControl={<div>model control</div>}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /전송/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("공백이 제거된 텍스트를 제출하고 텍스트 영역을 지운다", async () => {
    const onSubmit = vi.fn()

    render(
      <ChatComposer
        disabled={false}
        onSubmit={onSubmit}
        tools={llmChatTools}
        toolPolicy={createToolPolicyState()}
        onToggleTool={vi.fn()}
        streamStatus="idle"
        modelControl={<div>model control</div>}
      />
    )

    const textarea = screen.getByPlaceholderText(
      /메시지 입력/
    ) as HTMLTextAreaElement
    await userEvent.type(textarea, "  안녕하세요  ")
    await userEvent.click(screen.getByRole("button", { name: /전송/i }))

    expect(onSubmit).toHaveBeenCalledWith("안녕하세요")
    expect(textarea.value).toBe("")
  })

  it("비활성화 상태일 때는 제출하지 않는다", async () => {
    const onSubmit = vi.fn()

    render(
      <ChatComposer
        disabled
        onSubmit={onSubmit}
        tools={llmChatTools}
        toolPolicy={createToolPolicyState()}
        onToggleTool={vi.fn()}
        streamStatus="streaming"
        modelControl={<div>model control</div>}
      />
    )

    expect(screen.getByRole("button", { name: /전송/i })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
