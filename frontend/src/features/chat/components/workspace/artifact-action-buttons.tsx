"use client"

import * as React from "react"
import { AtSign, Loader2, Save } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import {
  useSaveArtifactAsDocumentApiV1AgentArtifactsArtifactIdSaveAsDocumentPost,
} from "@/shared/api/generated/agent/endpoints/agent-artifacts/agent-artifacts"
import { getListDocumentsApiV1AgentDocumentsGetQueryKey } from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import { Button } from "@/shared/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"

type ArtifactActionButtonsProps = {
  artifactId: string
  canInteract: boolean
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

const normalizeSaveErrorMessage = (error: unknown) => {
  if (error instanceof HttpStatusError) {
    if (typeof error.body === "string" && error.body.trim()) {
      return error.body
    }

    return `라이브러리에 저장하지 못했습니다. (HTTP ${error.status})`
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "라이브러리에 저장하지 못했습니다."
}

export function ArtifactActionButtons({
  artifactId,
  canInteract,
  size = "icon-xs",
  className,
}: ArtifactActionButtonsProps) {
  const queryClient = useQueryClient()
  const {
    isSelectionLocked,
    selectedArtifactIds,
    toggleArtifact,
  } = useChatWorkspace()
  const saveArtifactAsDocument =
    useSaveArtifactAsDocumentApiV1AgentArtifactsArtifactIdSaveAsDocumentPost()
  const isSelected = selectedArtifactIds.includes(artifactId)
  const isSaveDisabled = !canInteract || saveArtifactAsDocument.isPending
  const isContextDisabled = !canInteract || isSelectionLocked
  const saveTooltip = !canInteract
    ? "아티팩트 동기화 후 저장할 수 있습니다"
    : saveArtifactAsDocument.isPending
      ? "라이브러리에 저장 중"
      : "라이브러리에 저장"
  const contextTooltip = !canInteract
    ? "아티팩트 동기화 후 추가할 수 있습니다"
    : isSelected
      ? "채팅에서 제거"
      : "채팅에 추가"

  const stopPropagation = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleSave = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event)
    if (isSaveDisabled) {
      return
    }

    saveArtifactAsDocument.mutate(
      { artifactId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getListDocumentsApiV1AgentDocumentsGetQueryKey(),
          })
          toast.success("라이브러리에 저장했습니다.")
        },
        onError: (error) => {
          toast.error(normalizeSaveErrorMessage(error))
        },
      }
    )
  }

  const handleToggleContext = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event)
    if (isContextDisabled) {
      return
    }

    toggleArtifact(artifactId)
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size={size}
                onClick={handleSave}
                disabled={isSaveDisabled}
                aria-label={saveTooltip}
                className="cursor-pointer"
              >
                {saveArtifactAsDocument.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{saveTooltip}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant={isSelected ? "secondary" : "outline"}
                size={size}
                onClick={handleToggleContext}
                disabled={isContextDisabled}
                aria-label={contextTooltip}
                className="cursor-pointer"
              >
                <AtSign className="size-3" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{contextTooltip}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
