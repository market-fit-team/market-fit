import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SdkMessageContent } from "@/features/llm-chat/components/messages/sdk-message-content"
import { createReasoningMessage } from "@/features/llm-chat/testing/fixtures"

describe("SdkMessageContent", () => {
  it("보이는 텍스트 프로젝션만 렌더링한다", () => {
    render(<SdkMessageContent message={createReasoningMessage()} />)

    expect(screen.getByText("최종 답변")).toBeInTheDocument()
    expect(screen.queryByText("단계별 추론")).not.toBeInTheDocument()
  })

  it("메시지에 텍스트가 없을 때 아무것도 렌더링하지 않는다", () => {
    const { container } = render(
      <SdkMessageContent
        message={
          {
            id: "empty",
            text: "",
          } as never
        }
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
