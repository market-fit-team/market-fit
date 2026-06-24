import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function OnboardingResultPredictionPanelSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-primary/30" />
        <Skeleton className="h-5 w-36" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 py-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 4 }, (_, metricIndex) => (
                  <Skeleton
                    key={metricIndex}
                    className="h-14 w-full rounded-lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-muted/15">
        <CardContent className="space-y-3 py-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </CardContent>
      </Card>

      <Skeleton className="h-10 w-full rounded-md sm:w-40" />
    </>
  )
}
