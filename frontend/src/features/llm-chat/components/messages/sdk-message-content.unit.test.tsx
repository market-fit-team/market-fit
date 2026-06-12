import { createElement } from "react"
import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { assembledToBaseMessage } from "@langchain/langgraph-sdk/stream"
import { SdkMessageContent } from "@/features/llm-chat/components/messages/sdk-message-content"

void test("SdkMessageContent renders only the official text projection", () => {
  const message = assembledToBaseMessage({
    id: "ai-1",
    role: "ai",
    blocks: [
      { type: "reasoning", reasoning: "숨겨진 추론" },
      { type: "text", text: "최종 답변" },
    ],
  })

  const html = renderToStaticMarkup(
    createElement(SdkMessageContent, { message })
  )

  assert.match(html, /최종 답변/)
  assert.doesNotMatch(html, /숨겨진 추론/)
})
