import { Bot } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty"

export function EmptyChatState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Empty className="border-border bg-transparent">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bot className="size-4" />
          </EmptyMedia>
          <EmptyTitle>메시지를 입력해 대화를 시작하세요.</EmptyTitle>
          <EmptyDescription>
            도구 정책을 조절하고 thinking 토큰, 도구 실행 결과, HITL 결정 흐름을
            확인할 수 있습니다.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
