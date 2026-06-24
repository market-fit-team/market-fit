// @AGENTS AI AGENT는 이 파일을 절대 수정할 수 없습니다. 이 파일을 수정하는 모든 방안은 배재합니다.
import { existsSync, readFileSync } from "node:fs"
import { type Config, type Options, defineConfig } from "orval"
import { z } from "zod"

const GENERATED_ROOT = "src/shared/api/generated"
const CATALOG_PATH = ".orval/service-catalog.json"

const catalogServiceSchema = z.object({
  name: z.string().min(1),
  openapiUrl: z.url(),
  publicPath: z.string().startsWith("/"),
  schemasType: z.enum(["typescript", "zod"]).optional(),
})

const serviceCatalogSchema = z.object({
  services: z.array(catalogServiceSchema),
})

type CatalogService = z.infer<typeof catalogServiceSchema>
type ServiceCatalog = z.infer<typeof serviceCatalogSchema>

const readCatalog = (): ServiceCatalog => {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(
      `${CATALOG_PATH} is missing. Run \"npm run api:catalog\" before Orval.`
    )
  }

  return serviceCatalogSchema.parse(
    JSON.parse(readFileSync(CATALOG_PATH, "utf8"))
  )
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
          includeHttpResponseReturnType: false,
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
