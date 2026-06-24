import Link from "next/link"
import { getOnboardingEntryPath } from "@/features/onboarding/lib/onboarding-routes"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty"

export default function OnboardingResultNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <Empty className="max-w-xl border-border/60 bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">404</EmptyMedia>
          <EmptyTitle>결과 코드를 찾지 못했습니다.</EmptyTitle>
          <EmptyDescription>
            결과 코드가 잘못되었거나 더 이상 조회할 수 없는 결과입니다.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={getOnboardingEntryPath()}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            설문 시작 화면으로 돌아가기
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  )
}
