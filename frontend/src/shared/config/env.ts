// src/shared/config/env.ts
import { z } from "zod"

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "[env] BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: z.string().min(1, "[env] BETTER_AUTH_URL is required"),

  AUTHENTIK_CLIENT_ID: z
    .string()
    .min(1, "[env] AUTHENTIK_CLIENT_ID is required"),
  AUTHENTIK_CLIENT_SECRET: z
    .string()
    .min(1, "[env] AUTHENTIK_CLIENT_SECRET is required"),
  AUTHENTIK_DISCOVERY_URL: z
    .string()
    .min(1, "[env] AUTHENTIK_DISCOVERY_URL is required"),

  NEXT_PUBLIC_API_ORIGIN: z.string().optional(),
  AGENT_ASSISTANT_ID: z.string().default("chat"),
})

const createEnv = () => {
  const envVars = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
    AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
    AUTHENTIK_DISCOVERY_URL: process.env.AUTHENTIK_DISCOVERY_URL,
    NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN,
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
