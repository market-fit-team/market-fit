"use client"

import { X } from "lucide-react"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

// ExploreHeader는 추천 목록과 AI 채팅을 한 자리에서 전환
export function ExploreHeader() {
  const closeLeftPanel = useMapStore((state) => state.closeLeftPanel)
  const leftPanelMode = useMapStore((state) => state.leftPanelMode)
  const setLeftPanelMode = useMapStore((state) => state.setLeftPanelMode)

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-foreground">상권 탐색</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={closeLeftPanel}
          aria-label="왼쪽 패널 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={leftPanelMode}
        onValueChange={(value) =>
          setLeftPanelMode(value as typeof leftPanelMode)
        }
        className="gap-0"
      >
        <TabsList
          variant="line"
          className="grid h-10 w-full grid-cols-2 px-3 pb-2"
        >
          <TabsTrigger value="recommendations">추천 목록</TabsTrigger>
          <TabsTrigger value="chat">AI 상담</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
