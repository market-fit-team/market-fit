"use client"

/**
 * 사용자 프로필 레이더 차트 컴포넌트
 * SVG 기반으로 사용자의 창업 성향을 시각화한다.
 * 외부 차트 라이브러리 없이 순수 SVG로 구현.
 */

/** 차트에 표시할 수치 목록 */
const METRICS = [
  { key: "stability_level", label: "안정성" },
  { key: "resident_focus_level", label: "주민 집중" },
  { key: "weekend_preference_level", label: "주말 선호" },
  { key: "rent_sensitivity_level", label: "임대 민감" },
  { key: "evening_preference_level", label: "저녁 선호" },
  { key: "competition_tolerance_level", label: "경쟁 수용" },
  { key: "budget_level", label: "예산" },
  { key: "subway_dependency_level", label: "역세권" },
] as const

interface ProfileRadarProps {
  /** 프로필 수치 (0~1 사이 값) */
  profile: Record<string, number>
}

export function ProfileRadar({ profile }: ProfileRadarProps) {
  const cx = 140
  const cy = 140
  const maxR = 100
  const levels = 4
  const count = METRICS.length
  const angleStep = (2 * Math.PI) / count

  /** 각도별 좌표 계산 */
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2
    return {
      x: cx + maxR * value * Math.cos(angle),
      y: cy + maxR * value * Math.sin(angle),
    }
  }

  /** 데이터 포인트 경로 */
  const dataPoints = METRICS.map((m, i) => {
    const val = profile[m.key] ?? 0
    return getPoint(i, val)
  })
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z"

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 280 280" className="w-full max-w-[320px]">
        {/* 배경 동심 다각형 */}
        {Array.from({ length: levels }, (_, lvl) => {
          const r = (lvl + 1) / levels
          const pts = METRICS.map((_, i) => getPoint(i, r))
          const path =
            pts
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ") + " Z"
          return (
            <path
              key={lvl}
              d={path}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.8}
            />
          )
        })}

        {/* 축선 */}
        {METRICS.map((_, i) => {
          const p = getPoint(i, 1)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.5}
            />
          )
        })}

        {/* 데이터 영역 (그라데이션) */}
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor="oklch(0.65 0.18 250)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="oklch(0.7 0.22 310)"
              stopOpacity={0.15}
            />
          </linearGradient>
        </defs>
        <path
          d={dataPath}
          fill="url(#radarGrad)"
          stroke="oklch(0.6 0.2 260)"
          strokeWidth={2}
          className="transition-all duration-700 ease-out"
        />

        {/* 데이터 포인트 점 */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="oklch(0.6 0.2 260)"
            stroke="white"
            strokeWidth={1.5}
            className="transition-all duration-500"
          />
        ))}

        {/* 라벨 */}
        {METRICS.map((m, i) => {
          const labelR = maxR + 24
          const angle = angleStep * i - Math.PI / 2
          const lx = cx + labelR * Math.cos(angle)
          const ly = cy + labelR * Math.sin(angle)
          return (
            <text
              key={m.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground text-[9px]"
            >
              {m.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
