import { describe, expect, it } from "vitest"
import { buildResumeDecisions } from "@/features/llm-chat/lib/hitl-decisions/build-resume-decisions"
import { buildResumeDecisionsFromForm } from "@/features/llm-chat/lib/hitl-decisions/build-resume-decisions-from-form"
import { createHitlInterrupts } from "@/features/llm-chat/testing/fixtures"

describe("buildResumeDecisions", () => {
  const actionRequests = createHitlInterrupts()[0].value?.action_requests ?? []

  it("초안이 제공되지 않으면 승인을 기본값으로 한다", () => {
    expect(buildResumeDecisions(actionRequests, {})).toEqual([
      { type: "approve" },
    ])
  })

  it("편집(edit) 결정을 생성한다", () => {
    expect(
      buildResumeDecisions(actionRequests, {
        "0": {
          type: "edit",
          editedName: "send_sms",
          editedArgsText: '{"to":"+821012341234"}',
        },
      })
    ).toEqual([
      {
        type: "edit",
        editedAction: {
          name: "send_sms",
          args: { to: "+821012341234" },
        },
      },
    ])
  })

  it("거절 메시지의 공백을 제거하고 비어있는 경우 생략한다", () => {
    expect(
      buildResumeDecisions(actionRequests, {
        "0": {
          type: "reject",
          message: "  보안 검토 필요  ",
        },
      })
    ).toEqual([{ type: "reject", message: "보안 검토 필요" }])

    expect(
      buildResumeDecisions(actionRequests, {
        "0": {
          type: "reject",
          message: "   ",
        },
      })
    ).toEqual([{ type: "reject" }])
  })

  it("비어있을 경우 기본 응답 메시지를 사용한다", () => {
    expect(
      buildResumeDecisions(actionRequests, {
        "0": {
          type: "respond",
          message: " ",
        },
      })
    ).toEqual([
      {
        type: "respond",
        message: "사용자가 직접 응답을 제공했습니다.",
      },
    ])
  })
})

describe("buildResumeDecisionsFromForm", () => {
  it("폼 값을 사용하여 buildResumeDecisions에 위임한다", () => {
    const actionRequests =
      createHitlInterrupts()[0].value?.action_requests ?? []

    expect(
      buildResumeDecisionsFromForm(actionRequests, {
        drafts: {
          "0": {
            type: "approve",
          },
        },
      })
    ).toEqual([{ type: "approve" }])
  })
})
