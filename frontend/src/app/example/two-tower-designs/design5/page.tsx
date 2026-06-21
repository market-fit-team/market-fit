"use client"

import React, { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { CategorySelector } from "./_components/CategorySelector"
import { QuestionCard } from "./_components/QuestionCard"
import { MOCK_PREVIEW_RESPONSE } from "./_fixtures/result"
import { CATEGORY_OPTIONS, SURVEY_QUESTIONS } from "./_fixtures/survey"

/**
 * Design 5 설문 메인 페이지
 * 다크 글래스모피즘 테마, 카드 1장씩 슬라이드 방식 설문 진행
 * 모델: Claude Sonnet 4.6 (Thinking)
 */
export default function Design5Page() {
  const router = useRouter()

  /** 업종 선택 코드 */
  const [categoryCode, setCategoryCode] = useState<string>("CS100005")
  /** 각 질문 ID별 선택 값 배열 */
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  /** 현재 화면 단계: category → survey → loading */
  const [step, setStep] = useState<"category" | "survey" | "loading">(
    "category"
  )
  /** 현재 질문 인덱스 */
  const [questionIndex, setQuestionIndex] = useState(0)
  /** 슬라이드 방향 애니메이션 클래스 */
  const [slideClass, setSlideClass] = useState("d5-slide-in")

  const currentQuestion = SURVEY_QUESTIONS[questionIndex]
  const currentAnswers = answers[currentQuestion?.id] ?? []
  const isLastQuestion = questionIndex === SURVEY_QUESTIONS.length - 1
  const totalQuestions = SURVEY_QUESTIONS.length

  /** 현재 질문에 대한 선택 변경 */
  const handleAnswerChange = useCallback(
    (values: string[]) => {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: values,
      }))
    },
    [currentQuestion]
  )

  /** 다음 질문으로 이동 */
  const handleNext = () => {
    setSlideClass("d5-slide-out-left")
    setTimeout(() => {
      setQuestionIndex((i) => i + 1)
      setSlideClass("d5-slide-in-right")
      setTimeout(() => setSlideClass("d5-slide-in"), 50)
    }, 250)
  }

  /** 이전 질문으로 이동 */
  const handlePrev = () => {
    setSlideClass("d5-slide-out-right")
    setTimeout(() => {
      setQuestionIndex((i) => i - 1)
      setSlideClass("d5-slide-in-left")
      setTimeout(() => setSlideClass("d5-slide-in"), 50)
    }, 250)
  }

  /** 설문 제출 — 목 데이터로 결과 페이지 이동 */
  const handleSubmit = () => {
    setStep("loading")
    // 실제 API 대신 목 데이터로 1.5초 후 결과 페이지로 이동
    setTimeout(() => {
      // profile_code를 쿼리 파라미터로 전달
      router.push(
        `/example/two-tower-designs/design5/${MOCK_PREVIEW_RESPONSE.profile.profile_code}`
      )
    }, 1800)
  }

  /** 업종 선택 완료 후 설문 시작 */
  const handleStartSurvey = () => {
    setStep("survey")
  }

  /** 진행률 계산 (%) */
  const progressPct = Math.round((questionIndex / totalQuestions) * 100)

  /** 현재 질문에 답변이 있는지 */
  const hasAnswer = currentAnswers.length > 0

  return (
    <div className="d5-root">
      {/* 배경 장식 요소 */}
      <div className="d5-bg-orb d5-bg-orb--1" aria-hidden="true" />
      <div className="d5-bg-orb d5-bg-orb--2" aria-hidden="true" />
      <div className="d5-bg-orb d5-bg-orb--3" aria-hidden="true" />
      <div className="d5-bg-grid" aria-hidden="true" />

      <main className="d5-main">
        {/* 헤더 */}
        <header className="d5-header">
          <div className="d5-logo-mark">⬡</div>
          <div className="d5-header-text">
            <h1 className="d5-title">창업 성향 분석</h1>
            <p className="d5-subtitle">AI Two-Tower 모델 기반 상권 추천</p>
          </div>
          <div className="d5-model-badge">Claude Sonnet 4.6</div>
        </header>

        {/* 단계별 콘텐츠 */}
        <div className="d5-content">
          {/* ─── 업종 선택 단계 ─── */}
          {step === "category" && (
            <div className="d5-card d5-category-step">
              <div className="d5-card-glow" aria-hidden="true" />
              <div className="d5-step-intro">
                <span className="d5-step-badge">STEP 1</span>
                <h2 className="d5-step-title">업종을 선택하세요</h2>
                <p className="d5-step-desc">
                  어떤 업종으로 창업하실 예정인가요?
                  <br />
                  선택 후 10가지 창업 성향 질문에 답해 주세요.
                </p>
              </div>

              <CategorySelector
                value={categoryCode}
                onChange={setCategoryCode}
              />

              {/* 선택된 업종 미리보기 */}
              <div className="d5-selected-category">
                {(() => {
                  const cat = CATEGORY_OPTIONS.find(
                    (c) => c.code === categoryCode
                  )
                  return cat ? (
                    <div className="d5-selected-cat-inner">
                      <span className="d5-selected-emoji">{cat.emoji}</span>
                      <div>
                        <p className="d5-selected-name">{cat.label}</p>
                        <p className="d5-selected-code">{cat.code}</p>
                      </div>
                    </div>
                  ) : null
                })()}
              </div>

              <Button
                id="d5-btn-start"
                className="d5-btn-primary"
                onClick={handleStartSurvey}
              >
                설문 시작하기 →
              </Button>
            </div>
          )}

          {/* ─── 설문 단계 ─── */}
          {step === "survey" && (
            <div className="d5-survey-layout">
              {/* 진행률 바 */}
              <div
                className="d5-progress-wrap"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="d5-progress-header">
                  <span className="d5-progress-text">
                    {questionIndex + 1} / {totalQuestions}
                  </span>
                  <span className="d5-progress-pct">{progressPct}%</span>
                </div>
                <div className="d5-progress-track">
                  <div
                    className="d5-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* 질문 카드 슬라이드 영역 */}
              <div className="d5-slide-viewport">
                <div className={`d5-slide-wrapper ${slideClass}`}>
                  <div className="d5-card">
                    <div className="d5-card-glow" aria-hidden="true" />
                    <QuestionCard
                      question={currentQuestion}
                      selectedValues={currentAnswers}
                      onChange={handleAnswerChange}
                      totalCount={totalQuestions}
                      currentIndex={questionIndex}
                    />
                  </div>
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <div className="d5-nav-btns">
                <Button
                  id="d5-btn-prev"
                  variant="outline"
                  className="d5-btn-prev"
                  onClick={handlePrev}
                  disabled={questionIndex === 0}
                >
                  ← 이전
                </Button>

                {isLastQuestion ? (
                  <Button
                    id="d5-btn-submit"
                    className="d5-btn-submit"
                    onClick={handleSubmit}
                    disabled={!hasAnswer}
                  >
                    분석 결과 보기 ✨
                  </Button>
                ) : (
                  <Button
                    id="d5-btn-next"
                    className="d5-btn-next"
                    onClick={handleNext}
                    disabled={!hasAnswer}
                  >
                    다음 →
                  </Button>
                )}
              </div>

              {/* 답변 완료 현황 */}
              <div className="d5-answer-dots" aria-label="답변 현황">
                {SURVEY_QUESTIONS.map((q, i) => {
                  const isDone = (answers[q.id]?.length ?? 0) > 0
                  const isCurrent = i === questionIndex
                  return (
                    <span
                      key={q.id}
                      className={`d5-dot ${isDone ? "d5-dot--done" : ""} ${isCurrent ? "d5-dot--current" : ""}`}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── 로딩 단계 ─── */}
          {step === "loading" && (
            <div className="d5-card d5-loading-step">
              <div className="d5-card-glow" aria-hidden="true" />
              <div className="d5-loading-inner">
                <div className="d5-loading-spinner" aria-label="분석 중" />
                <h2 className="d5-loading-title">AI가 분석 중입니다</h2>
                <p className="d5-loading-desc">
                  Two-Tower 모델이 창업 성향을 벡터화하고
                  <br />
                  최적 상권을 매칭하고 있어요...
                </p>
                <div className="d5-loading-steps">
                  <span className="d5-loading-step d5-loading-step--done">
                    ✓ 응답 수집 완료
                  </span>
                  <span className="d5-loading-step d5-loading-step--done">
                    ✓ 프로필 벡터화
                  </span>
                  <span className="d5-loading-step d5-loading-step--active">
                    ⟳ 상권 매칭 중...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 디자인 5 전용 스타일 */}
      <style>{`
        /* ═══════════════════════════════════════
           Design 5 — Dark Neon Glassmorphism
           모델: Claude Sonnet 4.6 (Thinking)
        ═══════════════════════════════════════ */

        :root {
          --d5-accent-primary: #a78bfa;
          --d5-accent-secondary: #38bdf8;
          --d5-accent-tertiary: #34d399;
          --d5-accent-warm: #fb923c;
          --d5-bg: #07071a;
          --d5-surface: rgba(255,255,255,0.04);
          --d5-surface-hover: rgba(255,255,255,0.07);
          --d5-border: rgba(255,255,255,0.08);
          --d5-border-active: rgba(167,139,250,0.5);
          --d5-text-primary: #f0f0ff;
          --d5-text-secondary: #9090b0;
          --d5-text-muted: #5a5a7a;
        }

        /* ── 루트 레이아웃 ── */
        .d5-root {
          min-height: 100vh;
          background: var(--d5-bg);
          font-family: 'Inter', 'Pretendard', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* ── 배경 구슬 오브 ── */
        .d5-bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .d5-bg-orb--1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: d5-orb-float 12s ease-in-out infinite;
        }
        .d5-bg-orb--2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: d5-orb-float 15s ease-in-out infinite reverse;
        }
        .d5-bg-orb--3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: d5-orb-pulse 8s ease-in-out infinite;
        }
        .d5-bg-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes d5-orb-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes d5-orb-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        }

        /* ── 메인 컨테이너 ── */
        .d5-main {
          position: relative;
          z-index: 1;
          max-width: 560px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ── 헤더 ── */
        .d5-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: var(--d5-surface);
          border: 1px solid var(--d5-border);
          border-radius: 16px;
          backdrop-filter: blur(20px);
        }
        .d5-logo-mark {
          font-size: 28px;
          background: linear-gradient(135deg, var(--d5-accent-primary), var(--d5-accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .d5-header-text { flex: 1; }
        .d5-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--d5-text-primary);
          margin: 0;
          line-height: 1.2;
        }
        .d5-subtitle {
          font-size: 11px;
          color: var(--d5-text-secondary);
          margin: 2px 0 0;
        }
        .d5-model-badge {
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(167,139,250,0.2), rgba(56,189,248,0.2));
          border: 1px solid rgba(167,139,250,0.3);
          color: var(--d5-accent-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── 콘텐츠 영역 ── */
        .d5-content { flex: 1; }

        /* ── 글래스 카드 ── */
        .d5-card {
          position: relative;
          background: var(--d5-surface);
          border: 1px solid var(--d5-border);
          border-radius: 20px;
          padding: 28px 24px;
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .d5-card-glow {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(167,139,250,0.4) 20%,
            rgba(56,189,248,0.4) 80%,
            transparent
          );
        }

        /* ── STEP 배지 & 업종 선택 ── */
        .d5-category-step {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .d5-step-intro { display: flex; flex-direction: column; gap: 6px; }
        .d5-step-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--d5-accent-primary);
          text-transform: uppercase;
        }
        .d5-step-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--d5-text-primary);
          margin: 0;
        }
        .d5-step-desc {
          font-size: 13px;
          color: var(--d5-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* ── CategorySelector 내부 ── */
        .d5-category-selector { display: flex; flex-direction: column; gap: 8px; }
        .d5-category-label {
          font-size: 12px;
          color: var(--d5-text-secondary);
          margin: 0;
        }
        .d5-select-trigger {
          width: 100% !important;
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid var(--d5-border) !important;
          color: var(--d5-text-primary) !important;
          border-radius: 10px !important;
          height: 44px !important;
          font-size: 14px !important;
        }
        .d5-select-item-inner {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── 선택된 업종 미리보기 ── */
        .d5-selected-category {
          background: rgba(167,139,250,0.08);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .d5-selected-cat-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .d5-selected-emoji { font-size: 32px; }
        .d5-selected-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--d5-text-primary);
          margin: 0;
        }
        .d5-selected-code {
          font-size: 11px;
          color: var(--d5-text-muted);
          margin: 2px 0 0;
          font-family: monospace;
        }

        /* ── 기본 버튼 ── */
        .d5-btn-primary {
          width: 100%;
          height: 48px !important;
          background: linear-gradient(135deg, var(--d5-accent-primary), var(--d5-accent-secondary)) !important;
          color: white !important;
          border-radius: 12px !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          border: none !important;
          transition: all 0.2s ease !important;
          cursor: pointer;
        }
        .d5-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(167,139,250,0.3);
        }

        /* ── 설문 레이아웃 ── */
        .d5-survey-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── 진행률 바 ── */
        .d5-progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .d5-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .d5-progress-text {
          font-size: 12px;
          color: var(--d5-text-secondary);
          font-weight: 600;
        }
        .d5-progress-pct {
          font-size: 12px;
          color: var(--d5-accent-primary);
          font-weight: 700;
        }
        .d5-progress-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 100px;
          overflow: hidden;
        }
        .d5-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--d5-accent-primary), var(--d5-accent-secondary));
          border-radius: 100px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── 슬라이드 뷰포트 ── */
        .d5-slide-viewport { overflow: hidden; }
        .d5-slide-wrapper {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .d5-slide-in { opacity: 1; transform: translateX(0); }
        .d5-slide-out-left { opacity: 0; transform: translateX(-30px); }
        .d5-slide-out-right { opacity: 0; transform: translateX(30px); }
        .d5-slide-in-right { opacity: 0; transform: translateX(30px); }
        .d5-slide-in-left { opacity: 0; transform: translateX(-30px); }

        /* ── QuestionCard 내부 ── */
        .d5-question-card { display: flex; flex-direction: column; gap: 18px; }
        .d5-question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .d5-question-number {
          font-size: 13px;
          font-weight: 700;
          color: var(--d5-accent-primary);
        }
        .d5-question-total {
          font-weight: 400;
          color: var(--d5-text-muted);
        }
        .d5-multi-badge {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 20px;
          background: rgba(56,189,248,0.15);
          border: 1px solid rgba(56,189,248,0.3);
          color: var(--d5-accent-secondary);
        }
        .d5-question-prompt {
          font-size: 17px;
          font-weight: 600;
          color: var(--d5-text-primary);
          line-height: 1.5;
          margin: 0;
        }
        .d5-options-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .d5-option-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--d5-border);
          background: rgba(255,255,255,0.03);
          color: var(--d5-text-primary);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          font-size: 14px;
          line-height: 1.4;
        }
        .d5-option-btn:hover {
          background: rgba(167,139,250,0.08);
          border-color: rgba(167,139,250,0.3);
        }
        .d5-option-btn--selected {
          background: rgba(167,139,250,0.15) !important;
          border-color: var(--d5-border-active) !important;
          box-shadow: 0 0 0 1px rgba(167,139,250,0.2);
        }
        .d5-option-code {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--d5-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--d5-accent-primary);
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .d5-option-btn--selected .d5-option-code {
          background: var(--d5-accent-primary);
          color: white;
          border-color: var(--d5-accent-primary);
        }
        .d5-option-label { flex: 1; }
        .d5-option-check {
          color: var(--d5-accent-primary);
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        /* ── 네비게이션 버튼 ── */
        .d5-nav-btns {
          display: flex;
          gap: 10px;
        }
        .d5-btn-prev {
          flex: 0 0 auto;
          min-width: 90px;
          height: 44px !important;
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid var(--d5-border) !important;
          color: var(--d5-text-secondary) !important;
          border-radius: 10px !important;
          font-size: 13px !important;
        }
        .d5-btn-next, .d5-btn-submit {
          flex: 1;
          height: 44px !important;
          background: linear-gradient(135deg, var(--d5-accent-primary), var(--d5-accent-secondary)) !important;
          color: white !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          border: none !important;
          transition: all 0.2s ease !important;
          opacity: 1;
        }
        .d5-btn-next:disabled, .d5-btn-submit:disabled {
          opacity: 0.3 !important;
        }
        .d5-btn-submit {
          background: linear-gradient(135deg, #a78bfa, #34d399) !important;
        }

        /* ── 답변 도트 ── */
        .d5-answer-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .d5-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }
        .d5-dot--done {
          background: var(--d5-accent-tertiary);
        }
        .d5-dot--current {
          background: var(--d5-accent-primary);
          transform: scale(1.4);
        }

        /* ── 로딩 화면 ── */
        .d5-loading-step {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
        }
        .d5-loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }
        .d5-loading-spinner {
          width: 56px;
          height: 56px;
          border: 3px solid rgba(167,139,250,0.2);
          border-top-color: var(--d5-accent-primary);
          border-radius: 50%;
          animation: d5-spin 0.8s linear infinite;
        }
        @keyframes d5-spin {
          to { transform: rotate(360deg); }
        }
        .d5-loading-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--d5-text-primary);
          margin: 0;
        }
        .d5-loading-desc {
          font-size: 13px;
          color: var(--d5-text-secondary);
          line-height: 1.6;
          margin: 0;
        }
        .d5-loading-steps {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }
        .d5-loading-step {
          font-size: 12px;
          color: var(--d5-text-muted);
        }
        .d5-loading-step--done { color: var(--d5-accent-tertiary); }
        .d5-loading-step--active {
          color: var(--d5-accent-primary);
          animation: d5-blink 1.2s ease-in-out infinite;
        }
        @keyframes d5-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
