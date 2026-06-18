import { Suspense } from "react"
import {
  ChatApp,
  ChatAppSkeleton,
} from "@/features/llm-chat/components/chat-app/chat-app"
import { ClientOnly } from "@/shared/components/client-only"
import { Skeleton } from "@/shared/components/ui/skeleton"

function ChatPageSkeleton() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-4xl flex-col overflow-hidden border-x border-border/60 bg-background">
      <div className="border-b border-border bg-background/95 px-4 py-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="min-h-0 flex-1 bg-muted/20 px-6 py-8">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="border-t border-border bg-background/95 p-3">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ClientOnly fallback={<ChatPageSkeleton />}>
      <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-4xl flex-col overflow-hidden border-x border-border/60 bg-background">
        <Suspense fallback={<ChatAppSkeleton />}>
          <ChatApp />
        </Suspense>
      </div>
    </ClientOnly>
  )
}
