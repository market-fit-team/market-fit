import { BookOpen } from "lucide-react"
import { PostCarousel } from "@/features/post/components/post-carousel/post-carousel"
import { mainPostCarouselSections } from "@/features/post/lib/main-post-carousel-sections"

// 메인 게시글 영역이 섹션 반복을 소유해서 페이지가 캐러셀 내부 구조를 알지 않게 한다.
export function MainPostCarouselWidget() {
  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            창업 정보 및 최신 동향 큐레이션
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">실시간 업데이트</span>
      </div>

      <div className="space-y-10">
        {mainPostCarouselSections.map((section) => (
          <PostCarousel key={section.id} section={section} />
        ))}
      </div>
    </section>
  )
}
