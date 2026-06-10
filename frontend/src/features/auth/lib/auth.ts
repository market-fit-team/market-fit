// src/features/auth/lib/auth.ts
// 1) Next.js에서 Better Auth handler를 /api/auth/[...all]에 마운트하는 패턴은 공식 Next integration 문서 그대로.
// https://better-auth.com/docs/integrations/next :contentReference[oaicite:13]{index=13}
//
// 2) Google provider는 baseURL(BETTER_AUTH_URL) 설정이 필수 (redirect_uri_mismatch 방지).
// https://better-auth.com/docs/authentication/google :contentReference[oaicite:14]{index=14}
//
// 3) JWT plugin: /api/auth/token + /api/auth/jwks 제공 + issuer/audience/expirationTime/definePayload 커스터마이즈 가능.
// https://better-auth.com/docs/plugins/jwt :contentReference[oaicite:15]{index=15}
//
// 4) Next.js Server Actions에서 쿠키 set 문제는 nextCookies 플러그인으로 해결 (마지막 플러그인 권장).
// https://better-auth.com/docs/integrations/next :contentReference[oaicite:16]{index=16}
//
// 5) Drizzle Adapter는 @better-auth/drizzle-adapter 사용 (공식).
// https://better-auth.com/docs/adapters/drizzle :contentReference[oaicite:17]{index=17}
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { jwt } from "better-auth/plugins"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { env } from "@/shared/config/env"
import { db } from "@/shared/db"
import * as schema from "@/shared/db/schema"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // 필요하면 Kong/별도 도메인 등을 추가로 신뢰하도록 확장 가능
  // trustedOrigins 옵션 문서:
  // https://www.better-auth.com/docs/reference/options :contentReference[oaicite:18]{index=18}
  trustedOrigins: [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema, // Drizzle schema를 명시적으로 전달 (Drizzle adapter 문서/이슈에서 권장되는 패턴)
    // https://better-auth.com/docs/adapters/drizzle :contentReference[oaicite:19]{index=19}
  }),

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // 필요하면 항상 계정 선택 띄우기:
      // prompt: "select_account", // Google provider 옵션 예시
      // https://better-auth.com/docs/authentication/google :contentReference[oaicite:20]{index=20}
    },
  },

  plugins: [
    jwt({
      jwks: {
        keyPairConfig: {
          // NOTE:
          // Better Auth 기본 key pair algorithm은 EdDSA/Ed25519.
          // 현재 Spring community-service에서 EdDSA 토큰 검증 시
          // "Another algorithm expected, or no matching key(s) found"가 발생했다.
          //
          // Spring Security NimbusJwtDecoder는 기본적으로 RS256을 신뢰하므로,
          // Better Auth 발급 키를 RS256으로 변경한다.
          //
          // 근거:
          // - Better Auth JWT plugin: keyPairConfig.alg, RS256 지원
          //   https://better-auth.com/docs/plugins/jwt
          // - Spring Security Resource Server JWT: NimbusJwtDecoder 기본 trusted alg는 RS256
          //   https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
          alg: env.JWT_ALGORITHM,

          // NOTE:
          // Better Auth RS256 옵션.
          // 문서상 기본값도 2048.
          // https://better-auth.com/docs/plugins/jwt
          modulusLength: 2048,
        },
      },

      jwt: {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expirationTime: env.JWT_EXPIRATION,
        // 기본은 user 전체가 payload에 들어가므로, 꼭 필요한 것만 남기는 게 안전합니다.
        // https://better-auth.com/docs/plugins/jwt :contentReference[oaicite:23]{index=23}
        // NOTE:
        // Better Auth JWT의 subject 기본값은 user id.
        // community-service의 app_users.provider_subject도 이 sub 기준으로 맞춘다.
        // https://better-auth.com/docs/plugins/jwt
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
        }),
      },
    }),

    // Next.js Server Actions 쿠키 자동 반영 (공식 문서에서 "마지막" 권장)
    // https://better-auth.com/docs/integrations/next :contentReference[oaicite:24]{index=24}
    nextCookies(),
  ],
})
