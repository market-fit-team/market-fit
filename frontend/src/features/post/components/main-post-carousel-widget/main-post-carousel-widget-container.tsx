"use client"

import { useCallback, useEffect, useState } from "react"
import { getPost } from "@/features/post/api/post-api"
import { CommentNotificationBell } from "@/features/post/components/comment-notification-bell/comment-notification-bell"
import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"
import { PostComments } from "@/features/post/components/post-comments/post-comments"
import { PublicPostReportBell } from "@/features/post/components/public-post-report-bell/public-post-report-bell"
import { useCommentNotifications } from "@/features/post/hooks/use-comment-notifications"
import { useMainPosts } from "@/features/post/hooks/use-main-posts"
import type { PostDetail } from "@/features/post/types/post"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Skeleton } from "@/shared/components/ui/skeleton"

type MainPostCarouselWidgetContainerProps = {
  limit?: number
  onPostClick?: (postId: string) => void
}

const getReportBody = (detail: PostDetail) => {
  const lines = detail.content.split(/\r?\n/)
  const firstContentLineIndex = lines.findIndex((line) => line.trim() !== "")
  if (firstContentLineIndex < 0) return detail.content

  const firstLine = lines[firstContentLineIndex].trim()
  const headingTitle = firstLine.replace(/^#\s*/, "").trim()
  if (firstLine.startsWith("# ") && headingTitle === detail.title.trim()) {
    return lines
      .slice(firstContentLineIndex + 1)
      .join("\n")
      .trim()
  }

  return detail.content.trim()
}

export function MainPostCarouselWidgetContainer({
  limit = 4,
  onPostClick,
}: MainPostCarouselWidgetContainerProps) {
  const { posts, isLoading, error } = useMainPosts(limit)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PostDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const openPostDetail = useCallback((postId: string) => {
    setSelectedPostId(postId)
  }, [])

  useCommentNotifications({
    onOpenPost: openPostDetail,
  })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedPostId) {
      setDetail(null)
      setDetailError(null)
      setIsDetailLoading(false)
      return
    }

    let ignore = false
    setDetail(null)
    setDetailError(null)
    setIsDetailLoading(true)

    getPost(selectedPostId)
      .then((post) => {
        if (ignore) return
        setDetail(post)
      })
      .catch((cause: unknown) => {
        if (ignore) return
        setDetailError(
          cause instanceof Error && cause.message
            ? cause.message
            : "칼럼 전문을 불러오지 못했습니다."
        )
      })
      .finally(() => {
        if (ignore) return
        setIsDetailLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [selectedPostId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      onPostClick(postId)
      return
    }
    openPostDetail(postId)
  }

  return (
    <>
      <MainPostCarouselWidget
        posts={posts}
        isLoading={isLoading}
        error={error}
        onPostClick={handlePostClick}
        headerActions={
          <div className="flex items-center gap-2">
            <PublicPostReportBell />
            <CommentNotificationBell onOpenPost={openPostDetail} />
          </div>
        }
      />
      <Dialog
        open={selectedPostId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPostId(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-lg font-bold text-neutral-950">
              {detail?.title ?? "칼럼 전문"}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `${new Date(detail.createdAt).toLocaleDateString("ko-KR")} · ${detail.readTimeMinutes}분 읽기`
                : "AI 칼럼 상세 내용을 불러오는 중입니다."}
            </DialogDescription>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detailError ? (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {detailError}
            </div>
          ) : detail ? (
            <article>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 whitespace-pre-wrap text-neutral-800">
                {getReportBody(detail)}
              </div>
              <PostComments postId={detail.id} />
            </article>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
