import { DetailReport } from "@/features/map/components/detail/detail-report"

// /map에서 soft navigation으로 /map/detail에 들어오면 같은 경로를 모달로 가로챈다.
// 지도(children)는 그대로 유지되고 이 슬롯만 떠서, 닫으면 상태가 보존된 채 복귀한다.
// DetailReport 상단의 "지도 탐색으로" 버튼이 router.back()으로 모달을 닫는다.
export default function InterceptedMapDetailPage() {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <DetailReport mode="modal" />
    </div>
  )
}
