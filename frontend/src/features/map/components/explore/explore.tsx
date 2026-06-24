"use client"

import { MapChatWidget } from "@/features/agent/components/map-chat-widget/map-chat-widget"
import { ExploreHeader } from "@/features/map/components/explore/explore-header"
import { Recommendation } from "@/features/map/components/recommendation/recommendation"
import { useMapStore } from "@/features/map/store/map-store"
import type { DistrictData } from "@/features/startup/lib/data"
import { Card } from "@/shared/components/ui/card"

type ExploreProps = {
  selectedTradeArea: DistrictData | null
}

export function Explore({ selectedTradeArea }: ExploreProps) {
  const leftPanelMode = useMapStore((state) => state.leftPanelMode)

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <ExploreHeader />
      {leftPanelMode === "chat" ? (
        <MapChatWidget selectedTradeArea={selectedTradeArea} />
      ) : (
        <Recommendation />
      )}
    </Card>
  )
}
