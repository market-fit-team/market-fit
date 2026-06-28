import { useRouter } from "next/navigation"
import { MarketPreviewPanel } from "@/features/map/components/preview/market-preview-panel"
import { useAdminAreas } from "@/features/map/hooks/use-admin-areas"
import { useMarketPreview } from "@/features/map/hooks/use-market-preview"
import { useMapStore } from "@/features/map/store/map-store"

export function MarketPreview() {
  const router = useRouter()
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectDong = useMapStore((state) => state.selectDong)
  const { data: adminAreas } = useAdminAreas()
  const {
    data: preview,
    isError,
    isLoading,
  } = useMarketPreview(selectedDongCode)
  const selectedDong = adminAreas?.dongGeoJson.features.find(
    (feature) => feature.properties.code === selectedDongCode
  )?.properties

  if (!selectedDongCode) {
    return null
  }

  return (
    <MarketPreviewPanel
      dongName={selectedDong?.name ?? selectedDongCode}
      isError={isError}
      isLoading={isLoading}
      onClose={() => selectDong(null)}
      onOpenDetail={() =>
        router.push(`/map/detail?dongCode=${selectedDongCode}`)
      }
      preview={preview}
      sigunguName={selectedDong?.sigunguName ?? "-"}
    />
  )
}
