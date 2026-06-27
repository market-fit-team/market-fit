"use client"

import * as React from "react"
import { ArrowUp, X } from "lucide-react"
import { ChatModelMenu } from "@/features/chat/components/workspace/chat-model-menu"
import { ChatSelectionChips } from "@/features/chat/components/workspace/chat-selection-chips"
import { ChatToolPermissionMenu } from "@/features/chat/components/workspace/chat-tool-permission-menu"
import type {
  ChatModelSelectionControls,
  ToolPolicyControls,
} from "@/features/chat/hooks/langgraph-chat-stream-context"
import type { ChatModelOption } from "@/features/chat/types/chat-model-selection"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

type ChatWorkspaceComposerProps = {
  artifacts: ArtifactResponse[]
  documents: DocumentResponse[]
  draft: string
  disabled?: boolean
  inputDisabled?: boolean
  sendDisabled?: boolean
  hasOnboardingContext?: boolean
  isOnboardingContextRemoving?: boolean
  models: ChatModelOption[]
  modelSelection: ChatModelSelectionControls
  toolPolicy: ToolPolicyControls
  onChangeDraft: (value: string) => void
  onSubmit: (message: string) => Promise<boolean | void> | boolean | void
  onRemoveOnboardingContext?: () => void
  placeholder?: string
}

export function ChatWorkspaceComposer({
  artifacts,
  documents,
  draft,
  disabled = false,
  inputDisabled = false,
  sendDisabled = false,
  hasOnboardingContext = false,
  isOnboardingContextRemoving = false,
  models,
  modelSelection,
  toolPolicy,
  onChangeDraft,
  onSubmit,
  onRemoveOnboardingContext,
  placeholder = "메시지를 입력하세요...",
}: ChatWorkspaceComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }

  React.useLayoutEffect(() => {
    if (!textareaRef.current) {
      return
    }

    resizeTextarea(textareaRef.current)
  }, [draft])

  const handleSubmit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || sendDisabled) {
      return
    }

    const result = await onSubmit(trimmed)
    if (result === false) {
      return
    }

    onChangeDraft("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div
        className={cn(
          "relative rounded-xl border bg-muted/20 transition-all",
          "border-border/30 focus-within:border-border/50 focus-within:bg-muted/30"
        )}
      >
        <div className="px-3 pt-2.5">
          {hasOnboardingContext && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              <Badge
                variant="secondary"
                className="gap-1 rounded-md px-2 py-0.5 text-xs"
              >
                창업 성향
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-4 rounded-full"
                  disabled={disabled || isOnboardingContextRemoving}
                  onClick={() => onRemoveOnboardingContext?.()}
                >
                  <X className="size-2.5" />
                  <span className="sr-only">창업 성향 포함 해제</span>
                </Button>
              </Badge>
            </div>
          )}
          <ChatSelectionChips artifacts={artifacts} documents={documents} />
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            onChangeDraft(event.target.value)
            resizeTextarea(event.target)
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              !sendDisabled
            ) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={inputDisabled}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          id="chat-input-textarea"
        />
        <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-2">
          <ChatModelMenu
            models={models}
            selectedModel={modelSelection.selectedModel}
            selectedReasoningEffort={modelSelection.reasoningEffort}
            onSelectModel={modelSelection.selectModel}
            onSelectReasoningEffort={modelSelection.selectReasoningEffort}
            disabled={disabled}
          />
          <div className="flex items-center gap-1.5">
            <ChatToolPermissionMenu
              selectedPreset={toolPolicy.selectedPreset}
              onSelectPreset={toolPolicy.selectPreset}
              disabled={disabled}
            />
            <Button
              size="icon-xs"
              variant={draft.trim() && !sendDisabled ? "default" : "ghost"}
              onClick={() => void handleSubmit()}
              disabled={!draft.trim() || sendDisabled}
              className={cn(
                "cursor-pointer transition-all",
                draft.trim() && !sendDisabled
                  ? "bg-foreground text-background hover:bg-foreground/80"
                  : "text-muted-foreground"
              )}
              id="chat-send-btn"
            >
              <ArrowUp className="size-3" />
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        AI 에이전트는 실수할 수 있습니다. 중요한 내용은 반드시 직접 확인하세요.
      </p>
    </div>
  )
}
