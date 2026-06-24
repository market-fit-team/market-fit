import { DetailReport } from "@/features/map/components/detail/detail-report"

// /map/detail 직접 진입·새로고침용 경로. 인터셉트(@detail)의 하드 내비 폴백이다.
export default function MapDetailPage() {
  return <DetailReport mode="page" />
}
