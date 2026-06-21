"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Heart, RefreshCw, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { getDeterministicProfileAndPrediction } from "../_fixtures/mockData"
import { RadarChartVisualizer } from "./radar-chart-visualizer"
import { RecommendationList } from "./recommendation-list"

interface ResolvedProfileClientProps {
  profileCode: string
}

/**
 * 설문 결과 대시보드 메인 클라이언트 컴포넌트
 */
export function ResolvedProfileClient({
  profileCode,
}: ResolvedProfileClientProps) {
  // 결과 상태 객체 (UserProfile 및 RecommendationItem 포함)
  const [data, setData] = useState<ReturnType<
    typeof getDeterministicProfileAndPrediction
  > | null>(null)

  // URL 복사 성공 여부 피드백 상태
  const [copied, setCopied] = useState(false)

  // 로그인 회원 기준 저장 상태 (Mocking)
  const [saved, setSaved] = useState(false)
  const [saveTime, setSaveTime] = useState<string | null>(null)

  useEffect(() => {
    // 1. LocalStorage에서 임시 데이터 복원 시도
    const stored = localStorage.getItem(`two_tower_profile_${profileCode}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const timer = setTimeout(() => {
          setData(parsed)
        }, 0)
        return () => clearTimeout(timer)
      } catch (err) {
        console.error("Failed to parse stored profile", err)
      }
    }

    // 2. 저장된 값이 없을 경우 결정론적(deterministic) 해시 함수를 통해 임시 복구
    const deterministicData = getDeterministicProfileAndPrediction(profileCode)
    const timer = setTimeout(() => {
      setData(deterministicData)
    }, 0)
    return () => clearTimeout(timer)
  }, [profileCode])

  // 공유 링크 복사 처리
  const handleCopyUrl = async () => {
    if (typeof window === "undefined") return

    const shareUrl = `${window.location.origin}/example/two-tower-designs/design2/${profileCode}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("공유 링크가 클립보드에 복사되었습니다!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
      toast.error("링크 복사에 실패했습니다.")
    }
  }

  // 결과 저장 처리 (Mocking)
  const handleSaveResult = () => {
    setSaved(true)
    const nowStr = new Date().toISOString()
    setSaveTime(nowStr)

    // LocalStorage의 저장 일자 갱신 mock
    if (data) {
      const updated = {
        ...data,
        profile: {
          ...data.profile,
          auth_user_uuid: "123e4567-e89b-12d3-a456-426614174000",
          updated_at: nowStr,
        },
      }
      localStorage.setItem(
        `two_tower_profile_${profileCode}`,
        JSON.stringify(updated)
      )
    }

    toast.success("나의 창업 매칭 리포트에 저장되었습니다!")
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            진단 데이터 복원 중...
          </span>
        </div>
      </div>
    )
  }

  const { profile, prediction } = data
  const updatedDate = saveTime
    ? new Date(saveTime)
    : profile.updated_at
      ? new Date(profile.updated_at)
      : null

  return (
    <div className="relative z-10 mx-auto max-w-7xl space-y-8">
      {/* 프리미엄 리포트 메인 헤더 */}
      <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-slate-900/95 to-emerald-950/90 text-white shadow-2xl">
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <CardContent className="grid items-center gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 font-mono text-white"
              >
                Code: {profileCode}
              </Badge>
              <Badge className="border-0 bg-emerald-500/20 text-emerald-300">
                Two-Tower Match Report
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                창업 성향 진단 결과서
              </h1>
              <p className="max-w-2xl text-xs leading-relaxed text-white/70 sm:text-sm">
                입력하신 응답 데이터는 유저 타워 고차원 벡터로 인코딩되었으며,
                상권 임베딩과의 매칭을 통해 최적의 5대 상권을 도출했습니다. 본
                보고서는 고유 링크를 통해 언제든 재확인하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* 제어 컨트롤 영역 */}
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCopyUrl}
                className="h-11 flex-1 rounded-xl bg-white font-bold text-slate-900 hover:bg-white/90"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                {copied ? "복사됨!" : "링크 공유"}
              </Button>
              <Button
                type="button"
                onClick={handleSaveResult}
                disabled={saved}
                className={`h-11 flex-1 rounded-xl font-bold ${
                  saved
                    ? "border border-emerald-500/30 bg-emerald-600/30 text-emerald-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`}
                />
                {saved ? "저장 완료" : "내 보관함 저장"}
              </Button>
            </div>

            <div className="flex items-center justify-between px-1 pt-1 font-mono text-[11px] text-white/50">
              <span>보관 등급: DEMO ACCOUNT</span>
              <span>
                {updatedDate
                  ? `업데이트: ${updatedDate.toLocaleDateString("ko-KR")} ${updatedDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                  : "미저장 상태"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분석결과 & 매칭 랭킹 2컬럼 레이아웃 */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* 좌측: 성향 지표 차트 */}
        <div className="space-y-6">
          <RadarChartVisualizer userProfile={prediction.user_profile} />

          {/* 다시 검사하기 인포 배너 */}
          <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-0 bg-white/40 p-6 backdrop-blur-md sm:flex-nowrap dark:bg-slate-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                설문을 다시 작성하시겠습니까?
              </h4>
              <p className="text-xs leading-normal text-slate-500 dark:text-slate-400">
                새로운 가중치를 산출하여 다른 상권과의 어울림을 보고 싶으시면
                언제든 다시 시작할 수 있습니다.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-slate-300 font-semibold dark:border-slate-700"
            >
              <Link href="/example/two-tower-designs/design2">
                처음부터 다시 진단하기
              </Link>
            </Button>
          </Card>
        </div>

        {/* 우측: 상권 추천 랭킹 리스트 */}
        <div>
          <RecommendationList recommendations={prediction.recommendations} />
        </div>
      </div>
    </div>
  )
}
