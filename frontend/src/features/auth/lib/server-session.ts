// src/features/auth/lib/server-session.ts
// 서버(RSC/Server Action)에서 세션 가져오는 공식 패턴: auth.api.getSession({ headers: await headers() })
// https://better-auth.com/docs/integrations/next
// auth.api 개념 문서도 동일 패턴을 안내합니다.
// https://better-auth.com/docs/concepts/api
import { headers } from "next/headers"
import { auth } from "./auth"

/**
 * Next.js 서버 환경에서 Better Auth 세션을 가져오는 얇은 편의 래퍼다.
 *
 * 라이브러리 내장 `getServerSession` 헬퍼가 아니라,
 * `auth.api.getSession({ headers: await headers() })` 반복을 줄이기 위한
 * 프로젝트 로컬 래퍼다. 필요하면 호출부에서 직접 인라인해도 무방한 성격이다.
 */
export const getServerSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  })
}
