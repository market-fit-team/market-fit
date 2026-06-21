"use client"

import { useState } from "react"
import type { ReactElement } from "react"
import { BookOpen, ImageOff } from "lucide-react"
import type { PostSourceType } from "@/features/post/types/post"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/components/ui/carousel"
import { Skeleton } from "@/shared/components/ui/skeleton"

export type MainPostCarouselItem = {
  id: string
  title: string
  summary: string
  thumbnailUrl: string | null
  sourceType: PostSourceType
  createdAt: string
}

// type MainPostCarouselWidgetProps = {
//   posts: MainPostCarouselItem[]
//   isLoading: boolean
//   error: string | null
//   onPostClick: (postId: string) => void
// }


type MainPostCarouselWidgetProps = {
  posts?: MainPostCarouselItem[]
  isLoading?: boolean
  error?: string | null
  onPostClick?: (postId: string) => void
}

const sourceLabels: Record<PostSourceType, string> = {
  LLM_REPORT: "AI 리포트",
  CRAWLING: "크롤링",
  MANUAL: "일반",
}

const sourceBadgeVariants: Record<
  PostSourceType,
  "default" | "secondary" | "outline"
> = {
  LLM_REPORT: "default",
  CRAWLING: "secondary",
  MANUAL: "outline",
}

function Thumbnail({
  thumbnailUrl,
  title,
}: Pick<MainPostCarouselItem, "thumbnailUrl" | "title">) {
  const [hasImageError, setHasImageError] = useState(false)
  const showFallback = !thumbnailUrl || hasImageError

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
      {showFallback ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"
          aria-label={`${title} 썸네일 없음`}
        >
          <ImageOff className="h-7 w-7" aria-hidden="true" />
          <span className="text-xs">이미지 없음</span>
        </div>
      ) : (
        // 크롤링 출처의 이미지 호스트는 런타임에 결정되어 Next Image allowlist를 사용할 수 없다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={`${title} 썸네일`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-label="게시글을 불러오는 중"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="py-0">
          <Skeleton className="aspect-[16/9] w-full rounded-b-none" />
          <CardContent className="space-y-3 pb-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">게시글을 불러오는 중입니다.</span>
    </div>
  )
}

export function MainPostCarouselWidget(): ReactElement
export function MainPostCarouselWidget(
  {
    posts = [],
    isLoading = false,
    error = null,
    onPostClick = () => undefined,
  }: MainPostCarouselWidgetProps = {}
) {
  return (
    <section className="space-y-5" aria-labelledby="main-post-carousel-title">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="main-post-carousel-title"
          className="text-lg font-semibold text-foreground"
        >
          최신 AI 리포트
        </h2>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-10 text-center text-sm text-destructive"
        >
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">
          아직 등록된 리포트가 없습니다.
        </div>
      ) : (
        <Carousel
          opts={{ align: "start", loop: false }}
          aria-label="최신 Post 캐러셀"
          className="px-0 sm:px-10"
        >
          <CarouselContent>
            {posts.map((post) => (
              <CarouselItem
                key={post.id}
                className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <button
                  type="button"
                  aria-label={`${post.title} 게시글 보기`}
                  className="group h-full w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  onClick={() => onPostClick(post.id)}
                >
                  <Card className="h-full gap-0 py-0 transition-colors group-hover:bg-muted/20">
                    <Thumbnail
                      thumbnailUrl={post.thumbnailUrl}
                      title={post.title}
                    />
                    <CardContent className="flex flex-1 flex-col px-5 py-5">
                      <Badge
                        variant={sourceBadgeVariants[post.sourceType]}
                        className="mb-3"
                      >
                        {sourceLabels[post.sourceType]}
                      </Badge>
                      <h3 className="line-clamp-2 text-base leading-snug font-semibold text-foreground group-hover:text-primary">
                        {post.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {post.summary}
                      </p>
                      <time
                        dateTime={post.createdAt}
                        className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground"
                      >
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </time>
                    </CardContent>
                  </Card>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 hidden sm:inline-flex" />
          <CarouselNext className="right-0 hidden sm:inline-flex" />
        </Carousel>
      )}
    </section>
  )
}
