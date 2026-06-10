import { buildToolPolicy } from "@/features/llm-chat/lib/tool-policy/build-tool-policy"
import { buildToolPolicySummary } from "@/features/llm-chat/lib/tool-policy/build-tool-policy-summary"
import { useToolPolicyStore } from "@/features/llm-chat/stores/use-tool-policy-store"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"

export function useToolPolicy(tools: LlmToolDefinition[]) {
  const allowedToolNamesOverride = useToolPolicyStore(
    (state) => state.allowedToolNamesOverride
  )
  const setAllowedToolNamesOverride = useToolPolicyStore(
    (state) => state.setAllowedToolNamesOverride
  )
  const resetToolPolicy = useToolPolicyStore((state) => state.resetToolPolicy)

  const defaultAllowedToolNames = new Set(
    tools.filter((tool) => tool.defaultAllowed).map((tool) => tool.name)
  )

  const allowedToolNames = allowedToolNamesOverride ?? defaultAllowedToolNames
  const toolNames = new Set(tools.map((tool) => tool.name))

  const policy = buildToolPolicy(tools, allowedToolNames)

  const toggleTool = (toolName: string) => {
    if (!toolNames.has(toolName)) {
      return
    }

    const next = new Set(allowedToolNamesOverride ?? defaultAllowedToolNames)
    if (next.has(toolName)) {
      next.delete(toolName)
    } else {
      next.add(toolName)
    }
    setAllowedToolNamesOverride(next)
  }

  return {
    ...policy,
    summary: buildToolPolicySummary(tools.length, policy.allowedTools.length),
    toggleTool,
    resetToDefault: resetToolPolicy,
  }
}
