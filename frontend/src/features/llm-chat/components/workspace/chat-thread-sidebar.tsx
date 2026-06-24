"use client"

import Link from "next/link"
import { Loader2, MessageSquarePlus } from "lucide-react"
import { useChatWorkspaceThreads } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-threads"
import { Button } from "@/shared/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/utils"

type ChatThreadSidebarProps = {
  currentThreadId: string | null
}

export function ChatThreadSidebar({ currentThreadId }: ChatThreadSidebarProps) {
  const { error, isLoading, threads } = useChatWorkspaceThreads()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/60 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">채팅 목록</h2>
            <p className="text-xs text-muted-foreground">
              앱 스레드 기준으로 저장된 대화입니다.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/example/chat">
              <MessageSquarePlus className="size-3.5" />새 대화
            </Link>
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`thread-skeleton-${index}`}
                className="space-y-2 rounded-lg border border-border/60 p-3"
              >
                <Skeleton className="h-4 w-32" />
              </div>
            ))}

          {!isLoading && Boolean(error) && (
            <Empty className="border border-border/60">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Loader2 className="size-4" />
                </EmptyMedia>
                <EmptyTitle>채팅 목록을 불러오지 못했습니다.</EmptyTitle>
                <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && !error && threads.length === 0 && (
            <Empty className="border border-border/60">
              <EmptyHeader>
                <EmptyTitle>아직 저장된 대화가 없습니다.</EmptyTitle>
                <EmptyDescription>
                  첫 메시지를 보내면 앱 스레드가 생성됩니다.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading &&
            !error &&
            threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/example/chat/${thread.id}`}
                className={cn(
                  "block rounded-lg border border-border/60 bg-background px-3 py-3 transition-colors hover:border-border hover:bg-accent/40",
                  currentThreadId === thread.id &&
                    "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                )}
              >
                <div className="truncate text-sm font-medium">
                  {thread.title}
                </div>
              </Link>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
