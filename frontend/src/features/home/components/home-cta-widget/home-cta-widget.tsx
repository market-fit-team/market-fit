import Link from "next/link"
import { ArrowRight, HelpCircle, Map } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

// 홈 전용 CTA 영역이다. 온보딩과 지도 탐색으로 진입시키는 링크만 가진다.
export function HomeCtaWidget() {
  return (
    <section className="grid gap-8 md:grid-cols-2">
      <Card className="flex flex-col justify-between overflow-hidden border-t-4 border-t-primary">
        <CardHeader className="pb-3">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-base sm:text-lg">
            1분 성향 분석 온보딩
          </CardTitle>
          <CardDescription className="mt-1">
            간단한 설문을 바탕으로 선호하는 경영 스타일과 자본 상황에 적합한
            가맹 브랜드 및 상권 후보군을 추천합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="mb-6 space-y-2.5 text-xs text-muted-foreground sm:text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              자본규모 및 창업주의 리스크 성향 검증
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              대중성 가맹점 vs 힙한 프리미엄 F&B 매칭
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              유저 타워 생성 및 맞춤 행정동 상권 우선순위 핑
            </li>
          </ul>
          <Button asChild size="lg" className="w-full justify-between">
            <Link href="/onboarding">
              성향 분석 테스트 시작
              <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-between overflow-hidden border-t-4 border-t-foreground">
        <CardHeader className="pb-3">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Map className="h-6 w-6" />
          </div>
          <CardTitle className="text-base sm:text-lg">
            몰입형 상권 지도 탐색
          </CardTitle>
          <CardDescription className="mt-1">
            서울 핵심 행정동 상권의 월평균 매출액, 시간대별 유동인구, 업종별
            점포 생존율을 대화형 지도상에서 직접 비교 분석합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="mb-6 space-y-2.5 text-xs text-muted-foreground sm:text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              지도 위 행정동 클릭을 통한 정밀 시각화 대시보드
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              업종분류별, 연령대별 Recharts 분석
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
              우측 AI 창업비서 상담 및 PDF 리포트 파일 출력
            </li>
          </ul>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="w-full justify-between"
          >
            <Link href="/map">
              상권 지도 바로가기
              <Map className="h-4 w-4 transition-transform group-hover/button:rotate-12" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
