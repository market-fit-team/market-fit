import { useSuspenseQuery } from "@tanstack/react-query"
import { z } from "zod"
import type { ChatModelOption } from "@/features/llm-chat/types/chat-model-selection"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"

const AGENT_PROXY_BASE_URL = "/api/proxy/agent"

const reasoningEffortSchema = z.enum(["none", "low", "medium", "high"])

const modelSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  supported_reasoning_efforts: z.array(reasoningEffortSchema),
})

const modelsResponseSchema = z.object({
  object: z.string(),
  data: z.array(modelSchema),
})

const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  default_allowed: z.boolean(),
  allowed_decisions: z.array(z.string()),
})

const toolsResponseSchema = z.object({
  tools: z.array(toolSchema),
})

async function fetchAgentJson(path: string) {
  const response = await fetch(`${AGENT_PROXY_BASE_URL}${path}`, {
    credentials: "include",
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Agent catalog fetch failed: ${response.status} ${detail}`)
  }

  return response.json()
}

export function useListAgentModelsSuspense() {
  return useSuspenseQuery({
    queryKey: ["agent", "models"],
    queryFn: async (): Promise<ChatModelOption[]> => {
      const payload = modelsResponseSchema.parse(
        await fetchAgentJson("/api/v1/llm/models")
      )

      return payload.data.map((model) => ({
        id: model.id,
        object: model.object,
        created: model.created,
        supportedReasoningEfforts: model.supported_reasoning_efforts,
      }))
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useListAgentToolsSuspense() {
  return useSuspenseQuery({
    queryKey: ["agent", "tools"],
    queryFn: async (): Promise<LlmToolDefinition[]> => {
      const payload = toolsResponseSchema.parse(
        await fetchAgentJson("/api/v1/llm/tools")
      )

      return payload.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        defaultAllowed: tool.default_allowed,
        allowedDecisions: tool.allowed_decisions,
      }))
    },
    retry: false,
    staleTime: 60_000,
  })
}
