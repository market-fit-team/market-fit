import { CardContent } from "@/shared/components/ui/card"

export function RecommendationError() {
  return (
    <CardContent className="flex flex-1 items-center justify-center px-4 py-3 text-center text-xs leading-relaxed text-destructive">
      추천 상권 목록을 불러오지 못했습니다.
    </CardContent>
  )
}
