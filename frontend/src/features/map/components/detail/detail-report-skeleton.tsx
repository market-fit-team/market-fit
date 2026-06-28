import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

function DetailReportSkeletonCard({
  className = "",
  rows = 3,
}: {
  className?: string
  rows?: number
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </CardContent>
    </Card>
  )
}

export function DetailReportSkeleton() {
  return (
    <>
      <DetailReportSkeletonCard className="lg:col-span-2" rows={4} />
      <DetailReportSkeletonCard className="lg:col-span-2" rows={5} />
      <DetailReportSkeletonCard className="lg:col-span-2" rows={4} />
      <DetailReportSkeletonCard className="lg:col-span-2" rows={3} />
    </>
  )
}
