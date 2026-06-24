import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ChatComposerTextarea } from "@/features/llm-chat/components/composer/chat-composer-textarea"

describe("ChatComposerTextarea", () => {
  it("Shift 없이 Enter를 누르면 제출된다", () => {
    const onSubmit = vi.fn()

    render(
      <ChatComposerTextarea
        disabled={false}
        textareaRef={createRef<HTMLTextAreaElement>()}
        onSubmit={onSubmit}
      />
    )

    fireEvent.keyDown(screen.getByPlaceholderText(/메시지 입력/), {
      key: "Enter",
    })

    expect(onSubmit).toHaveBeenCalled()
  })

  it("Shift+Enter를 누르면 제출되지 않는다", () => {
    const onSubmit = vi.fn()

    render(
      <ChatComposerTextarea
        disabled={false}
        textareaRef={createRef<HTMLTextAreaElement>()}
        onSubmit={onSubmit}
      />
    )

    fireEvent.keyDown(screen.getByPlaceholderText(/메시지 입력/), {
      key: "Enter",
      shiftKey: true,
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
