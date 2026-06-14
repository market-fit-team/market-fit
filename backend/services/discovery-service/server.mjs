import http from "node:http"

const PORT = Number(process.env.PORT ?? "8090")
const CONSUL_HTTP_ADDR = process.env.CONSUL_HTTP_ADDR ?? "http://consul:8500"
const PUBLIC_DISCOVERY_ORIGIN =
  process.env.PUBLIC_DISCOVERY_ORIGIN ?? `http://localhost:${PORT}`

const json = (res, status, body) => {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(payload)
}

const text = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(body)
}

const trimSlashes = (value) => value.replace(/^\/+|\/+$/g, "")

const buildBaseUrl = (service) => {
  const protocol = service.Meta?.protocol ?? "http"
  const address = service.Address || service.ServiceAddress
  const port = service.Port || service.ServicePort

  if (!address || !port) {
    throw new Error(`Service ${service.Service ?? service.ID} has no address/port`)
  }

  return `${protocol}://${address}:${port}`
}

const normalizeService = (entry) => {
  const service = entry.Service
  const meta = service.Meta ?? {}
  const name = service.Service
  const publicPath = meta.publicPath ?? `/api/${name}`
  const openapiPath = meta.openapiPath ?? "/v3/api-docs"
  const baseUrl = buildBaseUrl(service)

  return {
    id: service.ID,
    name,
    address: service.Address,
    port: service.Port,
    tags: service.Tags ?? [],
    meta,
    baseUrl,
    publicPath,
    openapiPath,
    openapiUrl: new URL(
      `/openapi/${encodeURIComponent(name)}`,
      PUBLIC_DISCOVERY_ORIGIN
    ).toString(),
    schemasType: meta.schemasType ?? "zod",
    checks: entry.Checks ?? [],
  }
}

const fetchConsulJson = async (path) => {
  const url = new URL(path, CONSUL_HTTP_ADDR)
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Consul request failed: ${response.status} ${detail}`)
  }

  return response.json()
}

const listHealthyEntries = async (serviceName) => {
  return fetchConsulJson(
    `/v1/health/service/${encodeURIComponent(serviceName)}?passing=true`
  )
}

const resolveService = async (serviceName) => {
  const entries = await listHealthyEntries(serviceName)
  const normalized = entries.map(normalizeService)
  const publicApi = normalized.find(
    (service) =>
      service.tags.includes("api") && service.tags.includes("public")
  )

  return publicApi ?? normalized[0] ?? null
}

const listCatalog = async () => {
  const services = await fetchConsulJson("/v1/catalog/services")
  const serviceNames = Object.keys(services).filter((name) => name !== "consul")
  const entries = await Promise.all(
    serviceNames.map(async (name) => {
      try {
        const service = await resolveService(name)
        return service
      } catch (error) {
        return {
          name,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    })
  )

  return entries.filter(Boolean)
}

const sendOpenApi = async (res, serviceName) => {
  const service = await resolveService(serviceName)

  if (!service) {
    json(res, 404, { error: "SERVICE_NOT_FOUND", service: serviceName })
    return
  }

  if (!service.tags.includes("orval")) {
    json(res, 403, { error: "SERVICE_NOT_EXPOSED_TO_ORVAL", service: serviceName })
    return
  }

  const openapiUrl = new URL(trimSlashes(service.openapiPath), `${service.baseUrl}/`)
  const upstream = await fetch(openapiUrl, {
    headers: { accept: "application/json" },
    cache: "no-store",
  })

  const body = await upstream.arrayBuffer()
  const headers = {
    "content-type":
      upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    "cache-control": "no-store",
  }

  res.writeHead(upstream.status, headers)
  res.end(Buffer.from(body))
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true })
      return
    }

    if (req.method === "GET" && url.pathname === "/catalog") {
      json(res, 200, { services: await listCatalog() })
      return
    }

    if (req.method === "GET" && url.pathname === "/catalog/orval") {
      const services = (await listCatalog())
        .filter(
          (service) =>
            !service.error &&
            service.tags.includes("api") &&
            service.tags.includes("public") &&
            service.tags.includes("orval")
        )
        .map((service) => ({
          name: service.name,
          openapiUrl: service.openapiUrl,
          publicPath: service.publicPath,
          openapiPath: service.openapiPath,
          schemasType: service.schemasType,
          tags: service.tags,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      json(res, 200, { services })
      return
    }

    if (req.method === "GET" && url.pathname.startsWith("/resolve/")) {
      const serviceName = decodeURIComponent(url.pathname.slice("/resolve/".length))
      const service = await resolveService(serviceName)

      if (!service) {
        json(res, 404, { error: "SERVICE_NOT_FOUND", service: serviceName })
        return
      }

      json(res, 200, { service })
      return
    }

    if (req.method === "GET" && url.pathname.startsWith("/openapi/")) {
      const serviceName = decodeURIComponent(url.pathname.slice("/openapi/".length))
      await sendOpenApi(res, serviceName)
      return
    }

    text(res, 404, "not found")
  } catch (error) {
    json(res, 500, {
      error: "DISCOVERY_SERVER_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    })
  }
})

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[discovery-service] listening on :${PORT}`)
  console.log(`[discovery-service] consul=${CONSUL_HTTP_ADDR}`)
})
