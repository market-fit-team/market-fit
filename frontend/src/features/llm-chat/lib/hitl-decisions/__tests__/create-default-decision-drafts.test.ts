import { describe, expect, it } from "vitest"
import { createDefaultDecisionDrafts } from "@/features/llm-chat/lib/hitl-decisions/create-default-decision-drafts"
import { createHitlInterrupts } from "@/features/llm-chat/testing/fixtures"

describe("createDefaultDecisionDrafts", () => {
  it("액션 인덱스를 키로 갖는 승인 초안을 생성한다", () => {
    const [interrupt] = createHitlInterrupts()
    const actionRequests = interrupt.value?.action_requests ?? []

    expect(createDefaultDecisionDrafts(actionRequests)).toEqual({
      "0": {
        type: "approve",
        editedName: "send_email",
        editedArgsText: JSON.stringify(
          {
            to: "hello@example.com",
            subject: "검토 요청",
          },
          null,
          2
        ),
      },
    })
  })
})
