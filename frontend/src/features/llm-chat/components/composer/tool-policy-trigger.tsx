import { Settings2, SlidersHorizontal } from "lucide-react"
import { ToolPolicyResetTrigger } from "@/features/llm-chat/components/composer/tool-policy-reset-trigger"
import { ToolPolicyList } from "@/features/llm-chat/components/tool-policy/tool-policy-list"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface ToolPolicyTriggerProps {
  tools: LlmToolDefinition[]
  toolPolicy: ToolPolicyState
  onToggleTool: (toolName: string) => void
  onResetToolPolicy: () => void
  disabled?: boolean
}

export function ToolPolicyTrigger({
  tools,
  toolPolicy,
  onToggleTool,
  onResetToolPolicy,
  disabled,
}: ToolPolicyTriggerProps) {
  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            disabled={disabled}
          >
            <Settings2 className="size-3.5 text-muted-foreground" />
            <span className="text-sm">도구</span>
            <span className="text-sm tracking-wide text-muted-foreground">
              ({toolPolicy.allowedToolNames.size}/{tools.length})
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="flex items-center">
            도구 정책
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <DialogTrigger className="relative flex w-full cursor-default items-center rounded-sm px-2 py-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground">
              <SlidersHorizontal className="mr-0.5 size-3 text-muted-foreground" />
              세부 설정
            </DialogTrigger>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent
        className="max-w-xl gap-0 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-col space-y-1 border-b border-border px-5 py-4">
          <DialogTitle className="text-left font-medium">도구 정책</DialogTitle>
          <div className="flex items-center justify-between">
            <DialogDescription className="text-left text-sm text-muted-foreground">
              auto는 즉시 실행되고 review는 HITL 승인을 요구합니다.
            </DialogDescription>

            <ToolPolicyResetTrigger
              disabled={disabled}
              onReset={onResetToolPolicy}
            />
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto px-5 pb-2">
          <ToolPolicyList
            tools={tools}
            allowedToolNames={toolPolicy.allowedToolNames}
            onToggleTool={disabled ? () => undefined : onToggleTool}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
