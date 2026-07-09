"use client"

import { useState } from "react"
import { MapAgentChatHome } from "@/features/agent/components/map-chat-widget/map-agent-chat-home"
import { MapAgentThreadPanel } from "@/features/agent/components/map-chat-widget/map-agent-thread-panel"
import { AuthRequiredGate } from "@/features/auth/components/auth-required-gate"
import { ChatWorkspaceProvider } from "@/features/chat/providers/chat-workspace-provider"
import type { AgentThreadResponse } from "@/shared/api/generated/agent/schemas"

export function MapAgentChatPanel() {
  const [activeThread, setActiveThread] = useState<AgentThreadResponse | null>(
    null
  )
  const [starterMessage, setStarterMessage] = useState<string | null>(null)

  return (
    <AuthRequiredGate>
      <ChatWorkspaceProvider>
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {activeThread ? (
            <MapAgentThreadPanel
              thread={activeThread}
              starterMessage={starterMessage}
              onStarterSubmitted={() => setStarterMessage(null)}
            />
          ) : (
            <MapAgentChatHome
              onStartThread={(thread, message) => {
                setActiveThread(thread)
                setStarterMessage(message)
              }}
            />
          )}
        </div>
      </ChatWorkspaceProvider>
    </AuthRequiredGate>
  )
}
