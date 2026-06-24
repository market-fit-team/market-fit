import { describe, expect, it } from "vitest"
import {
  clampReasoningEffort,
  getDefaultReasoningEffort,
} from "@/features/llm-chat/lib/model-selection/clamp-reasoning-effort"

describe("getDefaultReasoningEffort", () => {
  it("지원될 경우 medium을 선호한다", () => {
    expect(getDefaultReasoningEffort(["low", "medium", "high"])).toBe("medium")
  })

  it("첫 번째로 지원되는 effort로 대체한다", () => {
    expect(getDefaultReasoningEffort(["high", "low"])).toBe("high")
  })

  it("빈 목록에 대해 none을 반환한다", () => {
    expect(getDefaultReasoningEffort([])).toBe("none")
  })
})

describe("clampReasoningEffort", () => {
  it("지원되는 effort를 유지한다", () => {
    expect(clampReasoningEffort("low", ["none", "low"])).toBe("low")
  })

  it("허용된 가장 높은 하위 effort로 낮춘다", () => {
    expect(clampReasoningEffort("high", ["low", "medium"])).toBe("medium")
  })

  it("하위 effort가 존재하지 않을 경우 기본값으로 대체한다", () => {
    expect(clampReasoningEffort("none", ["high"])).toBe("high")
  })
})
