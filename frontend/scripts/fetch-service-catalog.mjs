import { mkdir, writeFile } from "node:fs/promises"

const DISCOVERY_ORIGIN = process.env.DISCOVERY_ORIGIN ?? "http://localhost:8090"
const catalogUrl = new URL("/catalog/orval", DISCOVERY_ORIGIN)

const response = await fetch(catalogUrl, {
  headers: { accept: "application/json" },
  cache: "no-store",
})

if (!response.ok) {
  const detail = await response.text().catch(() => "")
  throw new Error(
    `Failed to fetch Discovery catalog: ${response.status} ${detail}`
  )
}

const catalog = await response.json()

if (!catalog || !Array.isArray(catalog.services)) {
  throw new Error("Invalid Discovery catalog: services array is required")
}

await mkdir(".orval", { recursive: true })
await writeFile(
  ".orval/service-catalog.json",
  JSON.stringify(catalog, null, 2)
)

console.log(
  `[orval] wrote .orval/service-catalog.json (${catalog.services.length} services)`
)
