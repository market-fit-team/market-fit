import { expect, userEvent, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ToolPolicyTrigger } from "@/features/llm-chat/components/composer/tool-policy-trigger"
import {
  createToolPolicyState,
  llmChatTools,
} from "@/features/llm-chat/testing/fixtures"

const meta = {
  title: "LLM Chat/Composer/ToolPolicyTrigger",
  component: ToolPolicyTrigger,
  tags: ["autodocs"],
  args: {
    tools: llmChatTools,
    toolPolicy: createToolPolicyState(),
    onToggleTool: () => {},
    onResetToolPolicy: () => {},
  },
} satisfies Meta<typeof ToolPolicyTrigger>

export default meta

type Story = StoryObj<typeof meta>

export const OpensDialog: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /도구/i }))
    const body = within(document.body)
    await userEvent.click(body.getByText("세부 설정"))
    await expect(body.getByText("도구 정책")).toBeInTheDocument()
    await userEvent.click(
      body.getByRole("button", { name: /기본값으로 복원/i })
    )
    await expect(
      body.getByText("기본값으로 복원하시겠습니까?")
    ).toBeInTheDocument()
  },
}
