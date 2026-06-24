"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import { useChatWorkspaceDocuments } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-documents"
import { useChatWorkspaceUi } from "@/features/llm-chat/providers/chat-workspace-ui-provider"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { formatRelativeTime } from "@/shared/utils"

export function ChatDocumentList() {
  const { documents, error, isLoading } = useChatWorkspaceDocuments()
  const { isSelectionLocked, selectedDocumentIds, toggleDocument } =
    useChatWorkspaceUi()

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`document-skeleton-${index}`}
            className="h-24 rounded-lg"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Empty className="border border-border/60">
        <EmptyHeader>
          <EmptyTitle>문서 목록을 불러오지 못했습니다.</EmptyTitle>
          <EmptyDescription>문서를 다시 조회해 주세요.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (documents.length === 0) {
    return (
      <Empty className="border border-border/60">
        <EmptyHeader>
          <EmptyTitle>저장된 문서가 없습니다.</EmptyTitle>
          <EmptyDescription>
            문서를 추가하면 이후 대화 컨텍스트로 재사용할 수 있습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        {documents.map((document) => {
          const checked = selectedDocumentIds.includes(document.id)

          return (
            <Card key={document.id} size="sm">
              <CardHeader className="gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={checked}
                    disabled={isSelectionLocked}
                    onCheckedChange={() => toggleDocument(document.id)}
                    aria-label={`${document.title} 선택`}
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm">
                      {document.title}
                    </CardTitle>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {document.type} · {formatRelativeTime(document.updatedAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {document.summary && (
                  <p className="text-xs text-muted-foreground">
                    {document.summary}
                  </p>
                )}
                <p className="line-clamp-3 text-xs">{document.preview}</p>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/example/chat/documents/${document.id}`}>
                    <FileText className="size-3.5" />
                    raw_text 보기
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}
