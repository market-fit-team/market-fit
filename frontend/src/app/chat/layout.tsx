import type { ReactNode } from "react"
import { AuthRequiredGate } from "@/features/auth/components/auth-required-gate"
import { ChatWorkspaceFrame } from "@/features/chat/components/workspace/chat-workspace-frame"
import { ChatWorkspaceProvider } from "@/features/chat/providers/chat-workspace-provider"
import { ClientOnly } from "@/shared/components/client-only"

type ChatLayoutProps = {
  children: ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <ClientOnly>
      <AuthRequiredGate>
        <ChatWorkspaceProvider>
          <ChatWorkspaceFrame>{children}</ChatWorkspaceFrame>
        </ChatWorkspaceProvider>
      </AuthRequiredGate>
    </ClientOnly>
  )
}
