"use client"

import React, { useEffect, useState } from "react"
import { SurveyWizard } from "./_components/survey-wizard"

export default function Design7Page() {
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
            // 달 아이콘 (다크모드로 가기)
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
            // 해 아이콘 (라이트모드로 가기)
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

      {/* 메인 진단 영역 */}
      <main className="flex flex-grow items-center justify-center py-6">
        <SurveyWizard theme={theme} />
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
