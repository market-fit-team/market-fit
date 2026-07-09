import type { ReactNode } from "react"
import { PreviewEstimatedSalesRanking } from "@/features/map/components/preview/estimated-sales-ranking"
import { PreviewFranchiseRecommendations } from "@/features/map/components/preview/franchise-recommendations"
import type { MarketPreviewData } from "@/features/map/types/map"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs"

type PreviewTabsProps = {
  preview: MarketPreviewData
  salesContent?: ReactNode
}

export function PreviewTabs({ preview, salesContent }: PreviewTabsProps) {
  return (
    <Tabs defaultValue="sales">
      <TabsList className="mb-5 grid h-10 w-full grid-cols-2 rounded-xl bg-muted p-1">
        <TabsTrigger value="sales">업종별 추정매출</TabsTrigger>
        <TabsTrigger value="franchises">프랜차이즈 추천</TabsTrigger>
      </TabsList>
      <TabsContent value="sales" className="mt-0">
        {salesContent ?? (
          <PreviewEstimatedSalesRanking rankings={preview.industryRankings} />
        )}
      </TabsContent>
      <TabsContent value="franchises" className="mt-0">
        <PreviewFranchiseRecommendations
          franchises={preview.franchiseRecommendations}
        />
      </TabsContent>
    </Tabs>
  )
}
