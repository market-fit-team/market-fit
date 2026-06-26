"use client"

import * as React from "react"
import {
  Check,
  Code,
  Copy,
  FileText,
  PanelRightClose,
  TerminalSquare,
} from "lucide-react"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import { HitlInterruptCard } from "@/features/chat/components/hitl/hitl-interrupt-card"
import { MarkdownContentRenderer } from "@/features/chat/components/workspace/markdown-content-renderer"
import {
  getArtifactIcon,
  getArtifactTitle,
  getDocumentIcon,
  getDocumentTitle,
} from "@/features/chat/lib/display/chat-display"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type { HitlDecision } from "@/features/chat/types/hitl-interrupt-payload"
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"

type RightSidebarProps = {
  panel: ChatRightPanel
  documents: DocumentResponse[]
  isDocumentsLoading?: boolean
  onClose: () => void
  onOpenDocument: (document: DocumentResponse) => void
  onHitlDecide?: (decisions: HitlDecision[]) => void
}

export function RightSidebar({
  panel,
  documents,
  isDocumentsLoading,
  onClose,
  onOpenDocument,
  onHitlDecide,
}: RightSidebarProps) {
  const title = getPanelTitle(panel)
  const icon = getPanelIcon(panel)
  const badge = getPanelBadge(panel)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden border-l border-border/20 bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate text-xs font-medium text-foreground">
            {title}
          </span>
          {badge && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 px-1.5 py-0 text-[10px]"
            >
              {badge}
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onClose}
                className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <PanelRightClose className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">패널 접기</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
        <div className="max-w-full min-w-0 p-3 md:p-5">
          {panel.kind === "library" && (
            <LibraryIndex
              documents={documents}
              isLoading={isDocumentsLoading}
              onOpenDocument={onOpenDocument}
            />
          )}
          {panel.kind === "library-document" && (
            <DocumentViewer document={panel.document} />
          )}
          {panel.kind === "artifact" && (
            <ArtifactViewer artifact={panel.artifact} />
          )}
          {panel.kind === "thinking" && (
            <ThinkingViewer
              reasoning={panel.reasoning}
              toolCalls={panel.toolCalls}
            />
          )}
          {panel.kind === "hitl" && (
            <HitlInterruptCard
              interrupts={panel.interrupts}
              disabled={!onHitlDecide}
              onDecide={(decisions) => onHitlDecide?.(decisions)}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function LibraryIndex({
  documents,
  isLoading,
  onOpenDocument,
}: {
  documents: DocumentResponse[]
  isLoading?: boolean
  onOpenDocument: (document: DocumentResponse) => void
}) {
  if (isLoading) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        라이브러리를 불러오는 중입니다
      </p>
    )
  }

  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        저장된 문서가 없습니다
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {documents.map((document) => (
        <button
          key={document.id}
          onClick={() => onOpenDocument(document)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/30"
        >
          {getDocumentIcon(document.type)}
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {getDocumentTitle(document)}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {document.type}
          </span>
        </button>
      ))}
    </div>
  )
}

function DocumentViewer({ document }: { document: DocumentResponse }) {
  const { isSelectionLocked, selectedDocumentIds, toggleDocument } =
    useChatWorkspace()
  const isSelected = selectedDocumentIds.includes(document.id)

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{getDocumentTitle(document)}</h2>
        <p className="text-xs text-muted-foreground">{document.type}</p>
        {document.summary && (
          <p className="text-xs leading-5 text-muted-foreground">
            {document.summary}
          </p>
        )}
      </div>
      <SelectionToggleButton
        isSelected={isSelected}
        disabled={isSelectionLocked}
        onClick={() => toggleDocument(document.id)}
      />
      {isMarkdownRenderableType(document.type) ? (
        <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
          <MarkdownContentRenderer content={document.raw_text} />
        </div>
      ) : (
        <RawTextBlock value={document.raw_text} />
      )}
    </div>
  )
}

