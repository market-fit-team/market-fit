"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ResultDetails } from "../_components/result-details"
import {
  type FullSurveyResult,
  getDeterministicResultFromCode,
} from "../_fixtures/mockData"

export default function ResultPage() {
  const params = useParams()
  const resCode = params?.res as string // dynamic route 폴더명 [res]에 의해 매핑되는 파라미터

  const [resultData, setResultData] = useState<FullSurveyResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!resCode) return

    const loadData = () => {
      // 1. LocalStorage에서 해당 profile_code의 결과 조회
      const savedResult = localStorage.getItem(`survey_res_${resCode}`)

      if (savedResult) {
        try {
          const parsed = JSON.parse(savedResult) as FullSurveyResult
          setResultData(parsed)
        } catch (err) {
          console.error("저장된 데이터 파싱 중 오류 발생: ", err)
          // 파싱 오류 발생 시 결정론적 모의 데이터 폴백 적용
          setResultData(getDeterministicResultFromCode(resCode))
        }
      } else {
        // 2. LocalStorage에 없을 시 (공유 링크를 직접 타고 들어온 외부 사용자 flow)
        // 코드를 기반으로 항상 일관된 결과를 보여주는 결정론적 데이터셋 발급
        const fallbackData = getDeterministicResultFromCode(resCode)
        setResultData(fallbackData)

        // 다음 번 조회를 위해 로컬스토리지에 캐시
        localStorage.setItem(
          `survey_res_${resCode}`,
          JSON.stringify(fallbackData)
        )
      }
      setLoading(false)
    }

    // 동기식 상태 변경 경고 방지를 위해 마이크로태스크로 실행 예약
    void Promise.resolve().then(loadData)
  }, [resCode])

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 py-12 text-slate-100">
      {/* 백그라운드 대각선 선형 그라데이션 광원 */}
      <div className="pointer-events-none absolute top-0 left-1/3 h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/3 bottom-0 h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[140px]" />

      {/* 메인 결과 영역 */}
      <main className="flex flex-grow items-center justify-center">
        {loading ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-violet-500"></div>
            <p className="text-sm text-slate-400">
              결과 분석 보고서 로딩 중...
            </p>
          </div>
        ) : resultData ? (
          <ResultDetails data={resultData} />
        ) : (
          <div className="mx-auto max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-lg font-bold text-slate-200">
              올바르지 않은 접근입니다.
            </h2>
            <p className="text-xs text-slate-500">
              결과 코드가 누락되었거나 찾을 수 없습니다.
            </p>
          </div>
        )}
      </main>

      {/* 푸터 영역 */}
      <footer className="mt-8 text-center text-xs text-slate-600">
        <p>
          © 2026 창업 매칭 서비스. All rights reserved. (Design 6 / Gemini 3.5
          Flash)
        </p>
      </footer>
    </div>
  )
}
