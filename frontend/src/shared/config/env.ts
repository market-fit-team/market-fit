// src/shared/config/env.ts
// 런타임에서 env 누락으로 터지는 걸 방지 (특히 OAuth redirect_uri_mismatch 방지용 baseURL 중요)
// baseURL을 BETTER_AUTH_URL로 반드시 설정하라고 Google provider 문서에 명시되어 있습니다.
// https://better-auth.com/docs/authentication/google :contentReference[oaicite:7]{index=7}
// BETTER_AUTH_SECRET 최소 32자 요구도 Installation 문서에 명시.
// https://better-auth.com/docs/installation :contentReference[oaicite:8]{index=8}
import { z } from "zod"

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "[env] BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: z.string().min(1, "[env] BETTER_AUTH_URL is required"),
  DATABASE_URL: z.string().min(1, "[env] DATABASE_URL is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "[env] GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1, "[env] GOOGLE_CLIENT_SECRET is required"),

  JWT_ISSUER: z.string().min(1, "[env] JWT_ISSUER is required"),
  JWT_AUDIENCE: z.string().min(1, "[env] JWT_AUDIENCE is required"),
  JWT_EXPIRATION: z.string().min(1, "[env] JWT_EXPIRATION is required"),

  // NOTE:
  // Better Auth JWT plugin의 keyPairConfig.alg 설정값.
  // Spring Security/Nimbus 쪽 JWT header alg는 일반적으로 "RS256"을 기대한다.
  //
  // 근거:
  // - Better Auth JWT plugin: keyPairConfig.alg 옵션, 기본 EdDSA/Ed25519, RS256 지원
  //   https://better-auth.com/docs/plugins/jwt
  // - Spring Security NimbusJwtDecoder 기본 trusted algorithm: RS256
  //   https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
  JWT_ALGORITHM: z.enum(["RS256"]).default("RS256"),

  UPSTREAM_API_BASE_URL: z.string().optional(),
})

const createEnv = () => {
  const envVars = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION,
    JWT_ALGORITHM: process.env.JWT_ALGORITHM,
    UPSTREAM_API_BASE_URL: process.env.UPSTREAM_API_BASE_URL,
  }

  const parsedEnv = EnvSchema.safeParse(envVars)

  if (!parsedEnv.success) {
    console.error("❌ Invalid environment variables:")
    parsedEnv.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    })
    throw new Error("Invalid environment variables. Check terminal logs.")
  }

  return parsedEnv.data
}

export const env = createEnv()
