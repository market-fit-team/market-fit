// src/features/auth/lib/auth.ts
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { genericOAuth } from "better-auth/plugins"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { env } from "@/shared/config/env"
import { db } from "@/shared/db"
import * as schema from "@/shared/db/schema"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "authentik",
          clientId: env.AUTHENTIK_CLIENT_ID,
          clientSecret: env.AUTHENTIK_CLIENT_SECRET,
          discoveryUrl: env.AUTHENTIK_DISCOVERY_URL,
          scopes: ["openid", "profile", "email"],
        },
      ],
    }),

    // Next.js Server Actions 쿠키 자동 반영. Better Auth 문서 권장대로 마지막에 둔다.
    nextCookies(),
  ],
})
