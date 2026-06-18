// src/proxy.ts
// Next.js 16부터 middleware 파일 컨벤션이 proxy로 변경 (공식 문서).
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy :contentReference[oaicite:35]{index=35}
//
// Better Auth도 Next.js 16에서 proxy.ts 사용 예시를 공식 문서로 제공합니다.
// https://better-auth.com/docs/integrations/next :contentReference[oaicite:36]{index=36}
//
// NOTE: Next.js Proxy는 Node.js runtime이 기본이며, proxy에서 runtime config 옵션은 사용 불가(공식).
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy :contentReference[oaicite:37]{index=37}
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/features/auth/lib/auth"

export const proxy = async (request: NextRequest) => {
  // “진짜 보안”은 각 Route Handler / Server Action / RSC에서 반드시 재검증해야 함.
  // 다만 여기서는 dashboard/proxy 경로에서 빠르게 차단하려고 full session check 수행.
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    const url = new URL("/example/sign-in", request.url)
    url.searchParams.set("callbackURL", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/example/dashboard/:path*"],
}
