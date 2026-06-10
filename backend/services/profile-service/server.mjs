// backend/profile-service/server.mjs
// JWT verify via JWKS (remote)
// - Better Auth JWT plugin exposes JWKS endpoint: /api/auth/jwks
//   https://better-auth.com/docs/plugins/jwt
// - jose Remote JWK Set + jwtVerify:
//   https://github.com/panva/jose

import express from "express"
import { createRemoteJWKSet, jwtVerify } from "jose"

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001

const JWKS_URL = process.env.JWKS_URL // e.g. http://host.docker.internal:3000/api/auth/jwks
const JWT_ISSUER = process.env.JWT_ISSUER // must match token "iss"
const JWT_AUDIENCE = process.env.JWT_AUDIENCE // must match token "aud"
const JWT_ALGS = (process.env.JWT_ALGS ?? "RS256")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

if (!JWKS_URL || !JWT_ISSUER || !JWT_AUDIENCE) {
  console.error("[profile-service] Missing env: JWKS_URL / JWT_ISSUER / JWT_AUDIENCE")
  process.exit(1)
}

const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

function getBearer(req) {
  const h = req.headers.authorization || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]
}

const profileOpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "profile-service",
    version: "1.0.0",
  },
  tags: [{ name: "profile" }],
  paths: {
    "/me": {
      get: {
        operationId: "getMe",
        tags: ["profile"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string" },
                    sub: { type: "string", nullable: true },
                    iss: { type: "string", nullable: true },
                    aud: {
                      oneOf: [
                        { type: "string" },
                        {
                          type: "array",
                          items: { type: "string" },
                        },
                      ],
                      nullable: true,
                    },
                    alg: { type: "string", nullable: true },
                    kid: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid token payload",
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
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          detail: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  },
}

app.get("/v3/api-docs", (_req, res) => {
  res.json(profileOpenApiDocument)
})

app.get("/health", (_req, res) => res.json({ ok: true }))

app.get("/me", async (req, res) => {
  try {
    const token = getBearer(req)
    if (!token) return res.status(401).json({ error: "NO_BEARER" })

    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: JWT_ALGS, // ✅ allowlist (don’t trust alg from token blindly)
    })

    // Better Auth JWT definePayload에서 email을 넣었다는 가정
    // https://better-auth.com/docs/plugins/jwt
    const email = payload.email
    if (!email) return res.status(400).json({ error: "NO_EMAIL_IN_TOKEN", header: protectedHeader })

    return res.json({
      email,
      sub: payload.sub,
      iss: payload.iss,
      aud: payload.aud,
      alg: protectedHeader.alg,
      kid: protectedHeader.kid,
    })
  } catch (e) {
    return res.status(401).json({ error: "INVALID_TOKEN", detail: String(e?.message ?? e) })
  }
})

app.listen(PORT, () => {
  console.log(`[profile-service] listening on :${PORT}`)
})
