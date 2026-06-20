import express from "express"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { z } from "zod"

const app = express()
app.use(express.json())

const PORT = Number(process.env.PORT || 3001)
const JWKS_URL = process.env.JWKS_URL
const JWT_ISSUER = process.env.JWT_ISSUER
const JWT_AUDIENCE = process.env.JWT_AUDIENCE
const JWT_ALGS = (process.env.JWT_ALGS || process.env.JWT_ALGORITHM || "RS256")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
const AUTHENTIK_API_URL = (
  process.env.AUTHENTIK_API_URL || "http://authentik-server:9000/api/v3"
).replace(/\/+$/, "")
const AUTHENTIK_SERVICE_ROLE_KEY = process.env.AUTHENTIK_SERVICE_ROLE_KEY

if (
  !JWKS_URL ||
  !JWT_ISSUER ||
  !JWT_AUDIENCE ||
  !AUTHENTIK_SERVICE_ROLE_KEY
) {
  console.error(
    "[profile-service] Missing env: JWKS_URL / JWT_ISSUER / JWT_AUDIENCE / AUTHENTIK_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const jwks = createRemoteJWKSet(new URL(JWKS_URL))
const profileFieldKeys = ["display_name", "age", "job", "avatar_seed"]

const profileUpdateSchema = z
  .object({
    display_name: z.string().min(1).max(100).nullable().optional(),
    age: z.number().int().min(0).max(150).nullable().optional(),
    job: z.string().min(1).max(100).nullable().optional(),
    avatar_seed: z.string().min(1).max(100).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  })

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getNestedUserProfile = (payload) => {
  if (!isRecord(payload) || !isRecord(payload.user_profile)) {
    return {}
  }

  return payload.user_profile
}

const toNullableString = (value) => {
  return typeof value === "string" ? value : null
}

const toNullableInteger = (value) => {
  return Number.isInteger(value) ? value : null
}

const buildProfileResponseFromClaims = (payload) => {
  const nestedUserProfile = getNestedUserProfile(payload)

  return {
    authentik_user_uuid:
      toNullableString(nestedUserProfile.authentik_user_uuid) ||
      toNullableString(payload.authentik_user_uuid),
    display_name:
      toNullableString(nestedUserProfile.display_name) ||
      toNullableString(payload.display_name),
    age:
      toNullableInteger(nestedUserProfile.age) ??
      toNullableInteger(payload.age),
    job: toNullableString(nestedUserProfile.job) || toNullableString(payload.job),
    avatar_seed:
      toNullableString(nestedUserProfile.avatar_seed) ||
      toNullableString(payload.avatar_seed),
  }
}

const buildProfileResponseFromAuthentikUser = (user) => {
  const attributes = isRecord(user?.attributes) ? user.attributes : {}

  return {
    authentik_user_uuid: toNullableString(user?.uuid),
    display_name: toNullableString(attributes.display_name),
    age: toNullableInteger(attributes.age),
    job: toNullableString(attributes.job),
    avatar_seed: toNullableString(attributes.avatar_seed),
  }
}

const profileOpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "profile-service",
    version: "1.0.0",
  },
  tags: [{ name: "profile" }],
  paths: {
    "/user-profile": {
      get: {
        operationId: "getMyProfile",
        tags: ["profile"],
        summary: "Read current profile directly from Authentik",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfileResponse" },
              },
            },
          },
          400: {
            description: "Invalid JWT profile claims",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        operationId: "patchMyProfile",
        tags: ["profile"],
        summary: "Update current profile in authentik with JWT and service role key",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProfileUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Updated profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfileResponse" },
              },
            },
          },
          400: {
            description: "Invalid request body or JWT profile claims",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Authentik user not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          502: {
            description: "Authentik upstream error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ProfileResponse: {
        type: "object",
        required: [
          "authentik_user_uuid",
          "display_name",
          "age",
          "job",
          "avatar_seed",
        ],
        properties: {
          authentik_user_uuid: {
            type: "string",
            format: "uuid",
            nullable: true,
          },
          display_name: {
            type: "string",
            nullable: true,
          },
          age: {
            type: "integer",
            nullable: true,
          },
          job: {
            type: "string",
            nullable: true,
          },
          avatar_seed: {
            type: "string",
            nullable: true,
          },
        },
      },
      ProfileUpdateRequest: {
        type: "object",
        properties: {
          display_name: {
            type: "string",
            nullable: true,
          },
          age: {
            type: "integer",
            nullable: true,
          },
          job: {
            type: "string",
            nullable: true,
          },
          avatar_seed: {
            type: "string",
            nullable: true,
          },
        },
        additionalProperties: false,
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          detail: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                path: {
                  type: "array",
                  items: {
                    anyOf: [{ type: "string" }, { type: "integer" }],
                  },
                },
              },
            },
          },
        },
        additionalProperties: true,
      },
    },
  },
}

