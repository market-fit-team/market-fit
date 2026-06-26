"use client"

import type { ReactNode } from "react"
import { RightSidebar } from "@/features/chat/components/workspace/right-sidebar"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type { HitlDecision } from "@/features/chat/types/hitl-interrupt-payload"
import { useListDocumentsApiV1AgentDocumentsGet } from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable"

type ChatWorkspaceShellProps = {
  children: ReactNode
  onHitlDecide?: (decisions: HitlDecision[]) => void
}

export function ChatWorkspaceShell({
  children,
  onHitlDecide,
}: ChatWorkspaceShellProps) {
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
  const { rightPanel, setRightPanel } = useChatWorkspace()
  const documents = documentsQuery.data?.documents ?? []
  const isRightPanelOpen = rightPanel !== null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={isRightPanelOpen ? "65%" : "100%"} minSize="40%">
          {children}
        </ResizablePanel>

        {isRightPanelOpen && rightPanel && (
          <>
            <ResizableHandle
              withHandle
              className="!w-1.5 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/40"
            />
            <ResizablePanel defaultSize="35%" minSize="20%" maxSize="50%">
              {/* 우측 패널은 스레드 런타임과 더 가깝게 묶여 있어 page 레벨에 유지합니다. */}
              <RightSidebar
                panel={rightPanel}
                documents={documents}
                isDocumentsLoading={documentsQuery.isLoading}
                onClose={() => setRightPanel(null)}
                onOpenDocument={(document) =>
                  setRightPanel({ kind: "library-document", document })
                }
                onHitlDecide={onHitlDecide}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
