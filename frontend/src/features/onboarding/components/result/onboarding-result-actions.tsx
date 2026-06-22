"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, Link2, LogIn, Save } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/features/auth/lib/auth-client"
import { getOnboardingErrorMessage } from "@/features/onboarding/lib/onboarding-error"
import {
  DEFAULT_ONBOARDING_TOP_K,
  buildSaveSurveyResultRequest,
} from "@/features/onboarding/lib/onboarding-form"
import {
  getOnboardingLoginPath,
  getOnboardingResultPath,
} from "@/features/onboarding/lib/onboarding-routes"
import {
  invalidateGetMySurveyProfileSurveysMeProfileGet,
  usePutMySurveyProfileSurveysMeProfilePut,
} from "@/shared/api/generated/onboarding/endpoints/survey/survey"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"

type OnboardingResultActionsProps = { profileCode: string }

export function OnboardingResultActions({
  profileCode,
}: OnboardingResultActionsProps) {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: session, isPending: isSessionPending } = useSession()
  const [isCopied, setIsCopied] = useState(false)
  const { mutate: saveResult, isPending: isSavePending } =
    usePutMySurveyProfileSurveysMeProfilePut({
      mutation: {
        onSuccess: async () => {
          await invalidateGetMySurveyProfileSurveysMeProfileGet(queryClient, {
            top_k: DEFAULT_ONBOARDING_TOP_K,
          })
          toast.success("내 설문 결과를 저장했습니다.")
        },
        onError: (error) => {
          toast.error(
            getOnboardingErrorMessage(
              error,
              "설문 결과 저장 중 오류가 발생했습니다."
            )
          )
        },
      },
    })

  const handleCopyShare = async () => {
    try {
      const shareUrl = new URL(
        getOnboardingResultPath(profileCode),
        window.location.origin
      ).toString()

      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 2000)
      toast.success("공유 링크를 복사했습니다.")
    } catch (error) {
      toast.error(
        getOnboardingErrorMessage(error, "공유 링크 복사에 실패했습니다.")
      )
    }
  }

  const handleSave = () => {
    saveResult({
      data: buildSaveSurveyResultRequest({
        profileCode,
      }),
    })
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyShare}
        className="gap-1.5"
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            복사됨
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" />
            결과 공유
          </>
        )}
      </Button>

      {isSessionPending ? (
        <Button variant="secondary" size="sm" disabled className="gap-1.5">
          <Spinner className="size-3.5" />
          세션 확인 중
        </Button>
      ) : null}

      {!isSessionPending && session ? (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSavePending}
          className="gap-1.5"
        >
          {isSavePending ? <Spinner className="size-3.5" /> : <Save />}내 결과
          저장
        </Button>
      ) : null}

      {!isSessionPending && !session ? (
        <Button asChild variant="secondary" size="sm" className="gap-1.5">
          <Link href={getOnboardingLoginPath(pathname)}>
            <LogIn className="h-3.5 w-3.5" />
            로그인 후 저장
          </Link>
        </Button>
      ) : null}

      <Badge variant="outline" className="font-mono text-[10px]">
        {profileCode}
      </Badge>
    </div>
  )
}
