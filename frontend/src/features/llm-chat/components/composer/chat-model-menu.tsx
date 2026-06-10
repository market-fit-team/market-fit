import { Check, ChevronLeft, Gauge } from "lucide-react"
import type {
  ChatModelOption,
  ChatReasoningEffort,
} from "@/features/llm-chat/types/chat-model-selection"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group"
import { cn } from "@/shared/utils"

interface ChatModelMenuProps {
  models: ChatModelOption[]
  selectedModel: ChatModelOption
  selectedReasoningEffort: ChatReasoningEffort
  onSelectModel: (modelId: string) => void
  onSelectReasoningEffort: (reasoningEffort: ChatReasoningEffort) => void
  disabled?: boolean
}

export function ChatModelMenu({
  models,
  selectedModel,
  selectedReasoningEffort,
  onSelectModel,
  onSelectReasoningEffort,
  disabled,
}: ChatModelMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="ml-auto justify-end gap-2"
        >
          <span className="truncate text-sm uppercase">{selectedModel.id}</span>
          <div className="h-3 w-px shrink-0 bg-border" />
          <span className="text-sm text-muted-foreground capitalize">
            {selectedReasoningEffort}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Gauge className="size-3.5" />
          reasoning effort
        </DropdownMenuLabel>
        <ToggleGroup
          type="single"
          value={selectedReasoningEffort}
          onValueChange={(value) => {
            if (value) onSelectReasoningEffort(value as ChatReasoningEffort)
          }}
          variant="default"
          size="sm"
          className="flex w-full justify-around rounded-lg bg-muted/40"
        >
          {selectedModel.supportedReasoningEfforts.map((effort) => {
            const isSelected = selectedReasoningEffort === effort
            return (
              <ToggleGroupItem
                key={effort}
                value={effort}
                variant="default"
                size="sm"
                className={cn(
                  "text-xs uppercase",
                  !isSelected && "text-muted-foreground"
                )}
              >
                {effort}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="py-2 [&>svg:last-child]:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm uppercase">{selectedModel.id}</p>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <DropdownMenuLabel>model</DropdownMenuLabel>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onSelect={() => {
                  onSelectModel(model.id)
                }}
                className="py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm uppercase">{model.id}</p>
                </div>
                <Check
                  className={cn(
                    "size-4 text-primary",
                    model.id === selectedModel.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
