import { expect, fn, userEvent, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ChatHero } from "@/features/llm-chat/components/chat-app/components/chat-hero"

const meta = {
  title: "LLM Chat/Page/ChatHero",
  component: ChatHero,
  tags: ["autodocs"],
  args: {
    threadId: "thread-1234567890",
    isBusy: false,
    onReset: fn(),
  },
} satisfies Meta<typeof ChatHero>

export default meta

type Story = StoryObj<typeof meta>

export const Ready: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "채팅 메뉴" }))
    const body = within(document.body)
    await userEvent.click(body.getByText("새 채팅 시작"))
    await expect(args.onReset).toHaveBeenCalled()
  },
}

export const Busy: Story = {
  args: {
    isBusy: true,
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "채팅 메뉴" }))
    const body = within(document.body)
    await expect(body.getByText("새 채팅 시작")).toHaveAttribute(
      "data-disabled"
    )
  },
}
