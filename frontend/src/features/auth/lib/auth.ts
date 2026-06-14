// src/features/auth/lib/auth.ts
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { genericOAuth, keycloak } from "better-auth/plugins"
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
        keycloak({
          clientId: env.KEYCLOAK_CLIENT_ID,
          clientSecret: env.KEYCLOAK_CLIENT_SECRET,
          issuer: env.KEYCLOAK_ISSUER,
          scopes: ["openid", "profile", "email"],
        }),
      ],
    }),

    // Next.js Server Actions 쿠키 자동 반영. Better Auth 문서 권장대로 마지막에 둔다.
    nextCookies(),
  ],
})
