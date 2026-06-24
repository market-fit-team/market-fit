import type { ReactNode } from "react"
import { AuthRequiredGate } from "@/features/auth/components/auth-required-gate"
import { ChatWorkspaceShell } from "@/features/llm-chat/components/workspace/chat-workspace-shell"
import { ChatWorkspaceUiProvider } from "@/features/llm-chat/providers/chat-workspace-ui-provider"
import { ClientOnly } from "@/shared/components/client-only"

type ChatLayoutProps = {
  children: ReactNode
  modal: ReactNode
}

export default function ChatLayout({ children, modal }: ChatLayoutProps) {
  return (
    <ClientOnly>
      <AuthRequiredGate>
        <ChatWorkspaceUiProvider>
          <ChatWorkspaceShell>{children}</ChatWorkspaceShell>
          {modal}
        </ChatWorkspaceUiProvider>
      </AuthRequiredGate>
    </ClientOnly>
  )
}
