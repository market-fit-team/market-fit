import { useState } from "react"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { useMarketScrap } from "@/features/map/hooks/use-market-scrap"
import type { MarketScrapTarget } from "@/features/map/types/map"
import { Button } from "@/shared/components/ui/button"

type ScrapButtonProps = {
  label?: string
  target: MarketScrapTarget
}

export function ScrapButton({ label = "스크랩", target }: ScrapButtonProps) {
  const [isScrapped, setIsScrapped] = useState(false)
  const scrapMutation = useMarketScrap()

  const handleClick = () => {
    scrapMutation.mutate(target, {
      onSuccess: () => setIsScrapped(true),
    })
  }

  return (
    <Button
      type="button"
      variant={isScrapped ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={scrapMutation.isPending}
      aria-pressed={isScrapped}
    >
      {isScrapped ? (
        <BookmarkCheck className="h-3 w-3" />
      ) : (
        <Bookmark className="h-3 w-3" />
      )}
      {isScrapped ? "스크랩됨" : label}
    </Button>
  )
}
