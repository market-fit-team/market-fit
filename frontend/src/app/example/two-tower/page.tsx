"use client"

import { useEffect, useState, useTransition } from "react"
import {
  BrainCircuit,
  Minus,
  Plus,
  Radar,
  RefreshCw,
  Sparkles,
  TrainFront,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"

type UserProfile = {
  user_id: string
  profile_name: string
  preferred_category_code: string
  budget_level: number
  stability_level: number
  subway_dependency_level: number
  weekend_preference_level: number
  evening_preference_level: number
  resident_focus_level: number
  worker_focus_level: number
  rent_sensitivity_level: number
  competition_tolerance_level: number
}

type FeatureControl = {
  name: keyof Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  >
  label: string
  description: string
  minimum: number
  maximum: number
}

type CategoryOption = {
  code: string
  label: string
}

type EvaluationResponse = {
  model_id: string
  trained_at: string
  epochs: number
  rows: number
  user_count: number
  item_count: number
  embedding_dim: number
  final_loss: number
  hit_rate_at_3: number
  mrr: number
  artifact_paths: Record<string, string>
  user_string_features: string[]
  user_numeric_features: string[]
  item_string_features: string[]
  item_numeric_features: string[]
}

type RecommendationItem = {
  rank: number
  score: number
  item_id: string
  area_name: string
  service_category_name: string
  area_profile_type: string
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
}

type PredictResponse = {
  trained_at: string
  top_k: number
  user_profile: UserProfile
  recommendations: RecommendationItem[]
}

type CatalogResponse = {
  model_id: string
  feature_controls: FeatureControl[]
  category_options: CategoryOption[]
  sample_profiles: UserProfile[]
  item_preview: Array<{
    item_id: string
    area_name: string
    service_category_name: string
    area_profile_type: string
    sales_amount: number
    weekend_sales_ratio: number
    evening_sales_ratio: number
  }>
  evaluation: EvaluationResponse
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ONBOARDING_API_BASE_URL ??
  "http://localhost:8088/api/onboarding"

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value)}`

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))

const matchPercent = (score: number, scores: number[]) => {
  if (scores.length === 0) {
    return 0
  }

  const minimum = Math.min(...scores)
  const maximum = Math.max(...scores)

  if (minimum === maximum) {
    return 100
  }

  return Math.round(((score - minimum) / (maximum - minimum)) * 100)
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="bg-white/75 py-0 backdrop-blur-sm">
      <CardContent className="space-y-1 px-4 py-4">
        <div className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </div>
        <div className="text-lg font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

function FeatureStepper({
  control,
  value,
  onStep,
}: {
  control: FeatureControl
  value: number
  onStep: (nextValue: number) => void
}) {
  const progressValue =
    ((value - control.minimum) / (control.maximum - control.minimum)) * 100

  return (
    <Card className="bg-white/80 py-0 shadow-sm backdrop-blur-sm">
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-foreground">{control.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {control.description}
            </div>
          </div>
          <Badge variant="outline" className="bg-background/80">
            {value} / {control.maximum}
          </Badge>
        </div>
        <Progress value={progressValue} className="h-1.5" />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() =>
              onStep(clamp(value - 1, control.minimum, control.maximum))
            }
            disabled={value <= control.minimum}
          >
            <Minus />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() =>
              onStep(clamp(value + 1, control.minimum, control.maximum))
            }
            disabled={value >= control.maximum}
          >
            <Plus />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [prediction, setPrediction] = useState<PredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [isTraining, setIsTraining] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [, startTransition] = useTransition()

  const requestPrediction = async (nextProfile: UserProfile) => {
    setIsPredicting(true)
    setError(null)

    try {
      const response = await fetchJson<PredictResponse>("/two-tower/predict", {
        method: "POST",
        body: JSON.stringify({
          top_k: 5,
          user_profile: nextProfile,
        }),
      })

      startTransition(() => {
        setPrediction(response)
        setProfile(response.user_profile)
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "추천 요청 중 오류가 발생했습니다."
      )
    } finally {
      setIsPredicting(false)
    }
  }

  const loadCatalog = async () => {
    setIsBooting(true)
    setError(null)

    try {
      const response = await fetchJson<CatalogResponse>("/two-tower/catalog")
      const initialProfile = response.sample_profiles[0]

      startTransition(() => {
        setCatalog(response)
        setProfile(initialProfile)
      })

      await requestPrediction(initialProfile)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "초기 데이터를 불러오지 못했습니다."
      )
    } finally {
      setIsBooting(false)
    }
  }

  const trainModel = async () => {
    setIsTraining(true)
    setError(null)

    try {
      await fetchJson<EvaluationResponse>("/two-tower/train", {
        method: "POST",
        body: JSON.stringify({ epochs: 16 }),
      })
      await loadCatalog()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "학습 실행 중 오류가 발생했습니다."
      )
    } finally {
      setIsTraining(false)
    }
  }

  const applyProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile)
    void requestPrediction(nextProfile)
  }

  const updateField = (
    field: keyof Omit<
      UserProfile,
      "user_id" | "profile_name" | "preferred_category_code"
    >,
    value: number
  ) => {
    if (!profile) {
      return
    }

    const nextProfile = {
      ...profile,
      profile_name: "사용자 조정 프로필",
      [field]: value,
    }
    applyProfile(nextProfile)
  }

  const updateCategory = (code: string) => {
    if (!profile) {
      return
    }

    applyProfile({
      ...profile,
      profile_name: "사용자 조정 프로필",
      preferred_category_code: code,
    })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCatalog()
  }, [])

  const scores = prediction?.recommendations.map((item) => item.score) ?? []
  const topRecommendation = prediction?.recommendations[0] ?? null

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(254,243,199,0.64)_38%,_rgba(224,242,254,0.82)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(14,116,144,0.92))] py-0 text-white shadow-2xl">
          <CardContent className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 text-white"
              >
                Example / Two Tower
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  클릭 기반 유저 타워 조정 데모
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-white/80">
                  프론트에서 버튼을 누르면 유저 타워 수치가 바뀌고, 고정된
                  행정동-업종 아이템 타워와 바로 매칭해 추천 순위와 점수를 다시
                  계산합니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <Badge className="bg-white/12 text-white hover:bg-white/20">
                  <BrainCircuit />
                  User Tower
                </Badge>
                <Badge className="bg-white/12 text-white hover:bg-white/20">
                  <Radar />
                  Item Tower
                </Badge>
                <Badge className="bg-white/12 text-white hover:bg-white/20">
                  <Sparkles />
                  실시간 점수 갱신
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
              <Button
                type="button"
                size="lg"
                className="h-10 bg-white text-slate-900 hover:bg-white/90"
                onClick={() => void trainModel()}
                disabled={isTraining}
              >
                <TrainFront />
                {isTraining ? "학습 실행 중..." : "모델 다시 학습"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-10 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => void loadCatalog()}
                disabled={isBooting}
              >
                <RefreshCw className={isBooting ? "animate-spin" : ""} />
                {isBooting ? "초기화 중..." : "카탈로그 새로고침"}
              </Button>
              <div className="rounded-xl bg-black/15 p-3 text-xs leading-6 text-white/80">
                API: <span className="font-mono">{API_BASE_URL}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border border-destructive/20 bg-destructive/5 py-0">
            <CardContent className="px-5 py-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : null}

        {catalog?.evaluation ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="최종 Loss"
              value={catalog.evaluation.final_loss.toFixed(4)}
              hint={`학습 row ${catalog.evaluation.rows}개`}
            />
            <MetricCard
              label="Hit@3"
              value={formatPercent(catalog.evaluation.hit_rate_at_3)}
              hint="상위 3개 안에 정답이 포함된 비율"
            />
            <MetricCard
              label="MRR"
              value={catalog.evaluation.mrr.toFixed(3)}
              hint="첫 정답 순위 기반 지표"
            />
            <MetricCard
              label="임베딩 차원"
              value={`${catalog.evaluation.embedding_dim}D`}
              hint={`user ${catalog.evaluation.user_count} / item ${catalog.evaluation.item_count}`}
            />
            <MetricCard
              label="학습 시각"
              value={formatDateTime(catalog.evaluation.trained_at)}
              hint={`epochs ${catalog.evaluation.epochs}`}
            />
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="border-0 bg-white/75 py-0 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle>샘플 유저 프로필</CardTitle>
                <CardDescription>
                  버튼을 누르면 유저 타워 입력값이 한 번에 교체되고 바로
                  재매칭합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pb-6">
                {catalog?.sample_profiles.map((sampleProfile) => (
                  <Button
                    key={sampleProfile.user_id}
                    type="button"
                    variant={
                      profile?.user_id === sampleProfile.user_id &&
                      profile?.profile_name === sampleProfile.profile_name
                        ? "default"
                        : "outline"
                    }
                    onClick={() => applyProfile(sampleProfile)}
                  >
                    {sampleProfile.profile_name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/75 py-0 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle>User Tower Console</CardTitle>
                <CardDescription>
                  질문 답변은 결국 이 수치들을 바꾸는 역할로 연결됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-6">
                <div className="space-y-3">
                  <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    선호 업종
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {catalog?.category_options.map((option) => (
                      <Button
                        key={option.code}
                        type="button"
                        variant={
                          profile?.preferred_category_code === option.code
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateCategory(option.code)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {catalog?.feature_controls.map((control) => (
                    <FeatureStepper
                      key={control.name}
                      control={control}
                      value={profile?.[control.name] ?? control.minimum}
                      onStep={(nextValue) =>
                        updateField(control.name, nextValue)
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-0 bg-[linear-gradient(145deg,rgba(255,248,235,0.96),rgba(255,255,255,0.92))] py-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>추천 결과</CardTitle>
                    <CardDescription>
                      현재 user embedding 과 item embedding 의 dot product
                      결과입니다.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white/70">
                    {isPredicting ? "계산 중" : "반영 완료"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                {topRecommendation ? (
                  <Card className="border border-amber-200/70 bg-white/85 py-0">
                    <CardContent className="space-y-4 px-5 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
                            Top Match
                          </div>
                          <div className="mt-1 text-lg font-semibold text-foreground">
                            {topRecommendation.area_name} ·{" "}
                            {topRecommendation.service_category_name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {topRecommendation.area_profile_type} 상권 / 아이템
                            ID {topRecommendation.item_id}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
                          <div className="text-[0.65rem] tracking-[0.18em] text-white/60 uppercase">
                            Match
                          </div>
                          <div className="text-2xl font-semibold">
                            {matchPercent(topRecommendation.score, scores)}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetricCard
                          label="Raw Score"
                          value={topRecommendation.score.toFixed(4)}
                          hint="dot product 결과"
                        />
                        <MetricCard
                          label="월 매출"
                          value={formatCurrency(topRecommendation.sales_amount)}
                          hint="아이템 타워 원시 값"
                        />
                        <MetricCard
                          label="주말 비중"
                          value={formatPercent(
                            topRecommendation.weekend_sales_ratio
                          )}
                          hint="주말 수요 성향"
                        />
                        <MetricCard
                          label="저녁 비중"
                          value={formatPercent(
                            topRecommendation.evening_sales_ratio
                          )}
                          hint="야간 운영 적합도"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    추천 결과를 기다리는 중입니다.
                  </div>
                )}

                <div className="space-y-3">
                  {prediction?.recommendations.map((recommendation) => (
                    <Card
                      key={recommendation.item_id}
                      className="bg-white/85 py-0 shadow-sm"
                    >
                      <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                          {recommendation.rank}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {recommendation.area_name} ·{" "}
                            {recommendation.service_category_name}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                              거주{" "}
                              {recommendation.resident_population.toLocaleString(
                                "ko-KR"
                              )}
                            </span>
                            <span>
                              직장{" "}
                              {recommendation.worker_population.toLocaleString(
                                "ko-KR"
                              )}
                            </span>
                            <span>
                              지하철{" "}
                              {recommendation.subway_commercial_trend_score.toFixed(
                                2
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            적합도
                          </div>
                          <div className="text-base font-semibold text-foreground">
                            {matchPercent(recommendation.score, scores)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/75 py-0 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Item Tower Preview</CardTitle>
                <CardDescription>
                  샘플 데이터에서 만든 행정동-업종 후보 일부입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6">
                {catalog?.item_preview.map((item) => (
                  <div
                    key={item.item_id}
                    className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">
                          {item.area_name} · {item.service_category_name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.area_profile_type} 상권 / {item.item_id}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatCurrency(item.sales_amount)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="text-xs text-muted-foreground">
                        주말 비중 {formatPercent(item.weekend_sales_ratio)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        저녁 비중 {formatPercent(item.evening_sales_ratio)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