const readJsonResponse = async (response) => {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const createHttpError = (status, error, detail, extra = {}) => {
  return { status, body: { error, detail, ...extra } }
}

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.split(" ")
  if (scheme !== "Bearer" || !token) {
    return null
  }

  return token
}

const requireAuthentikUserUuid = (payload) => {
  const profile = buildProfileResponseFromClaims(payload)
  if (!profile.authentik_user_uuid) {
    throw createHttpError(
      400,
      "NO_AUTHENTIK_USER_UUID",
      "JWT does not contain authentik_user_uuid"
    )
  }

  return profile.authentik_user_uuid
}

const verifyAccessToken = async (authorizationHeader) => {
  const accessToken = getBearerToken(authorizationHeader)
  if (!accessToken) {
    throw createHttpError(401, "NO_AUTH_HEADER", "Authorization Bearer token is required")
  }

  try {
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: JWT_ALGS,
    })

    return payload
  } catch (error) {
    throw createHttpError(401, "INVALID_JWT", error.message)
  }
}

const findAuthentikUserByUuid = async (userUuid) => {
  const url = new URL(`${AUTHENTIK_API_URL}/core/users/`)
  url.searchParams.set("uuid", userUuid)
  url.searchParams.set("page_size", "1")

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}`,
    },
  })

  const body = await readJsonResponse(response)
  if (!response.ok) {
    throw createHttpError(
      502,
      "AUTHENTIK_USER_LOOKUP_FAILED",
      `authentik lookup failed with status ${response.status}`,
      { upstream: body }
    )
  }

  const user = Array.isArray(body?.results) ? body.results[0] : null
  if (!user) {
    throw createHttpError(404, "AUTHENTIK_USER_NOT_FOUND", "authentik user was not found")
  }

  return user
}

const patchAuthentikUser = async (pk, patchPayload) => {
  const response = await fetch(`${AUTHENTIK_API_URL}/core/users/${pk}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchPayload),
  })

  const body = await readJsonResponse(response)
  if (!response.ok) {
    throw createHttpError(
      502,
      "AUTHENTIK_USER_UPDATE_FAILED",
      `authentik update failed with status ${response.status}`,
      { upstream: body }
    )
  }

  return body
}

const authenticateRequest = async (req, res, next) => {
  try {
    res.locals.jwtPayload = await verifyAccessToken(req.headers.authorization)
    next()
  } catch (error) {
    next(error)
  }
}

app.get("/v3/api-docs", (_req, res) => {
  res.json(profileOpenApiDocument)
})

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/user-profile", authenticateRequest, async (req, res, next) => {
  try {
    const authentikUserUuid = requireAuthentikUserUuid(res.locals.jwtPayload)
    const user = await findAuthentikUserByUuid(authentikUserUuid)
    res.json(buildProfileResponseFromAuthentikUser(user))
  } catch (error) {
    next(error)
  }
})

app.patch("/user-profile", authenticateRequest, async (req, res, next) => {
  try {
    const jwtPayload = res.locals.jwtPayload
    const authentikUserUuid = requireAuthentikUserUuid(jwtPayload)
    const updateBody = profileUpdateSchema.parse(req.body)
    const user = await findAuthentikUserByUuid(authentikUserUuid)
    const currentAttributes = isRecord(user.attributes) ? user.attributes : {}
    const nextAttributes = { ...currentAttributes }

    // null을 보내면 해당 프로필 키를 삭제하고, 값이 있으면 덮어쓴다.
    for (const key of profileFieldKeys) {
      if (!(key in updateBody)) {
        continue
      }

      if (updateBody[key] === null) {
        delete nextAttributes[key]
        continue
      }

      nextAttributes[key] = updateBody[key]
    }

    const updatedUser = await patchAuthentikUser(user.pk, {
      attributes: nextAttributes,
    })

    res.json(buildProfileResponseFromAuthentikUser(updatedUser))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(
        createHttpError(400, "INVALID_PROFILE_UPDATE_BODY", "Profile update body is invalid", {
          issues: error.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path,
          })),
        })
      )
    }

    next(error)
  }
})

app.use((_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
  })
})

app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error?.status) ? error.status : 500
  const body = isRecord(error?.body)
    ? error.body
    : {
        error: "INTERNAL_SERVER_ERROR",
        detail: error?.message || "Unexpected error",
      }

  if (status >= 500) {
    console.error("[profile-service] request failed", error)
  }

  res.status(status).json(body)
})

const server = app.listen(PORT, () => {
  console.log(`[profile-service] listening on :${PORT}`)
})

// Docker 환경에서 PID 1로 실행될 때 종료 지연을 막기 위한 SIGTERM 핸들러다.
process.on("SIGTERM", () => {
  console.log("[profile-service] SIGTERM received. Shutting down gracefully...")
  server.close(() => {
    process.exit(0)
  })
})
