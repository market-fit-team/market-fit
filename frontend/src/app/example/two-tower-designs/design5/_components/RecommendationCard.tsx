"use client"

import React from "react"
import type { Recommendation } from "../_fixtures/result"

/** 지역 유형에 따른 한글 레이블 */
const AREA_TYPE_LABEL: Record<string, string> = {
  residential: "주거형",
  commercial: "상업형",
  mixed: "혼합형",
}

/** 지역 유형에 따른 색상 클래스 */
const AREA_TYPE_CLASS: Record<string, string> = {
  residential: "d5-area-tag--residential",
  commercial: "d5-area-tag--commercial",
  mixed: "d5-area-tag--mixed",
}

/** 금액을 억 단위로 포맷 */
function formatSalesAmount(amount: number): string {
  const uk = Math.round(amount / 100000000)
  return `${uk.toLocaleString()}억`
}

interface RecommendationCardProps {
  /** 추천 아이템 데이터 */
  item: Recommendation
  /** 애니메이션 딜레이 인덱스 */
  animIndex: number
}

/**
 * 개별 추천 지역 카드 컴포넌트
 * 순위, 지역명, 점수, 주요 지표를 시각적으로 표시한다
 */
export function RecommendationCard({
  item,
  animIndex,
}: RecommendationCardProps) {
  const areaTypeLabel =
    AREA_TYPE_LABEL[item.area_profile_type] ?? item.area_profile_type
  const areaTypeClass = AREA_TYPE_CLASS[item.area_profile_type] ?? ""
  const isTop = item.rank === 1

  return (
    <div
      className={`d5-rec-card ${isTop ? "d5-rec-card--top" : ""}`}
      style={{ animationDelay: `${animIndex * 80}ms` }}
    >
      {/* 순위 배지 */}
      <div className="d5-rec-rank">{isTop ? "🏆" : `#${item.rank}`}</div>

      {/* 지역명 + 업종 */}
      <div className="d5-rec-main">
        <h4 className="d5-rec-area">{item.area_name}</h4>
        <div className="d5-rec-tags">
          <span className={`d5-area-tag ${areaTypeClass}`}>
            {areaTypeLabel}
          </span>
          <span className="d5-category-tag">{item.service_category_name}</span>
        </div>
      </div>

      {/* 추천 점수 */}
      <div className="d5-rec-score-box">
        <span className="d5-rec-score-label">추천 점수</span>
        <span className="d5-rec-score-value">{item.score.toFixed(2)}</span>
      </div>

      {/* 세부 지표 그리드 */}
      <div className="d5-rec-metrics">
        <div className="d5-metric">
          <span className="d5-metric-label">월 추정 매출</span>
          <span className="d5-metric-value">
            {formatSalesAmount(item.sales_amount)}
          </span>
        </div>
        <div className="d5-metric">
          <span className="d5-metric-label">주말 매출 비중</span>
          <span className="d5-metric-value">
            {Math.round(item.weekend_sales_ratio * 100)}%
          </span>
        </div>
        <div className="d5-metric">
          <span className="d5-metric-label">저녁 매출 비중</span>
          <span className="d5-metric-value">
            {Math.round(item.evening_sales_ratio * 100)}%
          </span>
        </div>
        <div className="d5-metric">
          <span className="d5-metric-label">거주 인구</span>
          <span className="d5-metric-value">
            {item.resident_population.toLocaleString()}명
          </span>
        </div>
        <div className="d5-metric">
          <span className="d5-metric-label">직장 인구</span>
          <span className="d5-metric-value">
            {item.worker_population.toLocaleString()}명
          </span>
        </div>
        <div className="d5-metric">
          <span className="d5-metric-label">수요 공백 점수</span>
          <span className="d5-metric-value">
            {Math.round(item.demand_gap_score * 100)}점
          </span>
        </div>
      </div>

      {/* 기회 점수 바 */}
      <div className="d5-opportunity-bar-wrap">
        <span className="d5-opportunity-label">기회 점수</span>
        <div className="d5-opportunity-track">
          <div
            className="d5-opportunity-fill"
            style={{
              width: `${Math.round(item.category_opportunity_score * 100)}%`,
            }}
          />
        </div>
        <span className="d5-opportunity-pct">
          {Math.round(item.category_opportunity_score * 100)}%
        </span>
      </div>
    </div>
  )
}
