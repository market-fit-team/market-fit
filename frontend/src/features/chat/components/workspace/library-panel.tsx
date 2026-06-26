"use client"

import * as React from "react"
import {
  Eye,
  FolderOpen,
  GripVertical,
  LayoutGrid,
  List,
  MessageSquarePlus,
  MoreVertical,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react"
import {
  getDocumentIcon,
  getDocumentPreview,
  getDocumentTitle,
} from "@/features/chat/lib/display/chat-display"
import type { DocumentResponse } from "@/shared/api/generated/agent/schemas"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import { formatRelativeTime } from "@/shared/utils"

type LibraryPanelProps = {
  documents: DocumentResponse[]
  isLoading?: boolean
  selectedDocumentIds?: string[]
  onToggleDocument?: (documentId: string) => void
  onOpenDocument: (document: DocumentResponse) => void
  onCollapsePanel: () => void
  side?: "left" | "right"
}

export function LibraryPanel({
  documents,
  isLoading,
  selectedDocumentIds = [],
  onToggleDocument,
  onOpenDocument,
  onCollapsePanel,
  side = "right",
}: LibraryPanelProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list")

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border/20 bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            라이브러리
          </span>
          <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
            {documents.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border/40 bg-muted/20 p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-5 w-5 cursor-pointer rounded-sm",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <List className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-5 w-5 cursor-pointer rounded-sm",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <LayoutGrid className="size-3" />
            </Button>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onCollapsePanel}
                  className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
                  id="library-panel-collapse-btn"
                >
                  {side === "left" ? (
                    <PanelLeftClose className="size-3.5" />
                  ) : (
                    <PanelRightClose className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={side === "left" ? "right" : "left"}>
                패널 접기
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
        <div
          className={cn(
            "p-2",
            viewMode === "list"
              ? "space-y-0.5"
              : "grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 p-3"
          )}
        >
          {isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-lg" />
            ))}

          {!isLoading &&
            documents.map((document) =>
              viewMode === "list" ? (
                <LibraryRow
                  key={document.id}
                  document={document}
                  isDragging={draggedId === document.id}
                  isSelected={selectedDocumentIds.includes(document.id)}
                  onAttach={() => onToggleDocument?.(document.id)}
                  onOpen={() => onOpenDocument(document)}
                  onDragStart={() => setDraggedId(document.id)}
                  onDragEnd={() => setDraggedId(null)}
                />
              ) : (
                <LibraryGridCard
                  key={document.id}
                  document={document}
                  isDragging={draggedId === document.id}
                  isSelected={selectedDocumentIds.includes(document.id)}
                  onAttach={() => onToggleDocument?.(document.id)}
                  onOpen={() => onOpenDocument(document)}
                  onDragStart={() => setDraggedId(document.id)}
                  onDragEnd={() => setDraggedId(null)}
                />
              )
            )}

          {!isLoading && documents.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              저장된 문서가 없습니다
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/15 px-4 py-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          문서를 채팅 입력에 추가하거나 미리보기로 열 수 있습니다
        </p>
      </div>
    </div>
  )
}

type LibraryItemProps = {
  document: DocumentResponse
  isDragging: boolean
  isSelected: boolean
  onAttach: () => void
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function LibraryRow({
  document,
  isDragging,
  isSelected,
  onAttach,
  onOpen,
  onDragStart,
  onDragEnd,
}: LibraryItemProps) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", document.id)
        event.dataTransfer.effectAllowed = "copy"
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-lg px-2 py-2 transition-all active:cursor-grabbing",
        isDragging ? "scale-95 opacity-40" : "hover:bg-muted/30",
        isSelected && "bg-foreground/[0.04]"
      )}
      id={`library-row-${document.id}`}
    >
      <GripVertical className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="shrink-0">{getDocumentIcon(document.type)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs leading-tight font-medium text-foreground">
          {getDocumentTitle(document)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {document.type} · {getDocumentPreview(document)}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground group-hover:hidden sm:block">
        {formatRelativeTime(document.updated_at)}
      </span>
      <LibraryMenu
        documentId={document.id}
        isSelected={isSelected}
        onAttach={onAttach}
        onOpen={onOpen}
      />
    </div>
  )
}

function LibraryGridCard({
  document,
  isDragging,
  isSelected,
  onAttach,
  onOpen,
  onDragStart,
  onDragEnd,
}: LibraryItemProps) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", document.id)
        event.dataTransfer.effectAllowed = "copy"
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "group relative flex cursor-grab flex-col items-center justify-center gap-2 rounded-lg border border-border/20 p-4 transition-all active:cursor-grabbing",
        isDragging ? "scale-95 opacity-40" : "hover:bg-muted/30",
        isSelected && "bg-foreground/[0.04]"
      )}
      id={`library-grid-${document.id}`}
    >
      <div className="mb-1 scale-[1.5]">{getDocumentIcon(document.type)}</div>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-xs font-medium text-foreground">
          {getDocumentTitle(document)}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {document.type}
        </p>
      </div>
      <div className="absolute top-1 right-1">
        <LibraryMenu
          documentId={document.id}
          isSelected={isSelected}
          onAttach={onAttach}
          onOpen={onOpen}
        />
      </div>
    </div>
  )
}

function LibraryMenu({
  documentId,
  isSelected,
  onAttach,
  onOpen,
}: {
  documentId: string
  isSelected: boolean
  onAttach: () => void
  onOpen: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/50 hover:text-foreground"
          id={`library-menu-${documentId}`}
        >
          <MoreVertical className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onAttach} className="cursor-pointer">
          <MessageSquarePlus className="size-3.5" />
          <span>{isSelected ? "채팅에서 제거" : "채팅에 추가"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpen} className="cursor-pointer">
          <Eye className="size-3.5" />
          <span>미리보기</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
