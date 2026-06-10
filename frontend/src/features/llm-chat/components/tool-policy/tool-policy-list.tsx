import { ToolPolicyRow } from "@/features/llm-chat/components/tool-policy/tool-policy-row"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"

interface ToolPolicyListProps {
  tools: LlmToolDefinition[]
  allowedToolNames: Set<string>
  onToggleTool: (toolName: string) => void
}

export function ToolPolicyList({
  tools,
  allowedToolNames,
  onToggleTool,
}: ToolPolicyListProps) {
  return (
    <div className="divide-y divide-border">
      {tools.map((tool) => (
        <ToolPolicyRow
          key={tool.name}
          tool={tool}
          enabled={allowedToolNames.has(tool.name)}
          onToggle={() => onToggleTool(tool.name)}
        />
      ))}
    </div>
  )
}
