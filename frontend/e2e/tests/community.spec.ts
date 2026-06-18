import { expect, test } from "@playwright/test"

test.describe("Community Features", () => {
  test("should render post list and load more", async ({ page }) => {
    // 이제 실제 생성된 라우트로 접속합니다.
    await page.goto("/example/community/posts")

    // 컴포넌트 렌더링 확인 (서버에서 dehydrate 된 데이터가 렌더링되는지)
    const heading = page.locator("h1:has-text('커뮤니티')")
    await expect(heading).toBeVisible()

    // 더 보기 버튼이 있다면 노출되는지 확인 (목록이 비어있으면 안 보일 수도 있으므로 분기 처리)
    const loadMoreButton = page.locator("button:has-text('더 보기')")
    if (await loadMoreButton.isVisible()) {
      await expect(loadMoreButton).toBeEnabled()
    }
  })

  test("should be able to create a post", async ({ page }) => {
    await page.goto("/example/community/posts")

    const textarea = page.locator("textarea[placeholder='내용을 입력하세요']")
    await expect(textarea).toBeVisible()
    await textarea.fill("E2E 테스트 게시글입니다.")

    const submitButton = page.locator("button:has-text('등록')")
    await expect(submitButton).toBeEnabled()

    // API 호출을 가로채거나 성공 얼럿을 확인할 수 있습니다.
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("작성 완료")
      await dialog.accept()
    })

    await submitButton.click()
  })

  test("should be able to schedule a post", async ({ page }) => {
    // 실제 예약 게시글 라우트로 접속합니다.
    await page.goto("/example/community/scheduled-posts")

    const heading = page.locator("h1:has-text('예약 게시글 작성')")
    await expect(heading).toBeVisible()

    const textarea = page.locator(
      "textarea[placeholder='예약게시글 내용을 입력하세요']"
    )
    await expect(textarea).toBeVisible()
    await textarea.fill("E2E 예약 테스트 게시글입니다.")

    const datetimeInput = page.locator("input[type='datetime-local']")
    await expect(datetimeInput).toBeVisible()
    await datetimeInput.fill("2026-12-31T23:59")

    const submitButton = page.locator("button:has-text('예약 등록')")
    await expect(submitButton).toBeEnabled()

    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("예약게시글 작성 완료")
      await dialog.accept()
    })

    await submitButton.click()
  })
})
