"use client"

import { ChatWorkspaceEmptyState } from "@/features/chat/components/workspace/chat-workspace-empty-state"
import { ChatWorkspaceShell } from "@/features/chat/components/workspace/chat-workspace-shell"

export function ChatWorkspaceHome() {
  return (
    <ChatWorkspaceShell>
      <ChatWorkspaceEmptyState />
    </ChatWorkspaceShell>
  )
}
