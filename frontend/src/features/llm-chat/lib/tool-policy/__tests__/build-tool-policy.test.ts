import { describe, expect, it } from "vitest"
import { buildToolPolicy } from "@/features/llm-chat/lib/tool-policy/build-tool-policy"
import { buildToolPolicySummary } from "@/features/llm-chat/lib/tool-policy/build-tool-policy-summary"
import {
  createToolPolicyState,
  llmChatTools,
} from "@/features/llm-chat/testing/fixtures"

describe("buildToolPolicy", () => {
  it("허용된 도구는 auto로, 나머지는 review로 표시한다", () => {
    const policy = buildToolPolicy(llmChatTools, new Set(["search_web"]))

    expect(policy.allowedTools).toEqual(["search_web"])
    expect(policy.interruptOn.search_web).toBe(false)
    expect(policy.interruptOn.send_email).toEqual({
      allowedDecisions: ["approve", "edit", "reject", "respond"],
    })
  })

  it("알려지지 않은 허용 도구 이름은 무시한다", () => {
    const policy = buildToolPolicy(llmChatTools, new Set(["missing"]))

    expect(policy.allowedTools).toEqual([])
    expect(policy.allowedToolNames.has("missing")).toBe(false)
  })
})

describe("buildToolPolicySummary", () => {
  it("auto/review 개수를 포맷팅한다", () => {
    expect(buildToolPolicySummary(2, 1)).toBe("1 auto / 1 review")
  })

  it("review 개수가 음수가 되지 않도록 한다", () => {
    expect(buildToolPolicySummary(1, 3)).toBe("3 auto / 0 review")
  })

  it("fixture 헬퍼에서 파생된 요약이 정렬되도록 유지한다", () => {
    expect(createToolPolicyState().summary).toBe("1 auto / 1 review")
  })
})
