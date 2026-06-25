import { CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function RecommendationSkeleton() {
  return (
    <CardContent className="flex flex-1 flex-col gap-2 px-3 py-3">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </CardContent>
  )
}
