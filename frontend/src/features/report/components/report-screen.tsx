"use client"

import React, { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Calendar,
  Coins,
  Download,
  Lock,
  TrendingUp,
} from "lucide-react"
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { districtsData } from "@/features/startup/lib/data"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

type SavedReport = {
  id: string
  title: string
  date: string
  avgSales: number
  survivalRate: number
  desc: string
}

function ReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const districtId = searchParams.get("district") || "1123064" // 기본값: 강남
  const district =
    districtsData.find((d) => d.id === districtId) || districtsData[0]
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  const genderData = district.footTrafficGender.map((item, index) => ({
    ...item,
    fill: index === 0 ? "var(--chart-1)" : "var(--chart-2)",
  }))
  const ageData = district.footTrafficAge.map((item) => ({
    ...item,
    fill: item.percentage > 35 ? "var(--chart-1)" : "var(--chart-2)",
  }))

  const handleSaveReport = () => {
    const existingRaw = localStorage.getItem("g15_saved_reports")
    const reports: SavedReport[] = existingRaw ? JSON.parse(existingRaw) : []

    const isAlreadySaved = reports.some((report) => report.id === district.id)
    if (isAlreadySaved) {
      setSaveMessage("이미 마이페이지 보관함에 있습니다.")
      setTimeout(() => setSaveMessage(""), 2000)
      return
    }

    const newReport = {
      id: district.id,
      title: `${district.nameKo} 창업 분석 보고서`,
      date: new Date().toISOString().split("T")[0],
      avgSales: district.avgSales,
      survivalRate: district.survivalRate3Year,
      desc: district.desc,
    }

    reports.push(newReport)
    localStorage.setItem("g15_saved_reports", JSON.stringify(reports))
    setIsSaved(true)
    setSaveMessage("성공적으로 보관되었습니다!")
    setTimeout(() => setSaveMessage(""), 2000)
  }

  return (
    <div className="flex-1 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between text-xs font-medium">
          <button
            onClick={() => router.back()}
            className="flex cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            지도 탐색으로
          </button>

          <div className="relative flex items-center gap-2">
            {saveMessage && (
              <Badge
                variant="secondary"
                className="absolute -top-8 right-0 h-auto px-3 py-1.5"
              >
                {saveMessage}
              </Badge>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={handleSaveReport}
              className="gap-1.5"
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : ""}`}
              />
              <span>리포트 저장</span>
            </Button>

            <Button
              size="lg"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>PDF 출력 / 인쇄</span>
            </Button>
          </div>
        </div>

        <Card className="printable-sheet gap-8 p-10 sm:p-14">
          <div className="flex flex-col items-start justify-between gap-4 border-b-2 border-foreground pb-6 sm:flex-row sm:items-end">
            <div>
              <Badge variant="secondary" className="mb-3 px-3">
                종합 상권 보고서
              </Badge>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {district.nameKo} 상권 분석 결과서
              </h1>
            </div>
            <div className="text-right text-xs leading-relaxed text-muted-foreground">
              <div className="flex items-center justify-end gap-1 font-mono">
                <Calendar className="h-3.5 w-3.5" />
                <span>2026-06-16</span>
              </div>
              <div className="font-mono">
                NO: G15-R-{district.id.toUpperCase()}
              </div>
            </div>
          </div>

          <section>
            <h2 className="mb-3.5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">
              1. 상권 기본 정보
            </h2>
            <div className="rounded-lg bg-muted/40 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                본 정밀 분석 결과서는 서울특별시 주요 상업 지구인{" "}
                <strong className="text-foreground">{district.nameKo}</strong>를
                대상으로 집계되었습니다. {district.desc}이 지역의 평균 카드 결제
                매출액 규모는{" "}
                <strong className="text-foreground">
                  {district.avgSales.toLocaleString()}만원
                </strong>
                이며, 전년 동기 대비{" "}
                <strong className="text-foreground">
                  {district.yoySalesChange}%
                </strong>{" "}
                수준으로 건강한 성장율을 지속하고 있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3.5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">
              2. 상권 재무 안전지표
            </h2>
            <div className="grid gap-4 text-xs sm:grid-cols-3 sm:text-sm">
              <Card size="sm">
                <CardContent>
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">성장 추세</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {district.yoySalesChange > 0
                      ? "성장형 (Positive)"
                      : "정체형 (Stable)"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    평균 매출 증가치 {district.yoySalesChange}% 기록
                  </p>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardContent>
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="font-medium">매출 규모 등급</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {district.avgSales > 3500
                      ? "A 등급 (High Volume)"
                      : "B 등급 (Medium Volume)"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    월평균 {district.avgSales.toLocaleString()}만원 수준
                  </p>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardContent>
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-medium">F&B 3년 생존율</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {district.survivalRate3Year}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    일반 요식업 가맹점 기준
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-3.5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">
              3. 인구 통계 및 세대 비중
            </h2>
            <div className="grid items-center gap-8 rounded-lg bg-background p-6 ring-1 ring-foreground/10 sm:grid-cols-2">
              <div className="flex flex-col items-center">
                <h3 className="mb-2 text-xs font-medium text-foreground">
                  성별 유동 비율
                </h3>
                <ChartContainer
                  config={{
                    value: { label: "비중" },
                  }}
                  className="h-40 w-full"
                >
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`gender-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => `${name}: ${value}%`}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 flex gap-4 text-xs font-medium">
                  {genderData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.fill }}
                      ></span>
                      <span className="text-muted-foreground">
                        {item.name}:{" "}
                        <span className="font-medium text-foreground">
                          {item.value}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="mb-2 text-xs font-medium text-foreground">
                  세대별 분포 비중
                </h3>
                <ChartContainer
                  config={{
                    percentage: { label: "비중 (%)", color: "var(--chart-1)" },
                  }}
                  className="h-40 w-full"
                >
                  <BarChart data={ageData} margin={{ bottom: 5 }}>
                    <XAxis
                      dataKey="ageGroup"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${value}%`}
                          labelFormatter={(label) => `연령대: ${label}`}
                        />
                      }
                    />
                    <Bar dataKey="percentage" radius={4} name="비중 (%)">
                      {ageData.map((entry, index) => (
                        <Cell key={`age-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3.5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">
              4. 추천 입점 가맹사 시뮬레이션
            </h2>
            <div className="rounded-lg bg-background ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>가맹 브랜드명</TableHead>
                    <TableHead>업종 대분류</TableHead>
                    <TableHead>개설 자금 (만원)</TableHead>
                    <TableHead>상권 평점</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {district.recommendedFranchises.map((brand, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-foreground">
                        {brand.name}
                      </TableCell>
                      <TableCell>{brand.sector}</TableCell>
                      <TableCell className="font-mono">
                        {brand.minCapital.toLocaleString()}만원
                      </TableCell>
                      <TableCell className="font-mono font-medium text-primary">
                        ★ {brand.rating} / 5.0
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h2 className="mb-3.5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">
              5. AI 정밀 피드백 및 법률 특이사항
            </h2>
            <div>
              <Card size="sm" className="bg-primary/5">
                <CardContent className="text-xs">
                  <h4 className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    RAG 상가건물 임대차 계약 요율 안전선
                  </h4>
                  <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">
                        환산보증금 9억원 한도제한
                      </strong>
                      : 본 구역은 서울시에 소속되어 환산보증금 상한 한도액
                      9억원의 적용을 받습니다. 임대차 보증금 비율을 산정할 때
                      반드시 초과 여부를 계산하시어 계약 갱신 보호 권리에 차질이
                      없도록 조율하시기 바랍니다.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        권리금 보호장치
                      </strong>
                      : 계약 완료 6개월 전부터 신규 임차인 주선을 방해받지 않는
                      권리금 조회가 유효합니다.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        정책자금 융자 지원
                      </strong>
                      : 중소기업벤처부 소상공인진흥공단의 분기별 저금리 융자
                      자금은 신규 매장 개설 3개월 내 사업자등록 완료 시 승인율이
                      우수합니다.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        </Card>
      </div>
    </div>
  )
}

export function ReportScreen() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-muted/30 text-xs text-muted-foreground">
          보고서 작성 중...
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  )
}