function ArtifactViewer({ artifact }: { artifact: ArtifactResponse }) {
  const { isSelectionLocked, selectedArtifactIds, toggleArtifact } =
    useChatWorkspace()
  const isSelected = selectedArtifactIds.includes(artifact.id)

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{getArtifactTitle(artifact)}</h2>
        <p className="text-xs text-muted-foreground">
          {artifact.type} · v{artifact.version}
        </p>
        {artifact.summary && (
          <p className="text-xs leading-5 text-muted-foreground">
            {artifact.summary}
          </p>
        )}
      </div>
      <SelectionToggleButton
        isSelected={isSelected}
        disabled={isSelectionLocked}
        onClick={() => toggleArtifact(artifact.id)}
      />
      {isMarkdownRenderableType(artifact.type) ? (
        <div className="rounded-lg border border-border/40 bg-muted/10 p-4 text-sm leading-7">
          <MarkdownContentRenderer content={artifact.raw_text} />
        </div>
      ) : (
        <RawTextBlock value={artifact.raw_text} />
      )}
    </div>
  )
}

function ThinkingViewer({
  reasoning,
  toolCalls,
}: {
  reasoning?: string
  toolCalls: AssembledToolCall[]
}) {
  return (
    <div className="space-y-3">
      {reasoning && (
        <div className="rounded-lg border border-border/40 bg-muted/15 p-3">
          <div className="mb-2 text-xs font-medium">사고 과정</div>
          <pre className="text-xs leading-6 whitespace-pre-wrap text-muted-foreground">
            {reasoning}
          </pre>
        </div>
      )}
      {toolCalls.map((toolCall, index) => (
        <div
          key={toolCall.callId ?? toolCall.id ?? index}
          className="rounded-lg border border-border/40 bg-muted/10 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-medium">
              {toolCall.name ?? "tool"}
            </span>
            <Badge variant="outline" className="h-5 text-[10px]">
              {toolCall.status ?? "pending"}
            </Badge>
          </div>
          <RawTextBlock
            value={JSON.stringify(
              toolCall.output ?? toolCall.args ?? toolCall,
              null,
              2
            )}
          />
        </div>
      ))}
    </div>
  )
}

function RawTextBlock({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
      <div className="flex items-center justify-end border-b border-border/30 px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 cursor-pointer gap-1 text-xs"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre className="max-h-[60dvh] overflow-auto p-3 text-xs leading-6 whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  )
}

function SelectionToggleButton({
  disabled,
  isSelected,
  onClick,
}: {
  disabled: boolean
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={isSelected ? "secondary" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-7 cursor-pointer text-xs"
    >
      {isSelected ? "채팅에 추가됨" : "채팅에 추가"}
    </Button>
  )
}

const isMarkdownRenderableType = (type: ArtifactResponse["type"]) => {
  return (
    type === "markdown" ||
    type === "commercial_report" ||
    type === "research_report" ||
    type === "search_report"
  )
}

const getPanelTitle = (panel: ChatRightPanel) => {
  switch (panel.kind) {
    case "library":
      return "라이브러리"
    case "library-document":
      return getDocumentTitle(panel.document)
    case "artifact":
      return getArtifactTitle(panel.artifact)
    case "thinking":
      return panel.title
    case "hitl":
      return "승인 요청"
  }
}

const getPanelIcon = (panel: ChatRightPanel) => {
  switch (panel.kind) {
    case "library":
      return <FileText className="size-3.5 shrink-0 text-muted-foreground" />
    case "library-document":
      return getDocumentIcon(panel.document.type)
    case "artifact":
      return getArtifactIcon(panel.artifact.type)
    case "thinking":
      return (
        <TerminalSquare className="size-3.5 shrink-0 text-muted-foreground" />
      )
    case "hitl":
      return <Code className="size-3.5 shrink-0 text-muted-foreground" />
  }
}

const getPanelBadge = (panel: ChatRightPanel) => {
  switch (panel.kind) {
    case "library":
      return ""
    case "library-document":
      return panel.document.type
    case "artifact":
      return `v${panel.artifact.version}`
    case "thinking":
      return `${panel.toolCalls.length} 단계`
    case "hitl":
      return `${panel.interrupts.length}건`
  }
}
