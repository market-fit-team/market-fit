import { describe, expect, it } from "vitest"
import { buildSubmitContext } from "@/features/llm-chat/lib/langgraph/build-submit-config"
import { buildSubmitInput } from "@/features/llm-chat/lib/langgraph/build-submit-input"
import { createToolPolicyState } from "@/features/llm-chat/testing/fixtures"

describe("buildSubmitContext", () => {
  it("모델 선택과 도구 정책을 런타임 컨텍스트에 매핑한다", () => {
    expect(
      buildSubmitContext(
        {
          model: "gpt-5-mini",
          reasoningEffort: "medium",
        },
        createToolPolicyState()
      )
    ).toEqual({
      model: "gpt-5-mini",
      reasoning_effort: "medium",
      allowed_tools: ["search_web"],
      interrupt_on: {
        search_web: false,
        send_email: {
          allowedDecisions: ["approve", "edit", "reject", "respond"],
        },
      },
    })
  })
})

describe("buildSubmitInput", () => {
  it("단일 HumanMessage로 텍스트를 감싼다", () => {
    const result = buildSubmitInput("안녕하세요")

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.text).toBe("안녕하세요")
    expect(result.messages[0]?.id).toBeTruthy()
  })
})
