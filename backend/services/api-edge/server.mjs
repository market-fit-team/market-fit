import http from "node:http"
import { Readable } from "node:stream"

const PORT = Number(process.env.PORT ?? "8088")
const DISCOVERY_INTERNAL_ORIGIN =
  process.env.DISCOVERY_INTERNAL_ORIGIN ?? "http://discovery-service:8090"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
])

const trimSlashes = (value) => value.replace(/^\/+|\/+$/g, "")

const getCorsOrigin = (origin) => {
  if (!origin) return ""
  if (ALLOWED_ORIGINS.includes("*")) return "*"
  return ALLOWED_ORIGINS.includes(origin) ? origin : ""
}

const applyCors = (req, headers = {}) => {
  const corsOrigin = getCorsOrigin(req.headers.origin)
  const nextHeaders = { ...headers, vary: "Origin" }

  if (corsOrigin) {
    nextHeaders["access-control-allow-origin"] = corsOrigin
    nextHeaders["access-control-allow-methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    nextHeaders["access-control-allow-headers"] =
      req.headers["access-control-request-headers"] ??
      "Authorization,Content-Type,X-CSRF-Token"
    nextHeaders["access-control-max-age"] = "86400"

    if (corsOrigin !== "*") {
      nextHeaders["access-control-allow-credentials"] = "true"
    }
  }

  return nextHeaders
}

const json = (req, res, status, body) => {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, applyCors(req, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  }))
  res.end(payload)
}

const resolveService = async (serviceName) => {
  const response = await fetch(
    new URL(`/resolve/${encodeURIComponent(serviceName)}`, DISCOVERY_INTERNAL_ORIGIN),
    { headers: { accept: "application/json" }, cache: "no-store" }
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw Object.assign(new Error(`service resolve failed: ${response.status} ${detail}`), {
      status: response.status,
    })
  }

  const payload = await response.json()
  return payload.service
}

const buildUpstreamHeaders = (req) => {
  const headers = new Headers()

  for (const [name, value] of Object.entries(req.headers)) {
    const lowerName = name.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lowerName)) continue
    if (Array.isArray(value)) {
      headers.set(name, value.join(", "))
      continue
    }
    if (typeof value === "string") {
      headers.set(name, value)
    }
  }

  const forwardedFor = req.socket.remoteAddress
    ? `${headers.get("x-forwarded-for") ? `${headers.get("x-forwarded-for")}, ` : ""}${req.socket.remoteAddress}`
    : headers.get("x-forwarded-for")

  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor)
  headers.set("x-forwarded-proto", "http")

  return headers
}

const proxyRequest = async (req, res, url) => {
  const [, apiPrefix, serviceName, ...rest] = url.pathname.split("/")

  if (apiPrefix !== "api" || !serviceName) {
    json(req, res, 404, { error: "NOT_FOUND" })
    return
  }

  const service = await resolveService(serviceName)

  if (!service.tags?.includes("api") || !service.tags?.includes("public")) {
    json(req, res, 403, { error: "SERVICE_NOT_PUBLIC", service: serviceName })
    return
  }

  const upstreamPath = rest.length > 0 ? trimSlashes(rest.join("/")) : ""
  const upstreamUrl = new URL(upstreamPath, `${service.baseUrl}/`)
  upstreamUrl.search = url.search

  const method = req.method?.toUpperCase() ?? "GET"
  const init = {
    method,
    headers: buildUpstreamHeaders(req),
    redirect: "manual",
  }

  if (method !== "GET" && method !== "HEAD") {
    init.body = req
    init.duplex = "half"
  }

  const upstream = await fetch(upstreamUrl, init)
  const responseHeaders = {}

  upstream.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      responseHeaders[name] = value
    }
  })

  res.writeHead(upstream.status, applyCors(req, responseHeaders))

  if (!upstream.body) {
    res.end()
    return
  }

  Readable.fromWeb(upstream.body).pipe(res)
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)

    if (req.method === "OPTIONS") {
      res.writeHead(204, applyCors(req))
      res.end()
      return
    }

    if (req.method === "GET" && url.pathname === "/health") {
      json(req, res, 200, { ok: true })
      return
    }

    await proxyRequest(req, res, url)
  } catch (error) {
    json(req, res, error.status ?? 500, {
      error: "API_EDGE_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})

server.requestTimeout = 0
server.headersTimeout = 0

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[api-edge] listening on :${PORT}`)
  console.log(`[api-edge] discovery=${DISCOVERY_INTERNAL_ORIGIN}`)
})
