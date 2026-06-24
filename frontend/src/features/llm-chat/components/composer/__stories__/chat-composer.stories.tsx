import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ChatComposer } from "@/features/llm-chat/components/composer/chat-composer"
import { ChatModelMenu } from "@/features/llm-chat/components/composer/chat-model-menu"
import {
  createToolPolicyState,
  llmChatModels,
  llmChatTools,
} from "@/features/llm-chat/testing/fixtures"
import type { ChatReasoningEffort } from "@/features/llm-chat/types/chat-model-selection"

function ChatComposerHarness({ disabled = false }: { disabled?: boolean }) {
  const [submittedMessage, setSubmittedMessage] = useState("")
  const [selectedModelId, setSelectedModelId] = useState(llmChatModels[0]!.id)
  const [selectedReasoningEffort, setSelectedReasoningEffort] =
    useState<ChatReasoningEffort>("medium")
  const [allowedToolNames, setAllowedToolNames] = useState(
    new Set(["search_web"])
  )

  const selectedModel =
    llmChatModels.find((model) => model.id === selectedModelId) ??
    llmChatModels[0]!

  return (
    <div className="w-full max-w-3xl space-y-4">
      <ChatComposer
        disabled={disabled}
        onSubmit={setSubmittedMessage}
        tools={llmChatTools}
        toolPolicy={createToolPolicyState(allowedToolNames)}
        onToggleTool={(toolName) => {
          setAllowedToolNames((current) => {
            const next = new Set(current)
            if (next.has(toolName)) {
              next.delete(toolName)
            } else {
              next.add(toolName)
            }
            return next
          })
        }}
        onResetToolPolicy={() => setAllowedToolNames(new Set(["search_web"]))}
        streamStatus={disabled ? "streaming" : "idle"}
        modelControl={
          <ChatModelMenu
            models={llmChatModels}
            selectedModel={selectedModel}
            selectedReasoningEffort={selectedReasoningEffort}
            onSelectModel={setSelectedModelId}
            onSelectReasoningEffort={setSelectedReasoningEffort}
            disabled={disabled}
          />
        }
      />
      <div className="text-sm text-muted-foreground">
        submitted: <span>{submittedMessage || "none"}</span>
      </div>
    </div>
  )
}

const meta = {
  title: "LLM Chat/Composer/ChatComposer",
  component: ChatComposerHarness,
  tags: ["autodocs"],
  render: (args) => <ChatComposerHarness {...args} />,
} satisfies Meta<typeof ChatComposerHarness>

export default meta

type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(
      canvas.getByPlaceholderText(/메시지 입력/),
      "스토리북에서 전송 테스트"
    )
    await userEvent.click(canvas.getByRole("button", { name: /전송/i }))
    await expect(
      canvas.getByText("스토리북에서 전송 테스트")
    ).toBeInTheDocument()
  },
}

export const Busy: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: /전송/i })).toBeDisabled()
    await expect(canvas.getByText("streaming")).toBeInTheDocument()
  },
}
