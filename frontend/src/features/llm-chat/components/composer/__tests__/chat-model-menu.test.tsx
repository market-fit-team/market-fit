import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatModelMenu } from "@/features/llm-chat/components/composer/chat-model-menu"
import { llmChatModels } from "@/features/llm-chat/testing/fixtures"

describe("ChatModelMenu", () => {
  it("현재 모델과 추론 단계를 보여준다", () => {
    render(
      <ChatModelMenu
        models={llmChatModels}
        selectedModel={llmChatModels[0]!}
        selectedReasoningEffort="medium"
        onSelectModel={vi.fn()}
        onSelectReasoningEffort={vi.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: /gpt-5-mini/i })
    ).toBeInTheDocument()
    expect(screen.getByText("medium")).toBeInTheDocument()
  })

  it("모델이 선택되었을 때 onSelectModel을 호출한다", async () => {
    const onSelectModel = vi.fn()

    render(
      <ChatModelMenu
        models={llmChatModels}
        selectedModel={llmChatModels[0]!}
        selectedReasoningEffort="medium"
        onSelectModel={onSelectModel}
        onSelectReasoningEffort={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /gpt-5-mini/i }))
    await userEvent.click(screen.getAllByText(/^gpt-5-mini$/i)[1]!)
    await userEvent.click(screen.getByRole("menuitem", { name: /o4/i }))

    expect(onSelectModel).toHaveBeenCalledWith("o4")
  })

  it("선택된 모델에 대해 지원되는 추론 단계만 렌더링한다", async () => {
    render(
      <ChatModelMenu
        models={llmChatModels}
        selectedModel={llmChatModels[0]!}
        selectedReasoningEffort="medium"
        onSelectModel={vi.fn()}
        onSelectReasoningEffort={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: /gpt-5-mini/i }))

    expect(
      screen.queryByRole("button", { name: "high" })
    ).not.toBeInTheDocument()
  })
})
