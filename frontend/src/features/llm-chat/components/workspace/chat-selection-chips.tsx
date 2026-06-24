"use client"

import { X } from "lucide-react"
import { useChatWorkspaceArtifacts } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-artifacts"
import { useChatWorkspaceDocuments } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-documents"
import { useChatWorkspaceUi } from "@/features/llm-chat/providers/chat-workspace-ui-provider"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

type ChatSelectionChipsProps = {
  currentThreadId: string | null
}

export function ChatSelectionChips({
  currentThreadId,
}: ChatSelectionChipsProps) {
  const { documents } = useChatWorkspaceDocuments()
  const { artifacts } = useChatWorkspaceArtifacts(currentThreadId)
  const {
    isSelectionLocked,
    selectedDocumentIds,
    selectedArtifactIds,
    toggleDocument,
    toggleArtifact,
  } = useChatWorkspaceUi()

  const selectedDocuments = documents.filter((document) =>
    selectedDocumentIds.includes(document.id)
  )
  const selectedArtifacts = artifacts.filter((artifact) =>
    selectedArtifactIds.includes(artifact.id)
  )

  if (selectedDocuments.length === 0 && selectedArtifacts.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedDocuments.map((document) => (
        <Badge
          key={document.id}
          variant="secondary"
          className="gap-1 rounded-full px-2 py-1"
        >
          문서 · {document.title}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-4 rounded-full"
            disabled={isSelectionLocked}
            onClick={() => toggleDocument(document.id)}
          >
            <X className="size-2.5" />
            <span className="sr-only">문서 선택 해제</span>
          </Button>
        </Badge>
      ))}

      {selectedArtifacts.map((artifact) => (
        <Badge
          key={artifact.id}
          variant="secondary"
          className="gap-1 rounded-full px-2 py-1"
        >
          아티팩트 · {artifact.title}
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-4 rounded-full"
            disabled={isSelectionLocked}
            onClick={() => toggleArtifact(artifact.id)}
          >
            <X className="size-2.5" />
            <span className="sr-only">아티팩트 선택 해제</span>
          </Button>
        </Badge>
      ))}
    </div>
  )
}
