"use client"

import type { ReactNode } from "react"
import { ArrowRight, BookOpen, CalendarDays, Sparkles } from "lucide-react"
import type { PostSourceType } from "@/features/post/types/post"
import { Skeleton } from "@/shared/components/ui/skeleton"

export type MainPostCarouselItem = {
  id: string
  title: string
  summary: string
  thumbnailUrl: string | null
  sourceType: PostSourceType
  createdAt: string
}

type MainPostCarouselWidgetProps = {
  posts?: MainPostCarouselItem[]
  isLoading?: boolean
  error?: string | null
  onPostClick?: (postId: string) => void
  headerActions?: ReactNode
}

const sourceLabels: Record<PostSourceType, string> = {
  LLM_REPORT: "AI 칼럼",
  CRAWLING: "크롤링",
  MANUAL: "일반",
}

const isMockPost = (post: MainPostCarouselItem) =>
  post.id.startsWith("00000000")

const getBadgeLabel = (post: MainPostCarouselItem) => {
  if (isMockPost(post)) return "예시"
  if (post.sourceType === "LLM_REPORT") return "AI 칼럼"
  return sourceLabels[post.sourceType]
}

function LoadingState() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)]"
      role="status"
      aria-label="게시글을 불러오는 중"
    >
      <div className="flex min-h-[210px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-8 h-8 w-5/6" />
        <Skeleton className="mt-3 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />
        <Skeleton className="mt-6 h-8 w-28" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
      <span className="sr-only">게시글을 불러오는 중입니다.</span>
    </div>
  )
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR")

function PostBadge({ post }: { post: MainPostCarouselItem }) {
  return (
    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      {getBadgeLabel(post)}
    </span>
  )
}

function FeaturedPost({
  post,
  onPostClick,
}: {
  post: MainPostCarouselItem
  onPostClick?: (postId: string) => void
}) {
  return (
    <article className="flex min-h-[200px] rounded-xl border border-border bg-card shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PostBadge post={post} />
          <time
            dateTime={post.createdAt}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(post.createdAt)}
          </time>
        </div>

        <div className="pt-6">
          <h3 className="line-clamp-2 text-xl leading-tight font-bold break-keep text-foreground">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 break-keep text-muted-foreground">
            {post.summary}
          </p>
          {onPostClick ? (
            <button
              type="button"
              aria-label={`${post.title} 게시글 보기`}
              className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => onPostClick(post.id)}
            >
              칼럼 보기
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function MainPostCarouselWidget({
  posts = [],
  isLoading = false,
  error = null,
  onPostClick,
  headerActions = null,
}: MainPostCarouselWidgetProps = {}) {
  const visiblePosts = posts.slice(0, 4)
  const featuredPost = visiblePosts[0]
  const secondaryPosts = visiblePosts.slice(1)

  return (
    <section className="space-y-5" aria-labelledby="main-post-carousel-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Market intelligence
          </p>
          <h2
            id="main-post-carousel-title"
            className="flex items-center gap-2 text-xl font-bold break-keep text-foreground sm:text-2xl"
          >
            <BookOpen className="size-5" aria-hidden="true" />
            뉴스 기반 창업 인사이트 AI 칼럼
          </h2>
        </div>
        {headerActions ?? (
          <span className="hidden text-xs text-neutral-400 sm:block">
            최신 칼럼
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-14 text-center text-sm text-red-700"
        >
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-5 text-center">
          <Sparkles
            className="mb-3 size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-foreground">
            아직 표시할 AI 칼럼이 없습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            새로운 AI 칼럼이 발행되면 여기에 표시됩니다.
          </p>
        </div>
      ) : featuredPost ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)]">
          <FeaturedPost post={featuredPost} onPostClick={onPostClick} />

          {secondaryPosts.length > 0 ? (
            <div className="grid gap-3">
              {secondaryPosts.map((post) => (
                <article
                  key={post.id}
                  className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {getBadgeLabel(post)}
                    </span>
                    <time
                      dateTime={post.createdAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatDate(post.createdAt)}
                    </time>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm leading-5 font-bold break-keep text-foreground">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 break-keep text-muted-foreground">
                    {post.summary}
                  </p>
                  {onPostClick ? (
                    <button
                      type="button"
                      aria-label={`${post.title} 게시글 보기`}
                      className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      onClick={() => onPostClick(post.id)}
                    >
                      칼럼 보기
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
