import { z } from "zod"
import type { Interrupt } from "@langchain/langgraph-sdk"

export const hitlDecisionTypeSchema = z.enum([
  "approve",
  "edit",
  "reject",
  "respond",
])
export type HitlDecisionType = z.infer<typeof hitlDecisionTypeSchema>

export const hitlActionArgsSchema = z.record(z.string(), z.unknown())

export interface HitlActionRequest {
  name: string
  args: Record<string, unknown>
  description?: string
}

export interface HitlReviewConfig {
  action_name: string
  allowed_decisions?: HitlDecisionType[]
  args_schema?: Record<string, unknown>
}

export interface HitlRequest {
  action_requests: HitlActionRequest[]
  review_configs: HitlReviewConfig[]
}

export interface HitlAction {
  name: string
  args: Record<string, unknown>
}

export type HitlDecision =
  | { type: "approve" }
  | { type: "edit"; editedAction: HitlAction }
  | { type: "reject"; message?: string }
  | { type: "respond"; message: string }

export interface HitlResume {
  decisions: HitlDecision[]
}

export type HitlInterrupt = Interrupt<HitlRequest>
