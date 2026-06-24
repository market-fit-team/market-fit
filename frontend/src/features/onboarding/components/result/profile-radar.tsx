import {
  ONBOARDING_RADAR_METRICS,
  type OnboardingMetricKey,
} from "@/features/onboarding/lib/onboarding-result"
import type { OnboardingUserProfile } from "@/features/onboarding/types/onboarding"

type ProfileRadarProps = {
  profile: OnboardingUserProfile
}

const getMetricValue = (
  profile: OnboardingUserProfile,
  metricKey: OnboardingMetricKey
) => {
  return profile[metricKey]
}

const getPoint = (
  index: number,
  value: number,
  count: number,
  centerX: number,
  centerY: number,
  maxRadius: number
) => {
  const angle = ((2 * Math.PI) / count) * index - Math.PI / 2

  return {
    x: centerX + maxRadius * value * Math.cos(angle),
    y: centerY + maxRadius * value * Math.sin(angle),
  }
}

export function ProfileRadar({ profile }: ProfileRadarProps) {
  const centerX = 150
  const centerY = 150
  const maxRadius = 110
  const levels = 4
  const metricCount = ONBOARDING_RADAR_METRICS.length

  const points = ONBOARDING_RADAR_METRICS.map((metric, index) => {
    return getPoint(
      index,
      getMetricValue(profile, metric.key),
      metricCount,
      centerX,
      centerY,
      maxRadius
    )
  })

  const polygonPath =
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ") + " Z"

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "1 / 1", maxWidth: 340 }}
    >
      <svg
        viewBox="0 0 300 300"
        className="absolute inset-0 h-full w-full"
        aria-label="창업 성향 레이더 차트"
      >
        {Array.from({ length: levels }, (_, levelIndex) => {
          const ratio = (levelIndex + 1) / levels
          const levelPoints = ONBOARDING_RADAR_METRICS.map((_, index) =>
            getPoint(index, ratio, metricCount, centerX, centerY, maxRadius)
          )
          const levelPath =
            levelPoints
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
              )
              .join(" ") + " Z"

          return (
            <path
              key={levelIndex}
              d={levelPath}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.8}
            />
          )
        })}

        {ONBOARDING_RADAR_METRICS.map((_, index) => {
          const axisPoint = getPoint(
            index,
            1,
            metricCount,
            centerX,
            centerY,
            maxRadius
          )

          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={axisPoint.x}
              y2={axisPoint.y}
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.5}
            />
          )
        })}

        <defs>
          <linearGradient
            id="onboarding-radar-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="oklch(0.55 0.15 250)"
              stopOpacity={0.25}
            />
            <stop
              offset="100%"
              stopColor="oklch(0.55 0.15 250)"
              stopOpacity={0.08}
            />
          </linearGradient>
        </defs>

        <path
          d={polygonPath}
          fill="url(#onboarding-radar-gradient)"
          stroke="oklch(0.55 0.15 250)"
          strokeWidth={2}
        />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3.5}
            fill="oklch(0.55 0.15 250)"
            stroke="white"
            strokeWidth={1.5}
          />
        ))}

        {ONBOARDING_RADAR_METRICS.map((metric, index) => {
          const labelRadius = maxRadius + 26
          const angle = ((2 * Math.PI) / metricCount) * index - Math.PI / 2
          const labelX = centerX + labelRadius * Math.cos(angle)
          const labelY = centerY + labelRadius * Math.sin(angle)

          return (
            <text
              key={metric.key}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground text-[10px]"
            >
              {metric.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
