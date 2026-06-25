import { X } from "lucide-react"
import type { LeftPanelMode } from "@/features/map/store/slices/layout-slice"
import { Button } from "@/shared/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

type ExploreHeaderViewProps = {
  leftPanelMode: LeftPanelMode
  onClose: () => void
  onModeChange: (mode: LeftPanelMode) => void
}

export function ExploreHeaderView({
  leftPanelMode,
  onClose,
  onModeChange,
}: ExploreHeaderViewProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-foreground">상권 탐색</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="왼쪽 패널 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={leftPanelMode}
        onValueChange={(value) => onModeChange(value as LeftPanelMode)}
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
