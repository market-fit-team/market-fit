import { Skeleton } from "@/shared/components/ui/skeleton"

export function DetailReportSkeleton() {
  return (
    <>
      <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl lg:col-span-2" />
    </>
  )
}
