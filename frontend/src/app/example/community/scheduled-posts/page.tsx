import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CreateScheduledPost } from "@/features/post/components/create-scheduled-post"
import { ErrorFallbackPanel } from "@/shared/components/errors/error-fallback-panel"

export default async function CommunityScheduledPostsPage() {
  return (
    <main>
      <h1>예약 게시글 작성</h1>

      <section>
        <ErrorBoundary
          fallback={
            <ErrorFallbackPanel
              title="예약 게시글 작성 폼을 불러오지 못했습니다."
              className="min-h-64 py-8"
            />
          }
        >
          <Suspense fallback={<div>예약 게시글 작성 폼 로딩 중...</div>}>
            <CreateScheduledPost />
          </Suspense>
        </ErrorBoundary>
      </section>
    </main>
  )
}
