import { HomeIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty"
import { cn } from "@/shared/lib/utils"

type ErrorFallbackPanelProps = {
  title: string
  description?: string
  retryLabel?: string
  homeLabel?: string
  onRetry?: () => void
  onHome?: () => void
  className?: string
}

export function ErrorFallbackPanel({
  title,
  description = "잠시 후 다시 시도하거나 홈으로 이동해 주세요.",
  retryLabel = "재시도",
  homeLabel = "홈으로",
  onRetry,
  onHome,
  className,
}: ErrorFallbackPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[min(480px,100%)] flex-1 items-center justify-center px-4 py-12",
        className
      )}
    >
      <Empty className="max-w-xl border-border/60 bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon className="size-4 text-destructive" />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="flex-row justify-center">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              <RotateCcwIcon data-icon="inline-start" />
              {retryLabel}
            </Button>
          ) : null}
          {onHome ? (
            <Button type="button" variant="outline" onClick={onHome}>
              <HomeIcon data-icon="inline-start" />
              {homeLabel}
            </Button>
          ) : null}
        </EmptyContent>
      </Empty>
    </div>
  )
}
