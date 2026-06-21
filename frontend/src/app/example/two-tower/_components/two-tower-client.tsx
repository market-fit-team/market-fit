"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BrainCircuit,
  Check,
  Copy,
  Radar,
  RefreshCw,
  Save,
  Sparkles,
  TrainFront,
} from "lucide-react"
import {
  API_BASE_URL,
  DEMO_AUTH_USER_UUID,
  fetchCatalog,
  fetchPrediction,
  fetchProfileByCode,
  fetchSavedProfile,
  saveUserTowerProfile,
  trainTwoTowerModel,
} from "@/app/example/two-tower/_components/two-tower-api"
import type {
  CatalogResponse,
  FeatureControl,
  PredictResponse,
  ResolvedProfileResponse,
  UserProfile,
} from "@/app/example/two-tower/_components/two-tower-types"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Slider } from "@/shared/components/ui/slider"

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const normalizeScore = (value: number) => Number(clamp(value, 0, 1).toFixed(2))

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

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "미저장"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

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

const formatScore = (value: number) => `${Math.round(value * 100)}점`

const formatRawScore = (value: number) => value.toFixed(2)

type ScoreField = keyof Omit<
  UserProfile,
  "user_id" | "profile_name" | "preferred_category_code"
>

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

function FeatureSlider({
  control,
  value,
  onPreview,
  onCommit,
}: {
  control: FeatureControl
  value: number
  onPreview: (nextValue: number) => void
  onCommit: (nextValue: number) => void
}) {
  const normalizedValue = normalizeScore(value)

  return (
    <Card className="bg-white/80 py-0 shadow-sm backdrop-blur-sm">
      <CardContent className="space-y-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-foreground">{control.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {control.description}
            </div>
          </div>
          <Badge variant="outline" className="bg-background/80">
            {formatRawScore(normalizedValue)}
          </Badge>
        </div>
        <div className="space-y-3">
          <Slider
            value={[normalizedValue]}
            min={control.minimum}
            max={control.maximum}
            step={control.step}
            onValueChange={(nextValue) => {
              const valueFromSlider = nextValue[0]
              if (typeof valueFromSlider === "number") {
                onPreview(normalizeScore(valueFromSlider))
              }
            }}
            onValueCommit={(nextValue) => {
              const valueFromSlider = nextValue[0]
              if (typeof valueFromSlider === "number") {
                onCommit(normalizeScore(valueFromSlider))
              }
            }}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0.00</span>
            <span>{formatScore(normalizedValue)}</span>
            <span>1.00</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TwoTowerClient({
  initialProfileCode,
  syncPathWithProfileCode = false,
}: {
  initialProfileCode?: string
  syncPathWithProfileCode?: boolean
}) {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [prediction, setPrediction] = useState<PredictResponse | null>(null)
  const [resolvedProfile, setResolvedProfile] =
    useState<ResolvedProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "done">("idle")
  const [isBooting, setIsBooting] = useState(true)
  const [isTraining, setIsTraining] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [, startTransition] = useTransition()

  const requestPrediction = async (nextProfile: UserProfile) => {
    setIsPredicting(true)
    setError(null)

    try {
      const response = await fetchPrediction(nextProfile)

      startTransition(() => {
        setPrediction(response)
        setProfile(response.user_profile)
      })

      if (syncPathWithProfileCode) {
        router.replace(`/example/two-tower/${response.profile_code}`)
      }
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
      const response = await fetchCatalog()
      let bootstrapProfile = response.sample_profiles[0]
      let bootstrapPrediction: PredictResponse | null = null
      let bootstrapResolved: ResolvedProfileResponse | null = null

      if (initialProfileCode) {
        bootstrapResolved = await fetchProfileByCode(initialProfileCode)
        bootstrapProfile = bootstrapResolved.prediction.user_profile
        bootstrapPrediction = bootstrapResolved.prediction
      } else {
        const savedProfile = await fetchSavedProfile(DEMO_AUTH_USER_UUID)
        if (savedProfile) {
          bootstrapResolved = savedProfile
          bootstrapProfile = savedProfile.prediction.user_profile
          bootstrapPrediction = savedProfile.prediction
        } else {
          bootstrapPrediction = await fetchPrediction(bootstrapProfile)
        }
      }

      startTransition(() => {
        setCatalog(response)
        setProfile(bootstrapProfile)
        setPrediction(bootstrapPrediction)
        setResolvedProfile(bootstrapResolved)
      })
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
      await trainTwoTowerModel()
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

  const saveProfile = async () => {
    if (!profile) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await saveUserTowerProfile(DEMO_AUTH_USER_UUID, profile)
      startTransition(() => {
        setResolvedProfile(response)
        setPrediction(response.prediction)
        setProfile(response.prediction.user_profile)
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "프로필 저장 중 오류가 발생했습니다."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const applyProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile)
    void requestPrediction(nextProfile)
  }

  const buildAdjustedProfile = (
    baseProfile: UserProfile,
    patch: Partial<UserProfile>
  ): UserProfile => ({
    ...baseProfile,
    profile_name: initialProfileCode
      ? "공유 코드 조정 프로필"
      : "사용자 조정 프로필",
    ...patch,
  })

  const previewField = (field: ScoreField, value: number) => {
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile
      }

      return buildAdjustedProfile(currentProfile, {
        [field]: normalizeScore(value),
      })
    })
  }

  const commitField = (field: ScoreField, value: number) => {
    if (!profile) {
      return
    }

    applyProfile(
      buildAdjustedProfile(profile, {
        [field]: normalizeScore(value),
      })
    )
  }

  const updateCategory = (code: string) => {
    if (!profile) {
      return
    }

    applyProfile(
      buildAdjustedProfile(profile, {
        preferred_category_code: code,
      })
    )
  }

  const copyShareUrl = async () => {
    const shareUrl = prediction?.share_url ?? resolvedProfile?.profile.share_url
    if (!shareUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setCopyState("done")
    window.setTimeout(() => {
      setCopyState("idle")
    }, 1600)
  }

  useEffect(() => {
    void loadCatalog()
  }, [initialProfileCode])

  const scores = prediction?.recommendations.map((item) => item.score) ?? []
  const topRecommendation = prediction?.recommendations[0] ?? null
  const shareCode =
    prediction?.profile_code ?? resolvedProfile?.profile.profile_code
  const shareUrl = prediction?.share_url ?? resolvedProfile?.profile.share_url
  const isDirty = useMemo(() => {
    if (!resolvedProfile || !prediction) {
      return false
    }

    return resolvedProfile.profile.profile_code !== prediction.profile_code
  }, [prediction, resolvedProfile])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(255,243,214,0.72)_34%,_rgba(216,244,255,0.85)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(22,101,52,0.88))] py-0 text-white shadow-2xl">
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
                  저장 가능한 유저 타워 콘솔
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-white/80">
                  지금 단계에서는 설문지를 만들기 전에 유저 타워 점수 자체를
                  직접 조정합니다. 내부 점수는 0에서 1 사이의 실수로 관리하고,
                  화면에서는 100점 기준으로 읽기 쉽게 보여줍니다. 같은 점수
                  조합은 같은 base36 공유 코드로 묶이고, JWT의 user_profile.uuid
                  기준으로 현재 프로필을 저장할 수 있습니다.
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
                  base36 공유 코드
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
                <CardTitle>저장 상태</CardTitle>
                <CardDescription>
                  JWT의 <span className="font-mono">user_profile.uuid</span>에
                  대응하는 현재 프로필 저장 지점입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                      Demo Auth UUID
                    </div>
                    <Input value={DEMO_AUTH_USER_UUID} readOnly />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                        Share URL
                      </div>
                      <Input value={shareUrl ?? ""} readOnly />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void copyShareUrl()}
                        disabled={!shareUrl}
                      >
                        {copyState === "done" ? <Check /> : <Copy />}
                        {copyState === "done" ? "복사됨" : "URL 복사"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveProfile()}
                        disabled={!profile || isSaving}
                      >
                        <Save />
                        {isSaving ? "저장 중..." : "현재 점수 저장"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    현재 코드 {shareCode ?? "미생성"}
                  </Badge>
                  <Badge variant={isDirty ? "secondary" : "default"}>
                    {isDirty ? "저장 전 변경 있음" : "저장 상태와 일치"}
                  </Badge>
                  <Badge variant="outline">
                    마지막 저장{" "}
                    {formatDateTime(
                      resolvedProfile?.profile.updated_at ?? null
                    )}
                  </Badge>
                </div>

                {shareCode ? (
                  <Link
                    href={`/example/two-tower/${shareCode}`}
                    className="inline-flex text-sm text-emerald-700 underline underline-offset-4"
                  >
                    공유 코드 페이지로 열기
                  </Link>
                ) : null}
              </CardContent>
            </Card>

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
                  설문지는 나중에 이 0~1 파라미터들을 자동 조정하는 입력 장치로
                  붙습니다.
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
                    <FeatureSlider
                      key={control.name}
                      control={control}
                      value={profile?.[control.name] ?? control.minimum}
                      onPreview={(nextValue) =>
                        previewField(control.name, nextValue)
                      }
                      onCommit={(nextValue) =>
                        commitField(control.name, nextValue)
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
