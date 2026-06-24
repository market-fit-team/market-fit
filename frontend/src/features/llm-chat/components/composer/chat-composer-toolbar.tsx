import { type ReactNode } from "react"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { ToolPolicyTrigger } from "@/features/llm-chat/components/composer/tool-policy-trigger"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"
import { Button } from "@/shared/components/ui/button"

interface ChatComposerToolbarProps {
  disabled: boolean
  tools: LlmToolDefinition[]
  toolPolicy: ToolPolicyState
  onToggleTool: (toolName: string) => void
  onResetToolPolicy: () => void
  modelControl: ReactNode
  onSubmit: () => void
}

export function ChatComposerToolbar({
  disabled,
  tools,
  toolPolicy,
  onToggleTool,
  onResetToolPolicy,
  modelControl,
  onSubmit,
}: ChatComposerToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
      <ToolPolicyTrigger
        tools={tools}
        toolPolicy={toolPolicy}
        onToggleTool={onToggleTool}
        onResetToolPolicy={onResetToolPolicy}
        disabled={disabled}
      />
      <div className="flex shrink-0 items-center gap-2">
        {modelControl}
        <Button onClick={onSubmit} disabled={disabled}>
          {disabled ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
          전송
        </Button>
      </div>
    </div>
  )
}
