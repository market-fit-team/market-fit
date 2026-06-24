// src/features/auth/lib/auth.ts
import { type BetterAuthOptions, betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { customSession, genericOAuth } from "better-auth/plugins"
import { decodeJwt } from "jose"
import { z } from "zod"
import { env } from "@/shared/config/env"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

// Authentik access token 전체를 믿지 않고, 필요한 claim만 검증해 user 필드로 옮긴다.
const authentikUserProfileSchema = z.object({
  uuid: z.string(),
  display_name: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  job: z.string().nullable().optional(),
  avatar_seed: z.string().nullable().optional(),
})

const authentikAccessTokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  user_profile: authentikUserProfileSchema,
})

type StoredAuthentikUserProfile = {
  uuid: string
  displayName?: string | null
  age?: number | null
  job?: string | null
  avatarSeed?: string | null
}

type AuthentikGenericOAuthMappedUser = {
  id?: string
  createdAt?: Date
  updatedAt?: Date
  email?: string
  emailVerified?: boolean
  name?: string
  image?: string | null
} & StoredAuthentikUserProfile

type AuthentikOAuthUserInfo = {
  id: string
  email: string
  emailVerified: boolean
  name: string
  image?: string
  user_profile: z.infer<typeof authentikUserProfileSchema>
}

const parseAuthentikAccessToken = (accessToken: string) => {
  const jwtPayload = decodeJwt(accessToken) as Record<string, unknown>

  return authentikAccessTokenPayloadSchema.parse(jwtPayload)
}

const toStoredAuthentikUserProfile = (
  userProfile: z.infer<typeof authentikUserProfileSchema>
): AuthentikGenericOAuthMappedUser => {
  return {
    uuid: userProfile.uuid,
    displayName: userProfile.display_name ?? "default",
    age: userProfile.age,
    job: userProfile.job,
    avatarSeed: userProfile.avatar_seed ?? "default",
  }
}

const toSessionUser = (user: StoredAuthentikUserProfile) => {
  return {
    uuid: user.uuid,
    displayName: user.displayName ?? "default",
    age: user.age,
    job: user.job,
    avatarSeed: user.avatarSeed ?? "default",
  }
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
        input: true,
      },
      age: {
        type: "number",
        required: false,
        input: true,
      },
      job: {
        type: "string",
        required: false,
        input: true,
      },
      avatarSeed: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: AUTHENTIK_PROVIDER_ID,
          clientId: env.AUTHENTIK_CLIENT_ID,
          clientSecret: env.AUTHENTIK_CLIENT_SECRET,
          discoveryUrl: env.AUTHENTIK_DISCOVERY_URL,
          scopes: [
            "openid",
            "profile",
            "email",
            "user_profile",
            "offline_access",
          ],
          overrideUserInfo: true,
          async getUserInfo(tokens) {
            if (!tokens.accessToken) {
              return null
            }

            const jwtPayload = parseAuthentikAccessToken(tokens.accessToken)
            const userInfo: AuthentikOAuthUserInfo = {
              id: jwtPayload.sub,
              email: jwtPayload.email,
              emailVerified: jwtPayload.email_verified ?? false,
              name:
                jwtPayload.user_profile.display_name ??
                jwtPayload.name ??
                jwtPayload.email,
              image: jwtPayload.picture ?? undefined,
              user_profile: jwtPayload.user_profile,
            }

            return userInfo
          },
          mapProfileToUser(profile) {
            return toStoredAuthentikUserProfile(
              authentikUserProfileSchema.parse(profile.user_profile)
            )
          },
        },
      ],
    }),
  ],
} satisfies BetterAuthOptions

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ session, user }) => {
      return {
        session,
        user: toSessionUser(user),
      }
    }, options),
    // Next.js Server Actions 쿠키 자동 반영. Better Auth 문서 권장대로 마지막에 둔다.
    nextCookies(),
  ],
})
