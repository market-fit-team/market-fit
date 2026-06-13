# API Codegen

백엔드가 제공하는 OpenAPI 문서를 읽어 Orval로 클라이언트 훅(React Query)과 스키마를 자동 생성한다.

## `orval.config.ts`

`createProject` 함수로 여러 백엔드 서비스의 문서를 동시에 처리한다.

```ts
const createProject = ({
  name,
  inputPath,
  runtimeBasePath,
  schemasType = "zod",
}) => {
  return {
    input: {
      target: new URL(inputPath, OPENAPI_GATEWAY_ORIGIN).toString(),
    },
    output: {
      mode: "tags-split",
      target: `${GENERATED_ROOT}/${name}/endpoints`,
      schemas: {
        path: `${GENERATED_ROOT}/${name}/schemas`,
        type: schemasType,
      },
      client: "react-query",
      httpClient: "fetch",
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
          useSetQueryData: true,
          useGetQueryData: true,
          signal: true,
        },
      },
    },
  }
}
```

`runtimeBasePath`에 맞춰 `baseUrl`이 구성되므로, 생성된 훅이 내부 BFF(`/api/proxy/...`) 경로를 바라보게 된다.

## 환경 변수와 경로

Orval은 `.env`의 설정값을 기반으로 동작한다.

- `OPENAPI_GATEWAY_ORIGIN`: CLI에서 `orval` 명령을 실행할 때 OpenAPI 문서를 가져올 백엔드 Gateway 주소 (예: `http://localhost:8080`)
- `NEXT_PUBLIC_APP_ORIGIN`: 생성된 훅이 SSR(Server-Side Rendering) 단계에서 데이터를 패칭할 때 필요한 절대 경로 기준 주소 (예: `http://localhost:3000`)

생성된 훅은 `NEXT_PUBLIC_APP_ORIGIN`과 `runtimeBasePath`(`/api/proxy/...`)를 결합해, 최종적으로 클라이언트와 서버 모두 `http://localhost:3000/api/proxy/...` 형태의 URL로 프록시 요청을 보낸다.

## Generated Output 경로

생성된 코드는 모두 `src/shared/api/generated` 아래에 위치한다.
`mode: "tags-split"` 설정에 따라 엔드포인트별로 파일이 나뉜다.

```ts
import { useCreatePost, invalidateGetPostsByCursorSuspenseInfinite } from "@/shared/api/generated/community/endpoints/posts/posts";
```

무효화 함수(`invalidate...`)나 prefetch 함수(`prefetch...`)도 함께 제공되어 캐시 관리에 쓰인다.

## Agent API 예외

Agent API는 `agent-api` 프로젝트로 분리되어 있으나 클라이언트 코드에서 자동 생성된 훅을 쓰지 않는다.

```ts
"agent-api": createProject({
  name: "agent",
  inputPath: "/api/agent/openapi.json",
  runtimeBasePath: "/api/proxy/agent",
  schemasType: "typescript",
}),
```

이는 Agent Server 응답 스키마를 수동으로 제어하기 위함이다. 타입 참조용으로만 `typescript` 모드로 생성하고, 실제 요청은 `src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`에서 Zod로 파싱하며 수동 `fetch`를 호출한다.

## 주요 파일

- `orval.config.ts`
- `package.json`
- `src/features/posts/components/post-list.tsx`
- `src/features/posts/components/create-post.tsx`
- `src/features/scheduled-posts/components/create-scheduled-post.tsx`
- `src/app/playground/page.tsx`

## 참고 문서

- Orval 문서: https://orval.dev/docs
- Output 설정: https://orval.dev/docs/reference/configuration/output
- React Query Integration: https://orval.dev/docs/guides/react-query
- baseURL 설정: https://orval.dev/docs/guides/set-base-url
