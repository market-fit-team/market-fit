import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CreateScheduledPost } from "@/features/post/components/create-scheduled-post"

export default async function CommunityScheduledPostsPage() {
  return (
    <main>
      <h1>예약 게시글 작성</h1>

      <section>
        <ErrorBoundary
          fallback={<div>예약 게시글 작성 폼 로딩 중 에러가 발생했습니다.</div>}
        >
          <Suspense fallback={<div>예약 게시글 작성 폼 로딩 중...</div>}>
            <CreateScheduledPost />
          </Suspense>
        </ErrorBoundary>
      </section>
    </main>
  )
}
