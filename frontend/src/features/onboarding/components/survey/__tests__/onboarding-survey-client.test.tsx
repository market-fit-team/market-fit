import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OnboardingSurveyClient } from "@/features/onboarding/components/survey/onboarding-survey-client"
import { OnboardingStoreProvider } from "@/features/onboarding/stores/onboarding-store"
import {
  onboardingResultFixture,
  onboardingSurveyFixture,
} from "@/features/onboarding/testing/onboarding-fixtures"
import type { OnboardingSurvey } from "@/features/onboarding/types/onboarding"

const { mutateMock, pushMock, toastErrorMock, toastSuccessMock, testState } =
  vi.hoisted(() => ({
    mutateMock: vi.fn(),
    pushMock: vi.fn(),
    testState: {
      mutationOptions: undefined as
        | {
            onError?: (error: unknown) => void
            onSuccess?: (result: typeof onboardingResultFixture) => void
          }
        | undefined,
    },
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

vi.mock("motion/react", async () => {
  const React = await import("react")

  const MotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
      animate?: string
      custom?: unknown
      exit?: string
      initial?: string
      onAnimationComplete?: () => void
      transition?: unknown
      variants?: unknown
    }
  >(function MotionDiv(
    {
      animate: _animate,
      children,
      custom: _custom,
      exit: _exit,
      initial: _initial,
      onAnimationComplete,
      transition: _transition,
      variants: _variants,
      ...props
    },
    ref
  ) {
    React.useEffect(() => {
      onAnimationComplete?.()
    }, [children, onAnimationComplete])

    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    )
  })

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    motion: {
      div: MotionDiv,
    },
    useIsPresent: () => true,
    usePresenceData: () => undefined,
    useReducedMotion: () => false,
  }
})

vi.mock(
  "@/shared/api/generated/onboarding/endpoints/survey/survey",
  async () => {
    const actual = await vi.importActual<
      typeof import("@/shared/api/generated/onboarding/endpoints/survey/survey")
    >("@/shared/api/generated/onboarding/endpoints/survey/survey")

    return {
      ...actual,
      usePreviewActiveSurveySurveysActivePreviewPost: (options?: {
        mutation?: {
          onError?: (error: unknown) => void
          onSuccess?: (result: typeof onboardingResultFixture) => void
        }
      }) => {
        testState.mutationOptions = options?.mutation

        return {
          isPending: false,
          mutate: mutateMock,
        }
      },
    }
  }
)

const onboardingSurveyTestFixture: OnboardingSurvey = {
  ...onboardingSurveyFixture,
  question_count: 2,
  questions: [
    onboardingSurveyFixture.questions[0],
    onboardingSurveyFixture.questions[9],
  ],
}

const singleQuestionResultFixture: OnboardingSurvey = {
  ...onboardingSurveyFixture,
  question_count: 1,
  questions: [onboardingSurveyFixture.questions[9]],
}

function SurveyClientHarness({ survey }: { survey: OnboardingSurvey }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingStoreProvider survey={survey}>
        <OnboardingSurveyClient />
      </OnboardingStoreProvider>
    </QueryClientProvider>
  )
}

describe("OnboardingSurveyClient", () => {
  beforeEach(() => {
    testState.mutationOptions = undefined
    mutateMock.mockReset()
    pushMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("단일 선택 질문에서는 선택 후 다음 질문으로 자동 이동한다", async () => {
    render(<SurveyClientHarness survey={onboardingSurveyTestFixture} />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    )

    expect(
      screen.getByRole("heading", {
        name: /자영업을 통해 이루고 싶은 것을 골라주세요/,
      })
    ).toBeInTheDocument()
  })

  it("이전에 답한 단일 선택 질문으로 돌아오면 다음 버튼으로도 이동할 수 있다", async () => {
    render(<SurveyClientHarness survey={onboardingSurveyTestFixture} />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    )
    await userEvent.click(screen.getByRole("button", { name: "이전" }))

    const nextButton = screen.getByRole("button", { name: "다음" })

    expect(nextButton).toBeEnabled()

    await userEvent.click(nextButton)

    expect(
      screen.getByRole("heading", {
        name: /자영업을 통해 이루고 싶은 것을 골라주세요/,
      })
    ).toBeInTheDocument()
  })

  it("다중 선택 질문에서는 응답 여부에 따라 다음 버튼 활성 상태가 바뀐다", async () => {
    render(<SurveyClientHarness survey={singleQuestionResultFixture} />)

    const submitButton = screen.getByRole("button", { name: "결과 보기" })

    expect(submitButton).toBeDisabled()

    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )

    expect(submitButton).toBeEnabled()
  })

  it("이전 버튼으로 돌아가도 기존 답변을 유지한다", async () => {
    render(<SurveyClientHarness survey={onboardingSurveyTestFixture} />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )
    await userEvent.click(screen.getByRole("button", { name: "이전" }))

    expect(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
        pressed: true,
      })
    ).toBeInTheDocument()
  })

  it("처음부터 다시를 누르면 첫 질문으로 돌아가고 답변을 비운다", async () => {
    render(<SurveyClientHarness survey={onboardingSurveyTestFixture} />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )
    await userEvent.click(screen.getByRole("button", { name: "처음부터 다시" }))

    expect(
      screen.getByRole("heading", {
        name: /내 가게에 가장 자주 왔으면 하는 손님은 어떤 분인가요/,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    ).toHaveAttribute("aria-pressed", "false")
  })

  it("제출 성공 시 결과 페이지로 이동을 요청한다", async () => {
    mutateMock.mockImplementation(() => {
      testState.mutationOptions?.onSuccess?.(onboardingResultFixture)
    })

    render(<SurveyClientHarness survey={singleQuestionResultFixture} />)

    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )
    await userEvent.click(screen.getByRole("button", { name: "결과 보기" }))

    expect(mutateMock).toHaveBeenCalledOnce()
    expect(pushMock).toHaveBeenCalledWith(
      `/onboarding/result/${onboardingResultFixture.result_code}`
    )
    expect(toastSuccessMock).toHaveBeenCalledWith("설문 분석을 완료했습니다.")
  })

  it("제출 실패 시 오류 토스트를 표시한다", async () => {
    mutateMock.mockImplementation(() => {
      testState.mutationOptions?.onError?.(new Error("유효성 검사 실패"))
    })

    render(<SurveyClientHarness survey={singleQuestionResultFixture} />)

    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )
    await userEvent.click(screen.getByRole("button", { name: "결과 보기" }))

    expect(mutateMock).toHaveBeenCalledOnce()
    expect(toastErrorMock).toHaveBeenCalledWith(
      "설문 분석 중 오류가 발생했습니다."
    )
  })
})
