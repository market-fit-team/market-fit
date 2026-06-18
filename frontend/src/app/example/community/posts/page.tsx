import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query"
import { CreatePost } from "@/features/post/components/create-post"
import { PostList } from "@/features/post/components/post-list"
import { prefetchGetPostsByCursorInfiniteQuery } from "@/shared/api/generated/community/endpoints/posts/posts"

// 정적쉘 없이 클라이언트 컴포넌트 위주로 진행
export const dynamic = "force-dynamic"

export default async function CommunityPostsPage() {
  const queryClient = new QueryClient()

  // 서버 사이드에서 첫 페이지 미리 페칭 (Prefetch)
  await prefetchGetPostsByCursorInfiniteQuery(queryClient, {})

  return (
    <main>
      <h1>커뮤니티</h1>

      {/* 새 게시글 작성 폼 */}
      <section>
        <CreatePost />
      </section>

      <hr />

      {/* 게시글 목록 (에러 바운더리와 서스펜스, 디하이드레이션 적용) */}
      <section>
        <ErrorBoundary
          fallback={<div>게시글 목록을 불러오는 중 에러가 발생했습니다.</div>}
        >
          <Suspense fallback={<div>게시글 목록 로딩 중...</div>}>
            <HydrationBoundary state={dehydrate(queryClient)}>
              <PostList />
            </HydrationBoundary>
          </Suspense>
        </ErrorBoundary>
      </section>
    </main>
  )
}
