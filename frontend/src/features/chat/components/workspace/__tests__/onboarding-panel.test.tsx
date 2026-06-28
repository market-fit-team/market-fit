import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import {
  OnboardingPanel,
  type OnboardingPanelItem,
} from "@/features/chat/components/workspace/onboarding-panel"

const items: OnboardingPanelItem[] = [
  {
    resultCode: "default-1",
    profileName: "기본 프로필",
    isDefault: true,
    savedLabel: "기본 프로필",
    savedSource: "default_profile",
    createdAt: "2026-06-26T00:00:00Z",
    isAttached: true,
  },
  {
    resultCode: "saved-1",
    profileName: "과거 분석 결과",
    isDefault: false,
    savedLabel: "수동 저장",
    savedSource: "manual_save",
    createdAt: "2026-06-25T00:00:00Z",
    isAttached: false,
  },
]

describe("OnboardingPanel", () => {
  it("기본 프로필을 목록 맨 위에 렌더링하고 행 클릭 시 상세를 연다.", () => {
    const onOpenResult = vi.fn()
    const { container } = render(
      <OnboardingPanel
        items={items}
        onCollapsePanel={vi.fn()}
        onOpenResult={onOpenResult}
        onToggleContext={vi.fn()}
      />
    )

    const rows = container.querySelectorAll("[id^='onboarding-row-']")
    expect(rows).toHaveLength(2)
    expect(
      within(rows[0] as HTMLElement).getByText("기본값")
    ).toBeInTheDocument()
    expect(
      within(rows[0] as HTMLElement).getByText("성향·채팅에 추가됨")
    ).toBeInTheDocument()

    fireEvent.click(rows[1] as HTMLElement)

    expect(onOpenResult).toHaveBeenCalledWith(
      expect.objectContaining({
        resultCode: "saved-1",
        profileName: "과거 분석 결과",
      })
    )
  })

  it("결과가 없으면 빈 상태 문구를 보여준다.", () => {
    render(
      <OnboardingPanel
        items={[]}
        onCollapsePanel={vi.fn()}
        onOpenResult={vi.fn()}
        onToggleContext={vi.fn()}
      />
    )

    expect(
      screen.getByText("저장된 성향분석 결과가 없습니다")
    ).toBeInTheDocument()
  })
})
