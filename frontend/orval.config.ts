import { existsSync, readFileSync } from "node:fs"
import {
  type Config,
  type Options,
  type SchemaGenerationType,
  defineConfig,
} from "orval"

const GENERATED_ROOT = "src/shared/api/generated"
const CATALOG_PATH = ".orval/service-catalog.json"

type CatalogService = {
  name: string
  openapiUrl: string
  publicPath: string
  schemasType?: SchemaGenerationType
}

type ServiceCatalog = {
  services: CatalogService[]
}

const readCatalog = (): ServiceCatalog => {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(
      `${CATALOG_PATH} is missing. Run \"npm run api:catalog\" before Orval.`
    )
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as ServiceCatalog

  if (!Array.isArray(catalog.services)) {
    throw new Error(`${CATALOG_PATH} must contain a services array.`)
  }

  return catalog
}

const createProject = (service: CatalogService): Options => {
  return {
    input: {
      target: service.openapiUrl,
    },
    output: {
      mode: "tags-split",
      target: `${GENERATED_ROOT}/${service.name}/endpoints`,
      schemas: {
        path: `${GENERATED_ROOT}/${service.name}/schemas`,
        type: service.schemasType ?? "zod",
      },
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      namingConvention: "kebab-case",
      baseUrl: {
        runtime: `(process.env.NEXT_PUBLIC_API_ORIGIN ?? "") + "${service.publicPath}"`,
      },
      override: {
        mutator: {
          path: "./src/features/auth/lib/fetch-with-auth.ts",
          name: "fetchWithAuth",
        },
        query: {
          useSuspenseQuery: true,
          useSuspenseInfiniteQuery: true,
          useInfiniteQueryParam: "cursor",
          usePrefetch: true,
          useInvalidate: true,
          useSetQueryData: true,
          useGetQueryData: true,
          signal: true,
        },
        fetch: {
          includeHttpResponseReturnType: true,
          forceSuccessResponse: true,
          runtimeValidation: false,
        },
      },
    },
  }
}

export default defineConfig((): Config => {
  const catalog = readCatalog()

  return Object.fromEntries(
    catalog.services.map((service) => [
      `${service.name}-api`,
      createProject(service),
    ])
  )
})
