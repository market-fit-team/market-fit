"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { useChatWorkspaceArtifacts } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-artifacts"
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

type ChatArtifactListProps = {
  currentThreadId: string | null
}

export function ChatArtifactList({ currentThreadId }: ChatArtifactListProps) {
  const { artifacts, error, isLoading } =
    useChatWorkspaceArtifacts(currentThreadId)
  const { isSelectionLocked, selectedArtifactIds, toggleArtifact } =
    useChatWorkspaceUi()

  if (!currentThreadId) {
    return (
      <Empty className="border border-border/60">
        <EmptyHeader>
          <EmptyTitle>아티팩트는 스레드 선택 후 표시됩니다.</EmptyTitle>
          <EmptyDescription>
            AI가 만든 결과물은 현재 대화 단위로 조회합니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`artifact-skeleton-${index}`}
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
          <EmptyTitle>아티팩트를 불러오지 못했습니다.</EmptyTitle>
          <EmptyDescription>
            현재 스레드 결과물을 다시 조회해 주세요.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (artifacts.length === 0) {
    return (
      <Empty className="border border-border/60">
        <EmptyHeader>
          <EmptyTitle>아직 생성된 결과물이 없습니다.</EmptyTitle>
          <EmptyDescription>
            도구 실행 후 생성된 아티팩트가 이 목록에 표시됩니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        {artifacts.map((artifact) => {
          const checked = selectedArtifactIds.includes(artifact.id)

          return (
            <Card key={artifact.id} size="sm">
              <CardHeader className="gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={checked}
                    disabled={isSelectionLocked}
                    onCheckedChange={() => toggleArtifact(artifact.id)}
                    aria-label={`${artifact.title} 선택`}
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm">
                      {artifact.title}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Sparkles className="size-3" />
                      {artifact.type} · v{artifact.version} ·{" "}
                      {formatRelativeTime(artifact.updatedAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {artifact.summary && (
                  <p className="text-xs text-muted-foreground">
                    {artifact.summary}
                  </p>
                )}
                <p className="line-clamp-3 text-xs">{artifact.preview}</p>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/example/chat/artifacts/${artifact.id}`}>
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
