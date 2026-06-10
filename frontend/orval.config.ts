import { type Config, type Options, defineConfig } from "orval"

const OPENAPI_GATEWAY_ORIGIN =
  process.env.OPENAPI_GATEWAY_ORIGIN ?? "http://localhost:8080"

const GENERATED_ROOT = "src/shared/api/generated"

const createProject = ({
  name,
  inputPath,
  runtimeBasePath,
}: {
  name: string
  inputPath: string
  runtimeBasePath: string
}): Options => {
  return {
    input: {
      target: new URL(inputPath, OPENAPI_GATEWAY_ORIGIN).toString(),
    },
    output: {
      mode: "tags-split",
      target: `${GENERATED_ROOT}/${name}/endpoints`,
      schemas: {
        path: `${GENERATED_ROOT}/${name}/schemas`,
        type: "zod",
      },
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      namingConvention: "kebab-case",
      baseUrl: {
        runtime: `(process.env.NEXT_PUBLIC_APP_ORIGIN ?? "") + "${runtimeBasePath}"`,
      },
      override: {
        query: {
          useSuspenseQuery: true,
          useSuspenseInfiniteQuery: true,
          useInfiniteQueryParam: "cursor",
          usePrefetch: true,
          useInvalidate: true,
          // useMutation: true, // mutaion이 없어도 post 요청은 자동 생성됨. patch, delete는 수동 생성 요망
          useSetQueryData: true,
          useGetQueryData: true,
          signal: true,
        },
        fetch: {
          // v8.16.0 버그 우회: forceSuccessResponse: true 일 때 includeHttpResponseReturnType: false 를 쓰면 타입 누락 에러 발생 (orval-labs/orval#2550)
          includeHttpResponseReturnType: true,
          forceSuccessResponse: true,
          // v8.16.0 버그 우회: schemas.type = "zod" 환경에서 true로 설정 시, Zod 객체를 'import type'으로 가져와 .parse()를 호출하는 TS 에러 발생
          runtimeValidation: false,
        },
      },
    },
  }
}

export default defineConfig((): Config => {
  return {
    "profile-api": createProject({
      name: "profile",
      inputPath: "/api/profile/v3/api-docs",
      runtimeBasePath: "/api/proxy/profile",
    }),
    "community-api": createProject({
      name: "community",
      inputPath: "/api/community/v3/api-docs",
      runtimeBasePath: "/api/proxy/community",
    }),

    "echo-api": createProject({
      name: "echo",
      inputPath: "/api/echo/v3/api-docs",
      runtimeBasePath: "/api/proxy/echo",
    }),

    "agent-api": createProject({
      name: "agent",
      inputPath: "/api/agent/openapi.json",
      runtimeBasePath: "/api/proxy/agent",
    }),
  }
})
