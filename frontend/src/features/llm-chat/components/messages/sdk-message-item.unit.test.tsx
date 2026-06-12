import { createElement } from "react"
import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { AIMessage, ToolMessage } from "@langchain/core/messages"
import { assembledToBaseMessage } from "@langchain/langgraph-sdk/stream"
import { SdkMessageItem } from "@/features/llm-chat/components/messages/sdk-message-item"

void test("SdkMessageItem renders reasoning separately from answer text", () => {
  const message = assembledToBaseMessage({
    id: "ai-1",
    role: "ai",
    blocks: [
      { type: "reasoning", reasoning: "단계별 추론" },
      { type: "text", text: "정답은 2입니다." },
    ],
  })

  const html = renderToStaticMarkup(
    createElement(SdkMessageItem, {
      message,
      messages: [message],
      toolCalls: [],
    })
  )

  assert.match(html, /thinking/)
  assert.match(html, /단계별 추론/)
  assert.match(html, /정답은 2입니다./)
})

void test("SdkMessageItem pairs AI tool calls with ToolMessage results", () => {
  const message = new AIMessage({
    id: "ai-tool",
    content: "",
    tool_calls: [
      {
        id: "call-1",
        name: "add",
        args: { a: 2, b: 3 },
        type: "tool_call",
      },
    ],
  })
  const result = new ToolMessage({
    content: "5",
    tool_call_id: "call-1",
  })

  const html = renderToStaticMarkup(
    createElement(SdkMessageItem, {
      message,
      messages: [message, result],
      toolCalls: [],
    })
  )

  assert.match(html, /add/)
  assert.match(html, /완료/)
  assert.match(html, /&quot;5&quot;/)
})
