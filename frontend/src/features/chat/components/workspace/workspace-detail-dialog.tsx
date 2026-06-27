"use client"

import { Fingerprint, Link2 } from "lucide-react"
import { MarkdownContentRenderer } from "@/features/chat/components/workspace/markdown-content-renderer"
import {
  getDocumentIcon,
  getDocumentTitle,
} from "@/features/chat/lib/display/chat-display"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type {
  ChatDetailDialogState,
  ChatOnboardingResultPreview,
} from "@/features/chat/types/workspace"
import type { OnboardingContextResponse } from "@/shared/api/generated/agent/schemas"
import type { DocumentResponse } from "@/shared/api/generated/agent/schemas"
import { useGetResultByCodeSurveysResultsResultCodeGet } from "@/shared/api/generated/onboarding/endpoints/survey/survey"
import type {
  SurveyResultResponse,
  SurveyResultResponseOutput,
} from "@/shared/api/generated/onboarding/schemas"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { cn } from "@/shared/lib/utils"
import { formatRelativeTime } from "@/shared/utils"

type OnboardingResultQueryState = {
  data: SurveyResultResponse | undefined
  isError: boolean
  isLoading: boolean
}

type WorkspaceDetailDialogProps = {
  dialog: ChatDetailDialogState | null
  currentThreadId: string | null
  currentOnboardingContext: OnboardingContextResponse | null
  defaultProfile: SurveyResultResponse | null
  isOnboardingContextPending?: boolean
  onClose: () => void
  onToggleOnboardingContext: (result: ChatOnboardingResultPreview) => void
}

