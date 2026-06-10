// src/app/api/auth/[...all]/route.ts
// Better Auth를 Next App Router에 붙이는 공식 방식: toNextJsHandler(auth)
// 경로도 /api/auth/[...all] 유지 권장.
// https://better-auth.com/docs/integrations/next
import { type NextRequest } from "next/server"
import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/features/auth/lib/auth"

const handler = toNextJsHandler(auth)

export const GET = (req: NextRequest) => handler.GET(req)
export const POST = (req: NextRequest) => handler.POST(req)
