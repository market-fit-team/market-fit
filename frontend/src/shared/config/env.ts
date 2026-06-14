// src/shared/config/env.ts
import { z } from "zod"

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "[env] BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: z.string().min(1, "[env] BETTER_AUTH_URL is required"),
  DATABASE_URL: z.string().min(1, "[env] DATABASE_URL is required"),

  KEYCLOAK_CLIENT_ID: z
    .string()
    .min(1, "[env] KEYCLOAK_CLIENT_ID is required"),
  KEYCLOAK_CLIENT_SECRET: z
    .string()
    .min(1, "[env] KEYCLOAK_CLIENT_SECRET is required"),
  KEYCLOAK_ISSUER: z.string().min(1, "[env] KEYCLOAK_ISSUER is required"),

  NEXT_PUBLIC_API_ORIGIN: z.string().optional(),
  DISCOVERY_ORIGIN: z.string().optional(),
  AGENT_ASSISTANT_ID: z.string().default("chat"),
})

const createEnv = () => {
  const envVars = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN,
    DISCOVERY_ORIGIN: process.env.DISCOVERY_ORIGIN,
    AGENT_ASSISTANT_ID: process.env.AGENT_ASSISTANT_ID,
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
