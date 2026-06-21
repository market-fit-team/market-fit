import React from "react"
import { SurveyWizard } from "./_components/survey-wizard"

export const metadata = {
  title: "창업 성향 진단 - Design 6",
  description:
    "투타워 추천 알고리즘 모델을 활용한 서울 상권 매칭 및 성향 분석 서비스",
}

export default function Design6Page() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 py-12 text-slate-100">
      {/* 백그라운드 대각선 선형 그라데이션 광원 */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex flex-grow items-center justify-center">
        <SurveyWizard />
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