export function WorkspaceDetailDialog({
  dialog,
  currentThreadId,
  currentOnboardingContext,
  defaultProfile,
  isOnboardingContextPending = false,
  onClose,
  onToggleOnboardingContext,
}: WorkspaceDetailDialogProps) {
  const isOpen = dialog !== null
  const onboardingResultCode =
    dialog?.kind === "onboarding-result" ? dialog.result.resultCode : "__idle__"
  const onboardingInitialData =
    dialog?.kind === "onboarding-result" &&
    defaultProfile?.result_code === dialog.result.resultCode
      ? defaultProfile
      : undefined
  const onboardingResultQuery =
    useGetResultByCodeSurveysResultsResultCodeGet<SurveyResultResponse>(
      onboardingResultCode,
      {
        query: {
          // 기본 프로필 항목은 이미 받은 목록 데이터를 모달 첫 렌더에 재사용한다.
          enabled: dialog?.kind === "onboarding-result",
          initialData: onboardingInitialData,
        },
      }
    )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90dvh] w-[min(1200px,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden p-0 sm:w-[min(1200px,calc(100vw-3rem))]"
        showCloseButton
      >
        {dialog?.kind === "library-document" ? (
          <DocumentDialogBody document={dialog.document} onClose={onClose} />
        ) : dialog?.kind === "onboarding-result" ? (
          <OnboardingResultDialogBody
            currentContext={currentOnboardingContext}
            currentThreadId={currentThreadId}
            isPending={isOnboardingContextPending}
            resultPreview={dialog.result}
            resultQuery={onboardingResultQuery}
            onClose={onClose}
            onToggleContext={onToggleOnboardingContext}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DocumentDialogBody({
  document,
  onClose,
}: {
  document: DocumentResponse
  onClose: () => void
}) {
  const isSelectionLocked = useChatWorkspace((state) => state.isSelectionLocked)
  const selectedDocumentIds = useChatWorkspace(
    (state) => state.selectedDocumentIds
  )
  const toggleDocument = useChatWorkspace((state) => state.toggleDocument)
  const isSelected = selectedDocumentIds.includes(document.id)

  return (
    <div className="flex min-h-0 flex-col">
      <DialogHeader className="gap-2 border-b border-border/20 px-5 py-4 pr-14">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border/40 bg-muted/30 p-2">
            {getDocumentIcon(document.type)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle className="truncate text-base">
              {getDocumentTitle(document)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {document.type}
            </DialogDescription>
            {document.summary && (
              <DialogDescription>{document.summary}</DialogDescription>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isSelected ? "secondary" : "outline"}
            size="sm"
            disabled={isSelectionLocked}
            onClick={() => {
              toggleDocument(document.id)
              onClose()
            }}
            className="h-8 cursor-pointer text-xs"
          >
            {isSelected ? "채팅에서 제거" : "채팅에 추가"}
          </Button>
        </div>
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          {isMarkdownRenderableType(document.type) ? (
            <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
              <MarkdownContentRenderer content={document.raw_text} />
            </div>
          ) : (
            <pre className="overflow-auto rounded-xl border border-border/40 bg-muted/10 p-4 text-xs leading-6 whitespace-pre-wrap">
              {document.raw_text}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function OnboardingResultDialogBody({
  currentContext,
  currentThreadId,
  isPending,
  resultPreview,
  resultQuery,
  onClose,
  onToggleContext,
}: {
  currentContext: OnboardingContextResponse | null
  currentThreadId: string | null
  isPending: boolean
  resultPreview: ChatOnboardingResultPreview
  resultQuery: OnboardingResultQueryState
  onClose: () => void
  onToggleContext: (result: ChatOnboardingResultPreview) => void
}) {
  const detail = resultQuery.data ?? null
  const isAttached = currentContext?.result_code === resultPreview.resultCode
  const canAttach = currentThreadId !== null
  const selectedCategoryCode =
    detail?.category_recommendations[0]?.service_category_code ?? null

  return (
    <div className="flex min-h-0 flex-col">
      <DialogHeader className="gap-2 border-b border-border/20 px-5 py-4 pr-14">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border/40 bg-muted/30 p-2 text-muted-foreground">
            <Fingerprint className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <DialogTitle className="truncate text-base">
                {detail?.profile_name ?? resultPreview.profileName}
              </DialogTitle>
              {resultPreview.isDefault && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  기본값
                </Badge>
              )}
              {isAttached && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  성향·채팅에 추가됨
                </Badge>
              )}
            </div>
            <DialogDescription>
              {detail
                ? `${detail.survey.title} · ${formatRelativeTime(detail.created_at)}`
                : `결과 코드 ${resultPreview.resultCode}`}
            </DialogDescription>
            <DialogDescription className="text-xs text-muted-foreground">
              결과 코드 {resultPreview.resultCode}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isAttached ? "secondary" : "outline"}
            size="sm"
            disabled={!canAttach || isPending || resultQuery.isLoading}
            onClick={() => {
              onToggleContext({
                ...resultPreview,
                selectedCategoryCode,
              })
              onClose()
            }}
            className="h-8 cursor-pointer text-xs"
          >
            {isAttached ? "채팅에서 제거" : "채팅에 추가"}
          </Button>
          {!canAttach && (
            <p className="text-[11px] text-muted-foreground">
              대화를 시작한 뒤 채팅에 추가할 수 있습니다
            </p>
          )}
        </div>
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-5">
          {resultQuery.isLoading && (
            <p className="text-sm text-muted-foreground">
              성향분석 결과를 불러오는 중입니다
            </p>
          )}

          {resultQuery.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
              성향분석 상세를 불러오지 못했습니다.
            </div>
          )}

          {detail && (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="size-3.5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">추천 업종</h3>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {detail.category_recommendations.slice(0, 6).map((item) => (
                    <div
                      key={item.service_category_code}
                      className="rounded-xl border border-border/40 bg-muted/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.rank}. {item.service_category_name}
                        </p>
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 text-[10px]"
                        >
                          {Math.round(item.score * 100)}점
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.category_group} · 코드{" "}
                        {item.service_category_code}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <ProfileMetricSection
                  title="상권 성향"
                  metrics={AREA_PROFILE_METRICS}
                  values={detail.area_user_profile}
                />
                <ProfileMetricSection
                  title="업종 성향"
                  metrics={CATEGORY_PROFILE_METRICS}
                  values={detail.category_user_profile}
                />
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

type ProfileMetricSectionProps<
  TValue extends Record<string, number | string | null | undefined>,
> = {
  title: string
  metrics: ReadonlyArray<{
    key: keyof TValue
    label: string
  }>
  values: TValue
}

function ProfileMetricSection<
  TValue extends Record<string, number | string | null | undefined>,
>({ title, metrics, values }: ProfileMetricSectionProps<TValue>) {
  return (
    <section className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2.5">
        {metrics.map((metric) => {
          const rawValue = values[metric.key]
          const value = typeof rawValue === "number" ? rawValue : 0

          return (
            <div key={String(metric.key)} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground">{metric.label}</span>
                <span className="text-muted-foreground">
                  {Math.round(value * 100)}점
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background/80">
                <div
                  className={cn(
                    "h-full rounded-full bg-foreground/70 transition-[width] duration-300"
                  )}
                  style={{ width: `${Math.max(0, Math.min(value, 1)) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

type AreaProfile = SurveyResultResponseOutput["area_user_profile"]
type CategoryProfile = SurveyResultResponseOutput["category_user_profile"]

const AREA_PROFILE_METRICS: ReadonlyArray<{
  key: keyof AreaProfile
  label: string
}> = [
  { key: "budget_level", label: "예산 허용치" },
  { key: "stability_level", label: "안정성 선호" },
  { key: "subway_dependency_level", label: "지하철 의존도" },
  { key: "weekend_preference_level", label: "주말 매출 선호" },
  { key: "evening_preference_level", label: "저녁 운영 선호" },
  { key: "resident_focus_level", label: "거주민 수요 집중" },
  { key: "worker_focus_level", label: "직장인 수요 집중" },
  { key: "rent_sensitivity_level", label: "임대료 민감도" },
  { key: "competition_tolerance_level", label: "경쟁 허용도" },
]

const CATEGORY_PROFILE_METRICS: ReadonlyArray<{
  key: keyof CategoryProfile
  label: string
}> = [
  { key: "stability_level", label: "안정형 업종 선호" },
  { key: "competition_tolerance_level", label: "경쟁 감수도" },
  { key: "weekend_preference_level", label: "주말형 업종 선호" },
  { key: "lunch_preference_level", label: "점심형 업종 선호" },
  { key: "evening_preference_level", label: "저녁형 업종 선호" },
  { key: "late_night_preference_level", label: "심야형 업종 선호" },
  { key: "female_preference_level", label: "여성 고객 선호" },
  { key: "avg_ticket_preference", label: "고객단가 선호" },
  { key: "traffic_volume_preference", label: "회전율 선호" },
  { key: "franchise_affinity_level", label: "프랜차이즈 친화도" },
  { key: "labor_intensity_tolerance", label: "인력 집약도 감수" },
  { key: "space_efficiency_preference", label: "면적 효율 선호" },
]

const isMarkdownRenderableType = (type: DocumentResponse["type"]) => {
  return (
    type === "markdown" ||
    type === "commercial_report" ||
    type === "research_report" ||
    type === "search_report"
  )
}
