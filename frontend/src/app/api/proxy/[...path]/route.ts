// src/app/api/proxy/[...path]/route.ts
// 목적: 브라우저가 직접 JWT를 들고 다니지 않게 하거나,
// Next.js가 “gateway/BFF” 역할로 upstream(Kong 등)에 요청을 중계할 때 사용.
//
// JWT plugin은 /api/auth/token 으로 JWT를 발급해줍니다.
// https://better-auth.com/docs/plugins/jwt :contentReference[oaicite:33]{index=33}
//
// 세션 검증은 auth.api.getSession({ headers }) 패턴.
// https://better-auth.com/docs/integrations/next :contentReference[oaicite:34]{index=34}
import { type NextRequest } from "next/server"
import { auth } from "@/features/auth/lib/auth"
import { env } from "@/shared/config/env"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ path?: string[] }> }

const handler = async (req: NextRequest, ctx: Ctx) => {
  if (!env.UPSTREAM_API_BASE_URL) {
    return Response.json(
      { error: "UPSTREAM_API_BASE_URL is not set" },
      { status: 500 }
    )
  }

  // 1) 서버에서 세션 검증
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  // NOTE:
  // 이 route handler는 인가 정책을 판단하지 않는다.
  // 세션이 있으면 Better Auth JWT를 붙여 upstream으로 전달하고,
  // 세션이 없으면 Authorization 없이 그대로 upstream으로 전달한다.
  // 최종 인증/인가는 각 backend service의 Spring Security가 담당한다.
  let accessToken: string | undefined

  if (session) {
    const tokenRes = await fetch(new URL("/api/auth/token", req.nextUrl.origin), {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "")
      return Response.json(
        { error: "FAILED_TO_ISSUE_JWT", detail: text },
        { status: 500 }
      )
    }

    const tokenJson = (await tokenRes.json()) as { token?: string }
    accessToken = tokenJson.token
  }

  // 3) upstream URL 구성
  const resolvedParams = await ctx.params
  const path = (resolvedParams.path ?? []).join("/")
  const upstream = new URL(path, env.UPSTREAM_API_BASE_URL)
  upstream.search = req.nextUrl.search // querystring 유지

  // 4) 헤더 정리 + 신뢰 가능한 user context 주입
  const upstreamHeaders = new Headers(req.headers)
  
  // NOTE:
  // hop-by-hop/header mismatch 방지.
  // 특히 host/content-length는 proxy가 그대로 넘기면 upstream fetch에서 꼬일 수 있다.
  upstreamHeaders.delete("cookie")
  upstreamHeaders.delete("host")
  upstreamHeaders.delete("content-length")
  upstreamHeaders.delete("connection")

  // NOTE:
  // 클라이언트가 임의로 보낸 Authorization은 신뢰하지 않고,
  // 세션이 있을 때 BFF가 발급받은 JWT로만 교체한다.
  upstreamHeaders.delete("authorization")

  if (accessToken) {
    upstreamHeaders.set("authorization", `Bearer ${accessToken}`)
  }

  if (session) {
    // 내부 서비스가 편하게 쓰도록 user context를 헤더로도 넣어줌(선택)
    upstreamHeaders.set("x-user-id", session.user.id)
    upstreamHeaders.set("x-user-email", session.user.email)
  }

  // 5) 바디 전달
  const method = req.method.toUpperCase()

  // NOTE:
  // req.body ReadableStream을 그대로 upstream fetch에 넘기면
  // Next/Undici 런타임에서 "expected non-null body source"가 날 수 있다.
  // 그래서 non-GET/HEAD 요청은 body를 ArrayBuffer로 읽어서 안정적으로 전달한다.
  // JSON뿐 아니라 multipart/form-data도 content-type만 유지되면 그대로 전달 가능하다.
  const requestBody =
    method === "GET" || method === "HEAD"
      ? undefined
      : await req.arrayBuffer()

  const upstreamCtx: RequestInit = {
    method,
    headers: upstreamHeaders,
    redirect: "manual",
  }

  // NOTE:
  // 빈 body를 억지로 넣지 않는다.
  // POST라도 body가 0 byte면 undefined로 보내는 게 안전하다.
  if (requestBody && requestBody.byteLength > 0) {
    upstreamCtx.body = requestBody
  }

  // NOTE:
  // ArrayBuffer body는 ReadableStream이 아니므로 duplex 옵션이 필요 없다.
  const upstreamRes = await fetch(upstream, upstreamCtx)

  // 6) 응답 그대로 반환 (헤더는 최소한만 복사)
  const resHeaders = new Headers(upstreamRes.headers)
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
