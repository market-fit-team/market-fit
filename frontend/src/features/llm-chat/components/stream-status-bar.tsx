import { Loader2 } from "lucide-react"
import type { LlmChatStreamStatus } from "@/features/llm-chat/types/langgraph-chat-state"
import { Badge } from "@/shared/components/ui/badge"

interface StreamStatusBarProps {
  streamStatus: LlmChatStreamStatus
}

export function StreamStatusBar({ streamStatus }: StreamStatusBarProps) {
  const isStreaming = streamStatus === "streaming"
  const label = isStreaming ? "streaming" : "idle"

  return (
    <Badge variant="ghost" className="text-muted-foreground">
      {isStreaming && <Loader2 className="size-3.5 animate-spin" />}
      {label}
    </Badge>
  )
}
