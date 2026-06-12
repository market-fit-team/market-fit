import type { ToolCall, ToolMessage } from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import {
  ToolCallCard,
  ToolCallJsonBlock,
} from "@/features/llm-chat/components/tool-call-card"

type ToolCallState = "pending" | "completed" | "error"

const STATUS_LABEL: Record<ToolCallState, string> = {
  pending: "실행 중",
  completed: "완료",
  error: "오류",
}

interface SdkToolCallCardProps {
  call: ToolCall
  assembled?: AssembledToolCall
  result?: ToolMessage
}

export function SdkToolCallCard({
  call,
  assembled,
  result,
}: SdkToolCallCardProps) {
  const state: ToolCallState =
    result?.status === "error" || assembled?.status === "error"
      ? "error"
      : result || assembled?.status === "finished"
        ? "completed"
        : "pending"

  return (
    <ToolCallCard
      title={call.name}
      statusLabel={STATUS_LABEL[state]}
      tone={state === "error" ? "destructive" : "default"}
    >
      <div className="space-y-3">
        <ToolCallJsonBlock value={call.args} />
        {state !== "pending" && (
          <ToolCallJsonBlock
            value={
              assembled?.error ?? (result ? result.text : assembled?.output)
            }
          />
        )}
      </div>
    </ToolCallCard>
  )
}
