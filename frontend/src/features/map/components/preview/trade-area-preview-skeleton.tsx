import { Skeleton } from "@/shared/components/ui/skeleton"

export function TradeAreaPreviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  )
}
