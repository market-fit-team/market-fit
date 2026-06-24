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

  it("워크스페이스 스레드 ID가 있으면 도구 실행 컨텍스트에 포함한다", () => {
    const context = buildSubmitContext(
      {
        model: "gpt-5-mini",
        reasoningEffort: "medium",
      },
      createToolPolicyState(),
      "app-thread-1"
    )

    expect(context.app_thread_id).toBe("app-thread-1")
  })

  it("선택 문서 ID가 있으면 실행 컨텍스트에 포함한다", () => {
    const context = buildSubmitContext(
      {
        model: "gpt-5-mini",
        reasoningEffort: "medium",
      },
      createToolPolicyState(),
      undefined,
      ["doc-1", "doc-2"]
    )

    expect(context.selected_document_ids).toEqual(["doc-1", "doc-2"])
  })

  it("선택 문서 ID가 빈 배열이어도 실행 컨텍스트에 포함한다", () => {
    const context = buildSubmitContext(
      {
        model: "gpt-5-mini",
        reasoningEffort: "medium",
      },
      createToolPolicyState(),
      undefined,
      []
    )

    expect(context.selected_document_ids).toEqual([])
  })

  it("선택 아티팩트 ID가 있으면 실행 컨텍스트에 포함한다", () => {
    const context = buildSubmitContext(
      {
        model: "gpt-5-mini",
        reasoningEffort: "medium",
      },
      createToolPolicyState(),
      undefined,
      undefined,
      ["artifact-1", "artifact-2"]
    )

    expect(context.selected_artifact_ids).toEqual(["artifact-1", "artifact-2"])
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
