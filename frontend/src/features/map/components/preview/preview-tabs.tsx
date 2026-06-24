"use client"

import { useState } from "react"
import { PreviewEstimatedSalesRanking } from "@/features/map/components/preview/estimated-sales-ranking"
import { PreviewFranchiseRecommendations } from "@/features/map/components/preview/franchise-recommendations"
import type { MapTab } from "@/features/map/types/map"
import type { DistrictData } from "@/features/startup/lib/data"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs"

type PreviewTabsProps = {
  tradeArea: DistrictData
}

export function PreviewTabs({ tradeArea }: PreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<MapTab>("sales")

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as MapTab)}
    >
      <TabsList variant="line" className="mb-3.5 border-b border-border pb-2">
        <TabsTrigger value="sales">업종별 추정매출</TabsTrigger>
        <TabsTrigger value="franchises">프랜차이즈 추천</TabsTrigger>
      </TabsList>
      <TabsContent value="sales" className="mt-0">
        <PreviewEstimatedSalesRanking tradeArea={tradeArea} />
      </TabsContent>
      <TabsContent value="franchises" className="mt-0">
        <PreviewFranchiseRecommendations tradeArea={tradeArea} />
      </TabsContent>
    </Tabs>
  )
}
