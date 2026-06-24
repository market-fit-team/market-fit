import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SdkMessageItem } from "@/features/llm-chat/components/messages/sdk-message-item"
import {
  createAssembledToolCall,
  createReasoningMessage,
  createToolAiMessage,
  createToolMessage,
  createUserMessage,
} from "@/features/llm-chat/testing/fixtures"

describe("SdkMessageItem", () => {
  it("답변 텍스트와 별도로 추론 과정을 렌더링한다", () => {
    const message = createReasoningMessage()

    render(
      <SdkMessageItem message={message} messages={[message]} toolCalls={[]} />
    )

    expect(screen.getByText("thinking")).toBeInTheDocument()
    expect(screen.getByText("단계별 추론")).toBeInTheDocument()
    expect(screen.getByText("최종 답변")).toBeInTheDocument()
  })

  it("올바른 라벨과 함께 사용자 메시지를 렌더링한다", () => {
    const message = createUserMessage()

    render(
      <SdkMessageItem message={message} messages={[message]} toolCalls={[]} />
    )

    expect(screen.getByText("사용자")).toBeInTheDocument()
    expect(screen.getByText("사용자 질문")).toBeInTheDocument()
  })

  it("도구 메시지를 직접 렌더링하지 않는다", () => {
    const { container } = render(
      <SdkMessageItem
        message={createToolMessage()}
        messages={[createToolMessage()]}
        toolCalls={[]}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("조합된 결과와 AI 도구 호출을 연결한다", () => {
    const message = createToolAiMessage()

    render(
      <SdkMessageItem
        message={message}
        messages={[message, createToolMessage()]}
        toolCalls={[createAssembledToolCall("finished")]}
      />
    )

    expect(screen.getByText("send_email")).toBeInTheDocument()
    expect(screen.getByText("완료")).toBeInTheDocument()
    expect(screen.getByText(/발송 완료/)).toBeInTheDocument()
  })
})
