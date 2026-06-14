import { ChatComposer } from "@/features/llm-chat/components/composer/chat-composer"
import { ChatModelMenu } from "@/features/llm-chat/components/composer/chat-model-menu"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"

export function ChatComposerPanel() {
  const {
    models,
    tools,
    modelSelection,
    toolPolicy,
    isBusy,
    streamStatus,
    sendMessage,
  } = useLangGraphChatStream()

  return (
    <div className="border-t border-border bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/85">
      <ChatComposer
        disabled={isBusy}
        onSubmit={sendMessage}
        tools={tools}
        toolPolicy={toolPolicy}
        onToggleTool={toolPolicy.toggleTool}
        streamStatus={streamStatus}
        modelControl={
          <ChatModelMenu
            models={models}
            selectedModel={modelSelection.selectedModel}
            selectedReasoningEffort={modelSelection.reasoningEffort}
            onSelectModel={modelSelection.selectModel}
            onSelectReasoningEffort={modelSelection.selectReasoningEffort}
            disabled={isBusy}
          />
        }
      />
    </div>
  )
}
