import { execFile } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, "../..")
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"

const normalizeLabels = (labels) => {
  if (!labels) return {}

  if (Array.isArray(labels)) {
    return Object.fromEntries(
      labels.map((label) => {
        const separatorIndex = label.indexOf("=")

        if (separatorIndex === -1) {
          return [label, "true"]
        }

        return [
          label.slice(0, separatorIndex),
          label.slice(separatorIndex + 1),
        ]
      })
    )
  }

  return labels
}

const requireLabel = (labels, key, serviceName) => {
  const value = labels[key]

  if (!value) {
    throw new Error(`Missing ${key} label on ${serviceName}`)
  }

  return value
}

const { stdout } = await execFileAsync(
  "docker",
  ["compose", "config", "--format", "json"],
  {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 10,
  }
)

const compose = JSON.parse(stdout)
const services = Object.entries(compose.services ?? {})
  .map(([composeName, service]) => {
    const labels = normalizeLabels(service.labels)

    if (labels["app.api.enabled"] !== "true") {
      return null
    }

    const name = labels["app.api.name"] ?? composeName
    const publicPath = requireLabel(labels, "app.api.publicPath", composeName)
    const openapiPath = requireLabel(labels, "app.api.openapiPath", composeName)
    const schemasType = labels["app.api.schemasType"] ?? "zod"
    const openapiUrl = new URL(`${publicPath}${openapiPath}`, apiOrigin).toString()

    return {
      name,
      openapiUrl,
      publicPath,
      openapiPath,
      schemasType,
      composeService: composeName,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name))

if (services.length === 0) {
  throw new Error("No app.api.enabled=true services found in docker-compose.yml")
}

const catalog = { services }

await mkdir(".orval", { recursive: true })
await writeFile(
  ".orval/service-catalog.json",
  JSON.stringify(catalog, null, 2)
)

console.log(
  `[orval] wrote .orval/service-catalog.json from docker compose labels (${services.length} services)`
)
