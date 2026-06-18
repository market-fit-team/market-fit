export interface TrendForecastMetric {
  label: string
  value: string
  description: string
}

export interface TrendForecastBanner {
  eyebrow: string
  title: string
  description: string
  primaryCta: {
    label: string
    href: string
  }
  secondaryCta: {
    label: string
    href: string
  }
  metrics: TrendForecastMetric[]
}
