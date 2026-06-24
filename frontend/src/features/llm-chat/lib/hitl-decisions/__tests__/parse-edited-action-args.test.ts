import { describe, expect, it } from "vitest"
import { parseEditedActionArgs } from "@/features/llm-chat/lib/hitl-decisions/parse-edited-action-args"

describe("parseEditedActionArgs", () => {
  it("유효한 JSON 객체를 파싱한다", () => {
    expect(parseEditedActionArgs('{"to":"hello@example.com"}')).toEqual({
      to: "hello@example.com",
    })
  })

  it("잘못된 JSON일 경우 예외를 던진다", () => {
    expect(() => parseEditedActionArgs("{")).toThrow(
      "edited args must be valid JSON"
    )
  })

  it("JSON이 객체가 아닐 경우 예외를 던진다", () => {
    expect(() => parseEditedActionArgs('"text"')).toThrow(
      "edited args must be a JSON object"
    )
  })
})
