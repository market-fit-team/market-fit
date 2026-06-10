import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/utils"

interface ToolPolicyRowProps {
  tool: LlmToolDefinition
  enabled: boolean
  onToggle: () => void
}

export function ToolPolicyRow({ tool, enabled, onToggle }: ToolPolicyRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{tool.name}</span>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            {tool.category}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {tool.description || "설명 없음"}
        </p>
      </div>

      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <span
          className={cn(
            "text-xs font-medium tracking-wide uppercase transition-colors",
            enabled ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {enabled ? "auto" : "review"}
        </span>
        <Switch checked={enabled} onCheckedChange={onToggle} size="sm" />
      </label>
    </div>
  )
}
