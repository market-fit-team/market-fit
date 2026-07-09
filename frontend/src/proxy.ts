// Next.js 16부터 middleware 파일 컨벤션이 proxy로 변경되었습니다.
// 공식 문서: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//
// Better Auth도 Next.js 16에서 proxy.ts 사용 예시를 제공합니다.
// 공식 문서: https://better-auth.com/docs/integrations/next
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/features/auth/lib/auth"

export const proxy = async (request: NextRequest) => {
  // 진짜 보안 검증은 각 Route Handler / RSC / Server Action에서도 다시 해야 합니다.
  // 다만 /chat 진입 시에는 여기서 먼저 세션 유무를 확인해 로그인 페이지로 보냅니다.
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackURL", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat", "/chat/:path*"],
}
