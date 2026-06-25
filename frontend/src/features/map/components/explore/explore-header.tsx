import { ExploreHeaderView } from "@/features/map/components/explore/explore-header-view"
import { useMapStore } from "@/features/map/store/map-store"

// ExploreHeader는 추천 목록과 AI 채팅을 한 자리에서 전환
export function ExploreHeader() {
  const closeLeftPanel = useMapStore((state) => state.closeLeftPanel)
  const leftPanelMode = useMapStore((state) => state.leftPanelMode)
  const setLeftPanelMode = useMapStore((state) => state.setLeftPanelMode)

  return (
    <ExploreHeaderView
      leftPanelMode={leftPanelMode}
      onClose={closeLeftPanel}
      onModeChange={setLeftPanelMode}
    />
  )
}
