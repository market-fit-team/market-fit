import { type ReactNode, useRef } from "react"
import { ChatComposerTextarea } from "@/features/llm-chat/components/composer/chat-composer-textarea"
import { ChatComposerToolbar } from "@/features/llm-chat/components/composer/chat-composer-toolbar"
import { StreamStatusBar } from "@/features/llm-chat/components/stream-status-bar"
import type { LlmChatStreamStatus } from "@/features/llm-chat/types/langgraph-chat-state"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"

interface ChatComposerProps {
  disabled: boolean
  onSubmit: (message: string) => void
  tools: LlmToolDefinition[]
  toolPolicy: ToolPolicyState
  onToggleTool: (toolName: string) => void
  onResetToolPolicy: () => void
  streamStatus: LlmChatStreamStatus
  modelControl: ReactNode
}

export function ChatComposer({
  disabled,
  onSubmit,
  tools,
  toolPolicy,
  onToggleTool,
  onResetToolPolicy,
  streamStatus,
  modelControl,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const submit = () => {
    const textarea = textareaRef.current
    const trimmed = textarea?.value.trim() ?? ""
    if (!trimmed || disabled) {
      return
    }

    if (textarea) {
      textarea.value = ""
    }
    onSubmit(trimmed)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <section className="rounded-lg border border-border bg-card shadow-sm">
        <ChatComposerTextarea
          disabled={disabled}
          textareaRef={textareaRef}
          onSubmit={submit}
        />
        <ChatComposerToolbar
          disabled={disabled}
          tools={tools}
          toolPolicy={toolPolicy}
          onToggleTool={onToggleTool}
          onResetToolPolicy={onResetToolPolicy}
          modelControl={modelControl}
          onSubmit={submit}
        />
      </section>
      <div className="flex justify-end">
        <StreamStatusBar streamStatus={streamStatus} />
      </div>
    </div>
  )
}
