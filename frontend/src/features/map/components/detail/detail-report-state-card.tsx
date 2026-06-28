import type { LucideIcon } from "lucide-react"
import { AlertCircle, CircleOff, MapPinned } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert"
import { Card, CardContent } from "@/shared/components/ui/card"

type DetailReportState = "empty" | "error" | "no-selection"

type DetailReportStateCardProps = {
  state: DetailReportState
}

const stateContent: Record<
  DetailReportState,
  {
    description: string
    icon: LucideIcon
    title: string
    variant?: "destructive"
  }
> = {
  empty: {
    description: "선택한 행정동의 상권 상세 데이터가 없습니다.",
    icon: CircleOff,
    title: "상세 데이터 없음",
  },
  error: {
    description:
      "상권 상세 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    icon: AlertCircle,
    title: "상권 상세 조회 실패",
    variant: "destructive",
  },
  "no-selection": {
    description:
      "지도 탐색에서 행정동을 선택하면 상권 상세 리포트를 확인할 수 있습니다.",
    icon: MapPinned,
    title: "선택된 행정동 없음",
  },
}

export function DetailReportStateCard({ state }: DetailReportStateCardProps) {
  const { description, icon: Icon, title, variant } = stateContent[state]

  return (
    <Card className="lg:col-span-2">
      <CardContent>
        <Alert variant={variant}>
          <Icon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
