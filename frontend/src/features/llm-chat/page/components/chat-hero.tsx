import { MessageSquarePlus, MoreHorizontal } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface ChatHeroProps {
  threadId: string | null
  isBusy: boolean
  onReset: () => void
}

export function ChatHero({ threadId, isBusy, onReset }: ChatHeroProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-3 sm:px-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            AI Chat
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {threadId ? `thread ${threadId.slice(0, 8)}` : "새 대화"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="채팅 메뉴">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>채팅 정보</DropdownMenuLabel>
              <DropdownMenuItem className="justify-between py-2 text-sm">
                <span className="text-muted-foreground">경로</span>
                <span>/chat</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="justify-between py-2 text-sm">
                <span className="text-muted-foreground">스레드</span>
                <span className="max-w-32 truncate">
                  {threadId ? threadId.slice(0, 8) : "new"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isBusy}
                onSelect={onReset}
                className="py-2 text-sm"
              >
                <MessageSquarePlus className="mr-0.5 size-3" />새 채팅 시작
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
