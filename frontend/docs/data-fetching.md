# Data Fetching

Next.js App Router 환경에서 TanStack Query를 사용해 데이터를 패치하고 전역 상태를 관리한다.
SSR 단계에서 서버가 데이터를 프리페치(prefetch)하고 클라이언트로 내려주어 Hydration을 수행한다.

## `queryConfig`

전역 QueryClient의 기본 옵션은 `src/shared/lib/react-query.ts`에 정의되어 있다.

```ts
export const queryConfig: DefaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  },
}
```

이 옵션은 `src/app/providers.tsx`의 `<QueryClientProvider>`에서 주입된다.

## `dehydrate`와 `HydrationBoundary`

서버 컴포넌트(`page.tsx`)에서 데이터를 미리 요청하고, 완성된 캐시 상태를 직렬화하여 클라이언트로 넘긴다.

```ts
export default async function CommunityPostsPage() {
  const queryClient = new QueryClient()

  // 서버 사이드에서 첫 페이지 미리 페칭
  await prefetchGetPostsByCursorInfiniteQuery(queryClient, {})

  return (
    <ErrorBoundary fallback={<div>에러가 발생했습니다.</div>}>
      <Suspense fallback={<div>로딩 중...</div>}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <PostList />
        </HydrationBoundary>
      </Suspense>
    </ErrorBoundary>
  )
}
```

## Suspense Query

데이터를 소비하는 클라이언트 컴포넌트는 `useSuspenseQuery` 또는 `useSuspenseInfiniteQuery`를 사용한다.
별도의 `isLoading` 체크 없이 React의 `Suspense`에게 로딩 렌더링을 맡긴다.

```ts
export function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetPostsByCursorSuspenseInfinite(
      {},
      { query: { getNextPageParam: (lastPage) => lastPage.data.nextCursor } }
    );

  // ...
}
```

## 수동 fetch 사용 위치

대부분의 API 호출은 Orval이 생성한 훅을 사용하지만, Agent 카탈로그처럼 특별한 프록시 규칙이나 엄격한 Zod 파싱이 필요한 경우 수동으로 `fetch`를 감싼다.

```ts
export function useListAgentModelsSuspense() {
  return useSuspenseQuery({
    queryKey: ["agent", "models"],
    queryFn: async (): Promise<ChatModelOption[]> => {
      const payload = modelsResponseSchema.parse(
        await fetchAgentJson("/api/v1/llm/models")
      )
      // ...
    },
    // ...
  })
}
```

## 주요 파일

- `src/app/providers.tsx`
- `src/shared/lib/react-query.ts`
- `src/app/community/posts/page.tsx`
- `src/app/playground/page.tsx`
- `src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`
- `src/features/post/components/main-post-carousel-widget/main-post-carousel-widget-container.tsx`

## 참고 문서

- TanStack Query React 개요: https://tanstack.com/query/latest/docs/framework/react/overview
- SSR & Hydration: https://tanstack.com/query/latest/docs/framework/react/guides/ssr
- `HydrationBoundary`: https://tanstack.com/query/latest/docs/framework/react/reference/hydration
- `useSuspenseQuery`: https://tanstack.com/query/latest/docs/framework/react/reference/useSuspenseQuery
