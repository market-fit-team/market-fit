// backend/echo-service/server.mjs
// Server-to-server: pass Authorization: Bearer <jwt> to profile-service

import express from "express"

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3002
const PROFILE_BASE_URL = process.env.PROFILE_BASE_URL // e.g. http://profile-service:3001

if (!PROFILE_BASE_URL) {
  console.error("[echo-service] Missing env: PROFILE_BASE_URL")
  process.exit(1)
}

const echoOpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "echo-service",
    version: "1.0.0",
  },
  tags: [{ name: "echo" }],
  paths: {
    "/echo": {
      get: {
        operationId: "getEcho",
        tags: ["echo"],
        summary: "Echo profile response",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Echo response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["from", "profile"],
                  properties: {
                    from: { type: "string" },
                    profile: {},
                  },
                },
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
  res.json(echoOpenApiDocument)
})

app.get("/health", (_req, res) => res.json({ ok: true }))

app.get("/echo", async (req, res) => {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: "NO_AUTH_HEADER" })

  const r = await fetch(`${PROFILE_BASE_URL}/user-profile`, {
    method: "GET",
    headers: {
      // JWT를 그대로 전달해 profile-service가 동일한 사용자 컨텍스트를 조회하도록 한다.
      Authorization: auth,
    },
  })

  const bodyText = await r.text()
  let body
  try { body = JSON.parse(bodyText) } catch { body = { raw: bodyText } }

  return res.status(r.status).json({
    from: "echo-service",
    profile: body,
  })
})

const server = app.listen(PORT, () => {
  console.log(`[echo-service] listening on :${PORT}`)
})

// Docker 환경에서 Node.js가 PID 1로 실행될 때 SIGTERM 시그널을 기본적으로 무시하여
// 컨테이너 종료(Recreate 등) 시 10초 타임아웃 대기가 발생하는 것을 방지하기 위한 핸들러입니다.
process.on("SIGTERM", () => {
  console.log("[echo-service] SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
})
