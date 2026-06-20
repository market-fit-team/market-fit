// src/features/auth/lib/auth.ts
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { getAccountCookie } from "better-auth/cookies"
import { nextCookies } from "better-auth/next-js"
import { decryptOAuthToken } from "better-auth/oauth2"
import { customSession, genericOAuth } from "better-auth/plugins"
import { decodeJwt } from "jose"
import { z } from "zod"
import { env } from "@/shared/config/env"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

// Access token 전체를 믿지 않고, 세션 user에 필요한 user_profile claim만 엄격하게 검증한다.
const authentikUserProfileSchema = z.object({
  uuid: z.string(),
  display_name: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  job: z.string().nullable().optional(),
  avatar_seed: z.string().nullable().optional(),
})

const getAuthentikAccessToken = async (
  ctx: Parameters<typeof getAccountCookie>[0],
  userId: string
) => {
  // Stateless 모드에서는 account_data 쿠키에 최근 OAuth 계정 정보가 들어 있으므로 먼저 이 경로를 본다.
  const accountCookie = await getAccountCookie(ctx)

  if (
    accountCookie?.providerId === AUTHENTIK_PROVIDER_ID &&
    accountCookie.userId === userId &&
    accountCookie.accessToken
  ) {
    return await decryptOAuthToken(accountCookie.accessToken, ctx.context)
  }

  // 쿠키에 원하는 계정 정보가 없으면 연결된 provider account 레코드에서 access token을 다시 찾는다.
  const accounts = await ctx.context.internalAdapter.findAccounts(userId)
  const authentikAccount = accounts.find(
    (account) => account.providerId === AUTHENTIK_PROVIDER_ID
  )

  if (!authentikAccount?.accessToken) {
    throw new Error("Authentik access token을 찾을 수 없습니다.")
  }

  return await decryptOAuthToken(authentikAccount.accessToken, ctx.context)
}

const options = {
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  user: {
    additionalFields: {
      uuid: {
        type: "string",
        required: true,
        input: false,
      },
      displayName: {
        type: "string",
        required: false,
        input: false,
      },
      age: {
        type: "number",
        required: false,
        input: false,
      },
      job: {
        type: "string",
        required: false,
        input: false,
      },
      avatarSeed: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "authentik",
          clientId: env.AUTHENTIK_CLIENT_ID,
          clientSecret: env.AUTHENTIK_CLIENT_SECRET,
          discoveryUrl: env.AUTHENTIK_DISCOVERY_URL,
          scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
        },
      ],
    }),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ session, user }, ctx) => {
      // 세션 조회 시점마다 access token의 user_profile만 검증해 응답 user를 만든다.
      const accessToken = await getAuthentikAccessToken(ctx, user.id)
      const jwtPayload = decodeJwt(accessToken) as Record<string, unknown>
      const userProfile = authentikUserProfileSchema.parse(
        jwtPayload.user_profile
      )

      return {
        session,
        user: {
          uuid: userProfile.uuid,
          // 프론트에서는 문자열로 바로 쓸 수 있게 nullish 값만 기본값으로 치환한다.
          displayName: userProfile.display_name ?? "default",
          age: userProfile.age,
          job: userProfile.job,
          avatarSeed: userProfile.avatar_seed ?? "default",
        },
      }
    }, options),
    // Next.js Server Actions 쿠키 자동 반영. Better Auth 문서 권장대로 마지막에 둔다.
    nextCookies(),
  ],
})
