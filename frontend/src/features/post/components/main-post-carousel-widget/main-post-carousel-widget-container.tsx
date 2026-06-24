"use client"

import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"
import { useMainPosts } from "@/features/post/hooks/use-main-posts"

type MainPostCarouselWidgetContainerProps = {
  limit?: number
  onPostClick?: (postId: string) => void
}

export function MainPostCarouselWidgetContainer({
  limit = 10,
  onPostClick,
}: MainPostCarouselWidgetContainerProps) {
  const { posts, isLoading, error } = useMainPosts(limit)

  return (
    <MainPostCarouselWidget
      posts={posts}
      isLoading={isLoading}
      error={error}
      onPostClick={onPostClick}
    />
  )
}
