import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // TODO: 실제 로그인 페이지 경로와 셀렉터에 맞춰 수정해야 합니다.
  // 이 스크립트는 Better-Auth와 연동된 로그인 플로우를 수행하여 세션을 저장합니다.
  /*
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  await page.waitForURL("/");
  */

  // 현재는 임시로 어플리케이션 루트에 방문하여 기본 쿠키만 저장합니다.
  await page.goto("/");
  
  await page.context().storageState({ path: authFile });
});
