import {
  ToolCallCard,
  ToolCallJsonBlock,
} from "@/features/llm-chat/components/tool-call-card"
import type { SdkToolCallViewModel } from "@/features/llm-chat/lib/langgraph/build-tool-call-view-model"

const STATUS_LABEL: Record<SdkToolCallViewModel["state"], string> = {
  pending: "실행 중",
  completed: "완료",
  error: "오류",
}

interface SdkToolCallCardProps {
  toolCall: SdkToolCallViewModel
}

export function SdkToolCallCard({ toolCall }: SdkToolCallCardProps) {
  return (
    <ToolCallCard
      title={toolCall.name}
      statusLabel={STATUS_LABEL[toolCall.state]}
      tone={toolCall.state === "error" ? "destructive" : "default"}
    >
      <div className="space-y-3">
        <ToolCallJsonBlock value={toolCall.input} />
        {toolCall.state !== "pending" && (
          <ToolCallJsonBlock value={toolCall.error ?? toolCall.output} />
        )}
      </div>
    </ToolCallCard>
  )
}
