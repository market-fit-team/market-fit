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
  const [theme, setTheme] = useState<"light" | "dark">("light")

  // 시스템의 기본 다크모드 선호 여부 감지 및 적용
  useEffect(() => {
    if (typeof window !== "undefined") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      void Promise.resolve().then(() => {
        setTheme(systemPrefersDark ? "dark" : "light")
      })
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

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
    <div
      className={`${theme} flex min-h-screen flex-col justify-between bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50`}
    >
      {/* 상단 미니멀 바 (테마 토글러 포함) */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-800/40">
        <span className="text-[11px] font-black tracking-wider text-zinc-800 uppercase dark:text-zinc-200">
          Two-Tower Portal
        </span>

        {/* 미니멀 테마 스위처 */}
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-zinc-200 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          aria-label={
            theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"
          }
        >
          {theme === "light" ? (
            // 달 아이콘
            <svg
              className="size-4 text-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            // 해 아이콘
            <svg
              className="size-4 text-zinc-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"
              />
            </svg>
          )}
        </button>
      </header>

      {/* 메인 결과 영역 */}
      <main className="flex flex-grow items-center justify-center py-6">
        {loading ? (
          <div className="space-y-3 text-center">
            {/* 미니멀 회전 스피너 */}
            <div className="relative mx-auto flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-zinc-200 dark:border-zinc-800" />
              <div className="absolute inset-0 animate-spin rounded-full border-t border-zinc-900 dark:border-zinc-100" />
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
              분석 데이터 복원 중...
            </p>
          </div>
        ) : resultData ? (
          <ResultDetails data={resultData} theme={theme} />
        ) : (
          <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-none dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
              결과 분석 실패
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              결과 코드를 조회할 수 없습니다.
            </p>
          </div>
        )}
      </main>

      {/* 푸터 영역 */}
      <footer className="mx-auto w-full max-w-4xl border-t border-zinc-200/50 px-6 py-4 text-center text-[10px] text-zinc-400 dark:border-zinc-800/40 dark:text-zinc-600">
        <p>
          © 2026 창업 매칭 서비스. All rights reserved. (Design 7 / Gemini 3.5
          Flash)
        </p>
      </footer>
    </div>
  )
}
