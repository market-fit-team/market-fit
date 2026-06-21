"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { ProfileChart } from "../_components/ProfileChart"
import { RecommendationCard } from "../_components/RecommendationCard"
import { MOCK_PREVIEW_RESPONSE } from "../_fixtures/result"
import { CATEGORY_OPTIONS } from "../_fixtures/survey"

interface Design5ResPageProps {
  params: { res: string }
}

/**
 * Design 5 결과 페이지
 * profile_code 기반으로 목 데이터를 표시한다
 * 모델: Claude Sonnet 4.6 (Thinking)
 */
export default function Design5ResPage({ params }: Design5ResPageProps) {
  const { profile, prediction } = MOCK_PREVIEW_RESPONSE
  const [copied, setCopied] = useState(false)

  /** 공유 URL 복사 */
  const handleCopyShare = () => {
    const shareUrl = `${window.location.origin}/example/two-tower-designs/design5/${profile.profile_code}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  /** 선택된 업종명 조회 */
  const categoryInfo = CATEGORY_OPTIONS.find(
    (c) => c.code === profile.user_profile.preferred_category_code
  )

  return (
    <div className="d5-root">
      {/* 배경 장식 */}
      <div className="d5-bg-orb d5-bg-orb--1" aria-hidden="true" />
      <div className="d5-bg-orb d5-bg-orb--2" aria-hidden="true" />
      <div className="d5-bg-orb d5-bg-orb--3" aria-hidden="true" />
      <div className="d5-bg-grid" aria-hidden="true" />

      <main className="d5-main">
        {/* 헤더 */}
        <header className="d5-header">
          <div className="d5-logo-mark">⬡</div>
          <div className="d5-header-text">
            <h1 className="d5-title">분석 완료</h1>
            <p className="d5-subtitle">AI Two-Tower 상권 추천 결과</p>
          </div>
          <Link href="/example/two-tower-designs/design5">
            <Button
              id="d5-btn-retry"
              variant="outline"
              className="d5-btn-retry"
            >
              재응답
            </Button>
          </Link>
        </header>

        {/* ── 결과 요약 카드 ── */}
        <div className="d5-card d5-result-hero">
          <div className="d5-card-glow" aria-hidden="true" />
          <div className="d5-result-hero-inner">
            <div className="d5-result-icon">🎯</div>
            <div>
              <h2 className="d5-result-hero-title">
                {categoryInfo?.label ?? "업종"} 창업을 위한
                <br />
                최적 상권 {prediction.recommendations.length}곳을 찾았어요
              </h2>
              <div className="d5-result-meta">
                <span className="d5-meta-chip">
                  {categoryInfo?.emoji} {categoryInfo?.label}
                </span>
                <span className="d5-meta-chip">
                  코드 {profile.profile_code}
                </span>
              </div>
            </div>
          </div>

          {/* 공유 버튼 */}
          <button
            id="d5-btn-share"
            className="d5-share-btn"
            onClick={handleCopyShare}
            aria-label="결과 링크 복사"
          >
            {copied ? "✓ 복사됨!" : "🔗 결과 공유"}
          </button>
        </div>

        {/* ── 성향 프로필 차트 ── */}
        <div className="d5-card">
          <div className="d5-card-glow" aria-hidden="true" />
          <ProfileChart profile={profile.user_profile} />
        </div>

        {/* ── 추천 지역 목록 ── */}
        <section className="d5-recommendations">
          <h3 className="d5-section-title d5-rec-section-title">
            🏘️ 추천 상권 TOP {prediction.recommendations.length}
          </h3>
          <div className="d5-rec-list">
            {prediction.recommendations.map((item, idx) => (
              <RecommendationCard
                key={item.item_id}
                item={item}
                animIndex={idx}
              />
            ))}
          </div>
        </section>

        {/* ── 푸터 안내 ── */}
        <div className="d5-card d5-footer-info">
          <div className="d5-card-glow" aria-hidden="true" />
          <p className="d5-footer-text">
            결과는 Two-Tower 추천 모델 기반으로 생성됩니다. 실제 창업 결정 전
            현장 조사를 병행하시길 권장드립니다.
          </p>
          <div className="d5-footer-model">
            <span>Design 5 · Claude Sonnet 4.6 (Thinking)</span>
          </div>
        </div>
      </main>

      <style>{`
        /* ═══════════════════════════════════════
           Design 5 결과 페이지 — Dark Neon Glassmorphism
           모델: Claude Sonnet 4.6 (Thinking)
        ═══════════════════════════════════════ */
        :root {
          --d5-accent-primary: #a78bfa;
          --d5-accent-secondary: #38bdf8;
          --d5-accent-tertiary: #34d399;
          --d5-accent-warm: #fb923c;
          --d5-bg: #07071a;
          --d5-surface: rgba(255,255,255,0.04);
          --d5-border: rgba(255,255,255,0.08);
          --d5-border-active: rgba(167,139,250,0.5);
          --d5-text-primary: #f0f0ff;
          --d5-text-secondary: #9090b0;
          --d5-text-muted: #5a5a7a;
        }
        .d5-root {
          min-height: 100vh;
          background: var(--d5-bg);
          font-family: 'Inter', 'Pretendard', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .d5-bg-orb {
          position: fixed; border-radius: 50%;
          filter: blur(80px); pointer-events: none; z-index: 0;
        }
        .d5-bg-orb--1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%);
          top: -100px; left: -100px;
        }
        .d5-bg-orb--2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%);
          bottom: -80px; right: -80px;
        }
        .d5-bg-orb--3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
        }
        .d5-bg-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none; z-index: 0;
        }
        .d5-main {
          position: relative; z-index: 1;
          max-width: 560px; margin: 0 auto;
          padding: 24px 16px 40px;
          min-height: 100vh;
          display: flex; flex-direction: column; gap: 14px;
        }
        .d5-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; backdrop-filter: blur(20px);
        }
        .d5-logo-mark {
          font-size: 26px;
          background: linear-gradient(135deg, var(--d5-accent-primary), var(--d5-accent-secondary));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1;
        }
        .d5-header-text { flex: 1; }
        .d5-title { font-size: 17px; font-weight: 700; color: var(--d5-text-primary); margin: 0; }
        .d5-subtitle { font-size: 11px; color: var(--d5-text-secondary); margin: 2px 0 0; }
        .d5-btn-retry {
          font-size: 12px !important; height: 30px !important;
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: var(--d5-text-secondary) !important;
          border-radius: 8px !important; white-space: nowrap;
        }

        /* 카드 */
        .d5-card {
          position: relative;
          background: var(--d5-surface);
          border: 1px solid var(--d5-border);
          border-radius: 18px; padding: 18px 18px;
          backdrop-filter: blur(20px); overflow: hidden;
        }
        .d5-card-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(167,139,250,0.4) 20%, rgba(56,189,248,0.4) 80%, transparent);
        }

        /* 결과 히어로 */
        .d5-result-hero { display: flex; flex-direction: column; gap: 14px; }
        .d5-result-hero-inner { display: flex; align-items: flex-start; gap: 14px; }
        .d5-result-icon { font-size: 38px; flex-shrink: 0; animation: d5-bounce 2s ease-in-out infinite; }
        @keyframes d5-bounce {
          0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); }
        }
        .d5-result-hero-title {
          font-size: 17px; font-weight: 700;
          color: var(--d5-text-primary); margin: 0 0 10px; line-height: 1.4;
        }
        .d5-result-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .d5-meta-chip {
          font-size: 11px; padding: 3px 10px; border-radius: 20px;
          background: rgba(255,255,255,0.06); border: 1px solid var(--d5-border);
          color: var(--d5-text-secondary);
        }
        .d5-share-btn {
          padding: 10px 14px; border-radius: 10px;
          background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.3);
          color: var(--d5-accent-primary); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease; width: 100%;
        }
        .d5-share-btn:hover { background: rgba(167,139,250,0.2); }

        /* ProfileChart */
        .d5-profile-chart { display: flex; flex-direction: column; gap: 14px; }
        .d5-section-title { font-size: 14px; font-weight: 700; color: var(--d5-text-primary); margin: 0; }
        .d5-bars-container { display: flex; flex-direction: column; gap: 8px; }
        .d5-bar-row { display: flex; flex-direction: column; gap: 3px; }
        .d5-bar-label-row { display: flex; justify-content: space-between; }
        .d5-bar-label { font-size: 11px; color: var(--d5-text-secondary); }
        .d5-bar-value { font-size: 11px; font-weight: 700; color: var(--d5-text-primary); }
        .d5-bar-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
        .d5-bar-fill { height: 100%; border-radius: 100px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

        /* 추천 목록 */
        .d5-recommendations { display: flex; flex-direction: column; gap: 10px; }
        .d5-rec-section-title { color: var(--d5-text-primary); }
        .d5-rec-list { display: flex; flex-direction: column; gap: 10px; }

        /* 추천 카드 */
        .d5-rec-card {
          background: var(--d5-surface); border: 1px solid var(--d5-border);
          border-radius: 14px; padding: 16px 16px 12px;
          display: flex; flex-direction: column; gap: 10px;
          animation: d5-fade-up 0.4s ease both;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .d5-rec-card:hover { border-color: rgba(167,139,250,0.3); box-shadow: 0 4px 20px rgba(167,139,250,0.08); }
        .d5-rec-card--top { border-color: rgba(167,139,250,0.4); background: rgba(167,139,250,0.06); }
        @keyframes d5-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .d5-rec-rank { font-size: 18px; line-height: 1; }
        .d5-rec-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .d5-rec-area { font-size: 17px; font-weight: 700; color: var(--d5-text-primary); margin: 0; }
        .d5-rec-tags { display: flex; gap: 5px; flex-wrap: wrap; }
        .d5-area-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
        .d5-area-tag--residential { background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); color: var(--d5-accent-tertiary); }
        .d5-area-tag--commercial { background: rgba(251,146,60,0.15); border: 1px solid rgba(251,146,60,0.3); color: var(--d5-accent-warm); }
        .d5-area-tag--mixed { background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: var(--d5-accent-secondary); }
        .d5-category-tag { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid var(--d5-border); color: var(--d5-text-secondary); }
        .d5-rec-score-box {
          display: flex; align-items: baseline; gap: 6px; padding: 7px 12px;
          background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.15); border-radius: 10px;
        }
        .d5-rec-score-label { font-size: 11px; color: var(--d5-text-secondary); }
        .d5-rec-score-value {
          font-size: 19px; font-weight: 800;
          background: linear-gradient(135deg, var(--d5-accent-primary), var(--d5-accent-secondary));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .d5-rec-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .d5-metric { display: flex; flex-direction: column; gap: 2px; }
        .d5-metric-label { font-size: 10px; color: var(--d5-text-muted); }
        .d5-metric-value { font-size: 12px; font-weight: 600; color: var(--d5-text-primary); }
        .d5-opportunity-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .d5-opportunity-label { font-size: 11px; color: var(--d5-text-secondary); white-space: nowrap; }
        .d5-opportunity-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
        .d5-opportunity-fill { height: 100%; background: linear-gradient(90deg, var(--d5-accent-secondary), var(--d5-accent-tertiary)); border-radius: 100px; }
        .d5-opportunity-pct { font-size: 11px; font-weight: 700; color: var(--d5-accent-secondary); white-space: nowrap; }

        /* 푸터 */
        .d5-footer-info { display: flex; flex-direction: column; gap: 5px; }
        .d5-footer-text { font-size: 11px; color: var(--d5-text-muted); line-height: 1.6; margin: 0; }
        .d5-footer-model { font-size: 10px; color: var(--d5-text-muted); text-align: right; font-family: monospace; }
      `}</style>
    </div>
  )
}
