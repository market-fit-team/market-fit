"use client"

import { ChatComposer } from "@/features/llm-chat/components/composer/chat-composer"
import { ChatModelMenu } from "@/features/llm-chat/components/composer/chat-model-menu"
import { ChatSelectionChips } from "@/features/llm-chat/components/workspace/chat-selection-chips"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import { useChatWorkspaceUi } from "@/features/llm-chat/providers/chat-workspace-ui-provider"

type ChatWorkspaceComposerPanelProps = {
  currentThreadId: string | null
}

export function ChatWorkspaceComposerPanel({
  currentThreadId,
}: ChatWorkspaceComposerPanelProps) {
  const {
    models,
    tools,
    modelSelection,
    toolPolicy,
    hasPendingInterrupt,
    isBusy,
    isHydrating,
    streamStatus,
    sendMessage,
  } = useLangGraphChatStream()
  const { selectedDocumentIds, selectedArtifactIds } = useChatWorkspaceUi()
  const disabled = isBusy || isHydrating || hasPendingInterrupt

  return (
    <div className="border-t border-border bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/85">
      <div className="mb-2">
        <ChatSelectionChips currentThreadId={currentThreadId} />
      </div>
      <ChatComposer
        disabled={disabled}
        onSubmit={(message) =>
          void sendMessage(message, {
            selectedDocumentIds,
            selectedArtifactIds,
          })
        }
        tools={tools}
        toolPolicy={toolPolicy}
        onToggleTool={toolPolicy.toggleTool}
        onResetToolPolicy={toolPolicy.resetToDefault}
        streamStatus={streamStatus}
        modelControl={
          <ChatModelMenu
            models={models}
            selectedModel={modelSelection.selectedModel}
            selectedReasoningEffort={modelSelection.reasoningEffort}
            onSelectModel={modelSelection.selectModel}
            onSelectReasoningEffort={modelSelection.selectReasoningEffort}
            disabled={disabled}
          />
        }
      />
    </div>
  )
}
