import type {
  MainPostCategory,
  MainPostItem,
} from "@/features/post/types/post-carousel"
import { Badge } from "@/shared/components/ui/badge"
import { Card } from "@/shared/components/ui/card"

const categoryLabels: Record<MainPostCategory, string> = {
  Trend: "시장 트렌드",
  Guide: "창업 실무가이드",
  Policy: "정책/법률 가이드",
}

const categoryVariants: Record<
  MainPostCategory,
  "default" | "secondary" | "outline"
> = {
  Trend: "default",
  Guide: "secondary",
  Policy: "outline",
}

interface PostCardProps {
  post: MainPostItem
}

// 랜딩 캐러셀 전용 표시 카드다. 카테고리 라벨은 이 화면 가까이에 둔다.
export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="group flex h-full min-h-56 flex-col justify-between transition-colors hover:bg-muted/20">
      <div className="p-6">
        <Badge variant={categoryVariants[post.category]} className="mb-3">
          {categoryLabels[post.category]}
        </Badge>
        <h3 className="text-sm leading-snug font-medium text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {post.summary}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 pt-3 pb-5 text-xs text-muted-foreground">
        <span>{post.date}</span>
        <span>{post.readTime}</span>
      </div>
    </Card>
  )
}
