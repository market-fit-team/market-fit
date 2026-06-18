import { PostCard } from "@/features/post/components/post-card/post-card"
import type { MainPostCarouselSection } from "@/features/post/types/post-carousel"

interface PostCarouselProps {
  section: MainPostCarouselSection
}

// 메인 게시글 섹션 하나를 가로 스크롤 레일로 렌더링한다.
export function PostCarousel({ section }: PostCarouselProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {section.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {section.description}
        </p>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {section.posts.map((post) => (
          <div key={post.id} className="w-[280px] shrink-0 snap-start sm:w-80">
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </section>
  )
}
