import type {
  MainPostCategory,
  MainPostItem,
} from "@/features/post/types/post-carousel"
import { Badge } from "@/shared/components/ui/badge"
import { Card } from "@/shared/components/ui/card"

const categoryLabels: Record<MainPostCategory, string> = {
  TREND: "시장 트렌드",
  GUIDE: "창업 실무가이드",
  POLICY: "정책/법률 가이드",
}

const categoryVariants: Record<
  MainPostCategory,
  "default" | "secondary" | "outline"
> = {
  TREND: "default",
  GUIDE: "secondary",
  POLICY: "outline",
}

interface PostCardProps {
  post: MainPostItem
}

// 랜딩 캐러셀 전용 표시 카드다. 카테고리 라벨은 이 화면 가까이에 둔다.
export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="group flex h-full min-h-56 flex-col justify-between transition-colors hover:bg-muted/20">
      <div className="p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant={categoryVariants[post.category]}>
            {categoryLabels[post.category]}
          </Badge>
          {post.sourceType === "LLM_REPORT" && (
            <Badge variant="outline">LLM 리포트</Badge>
          )}
        </div>
        <h3 className="text-sm leading-snug font-medium text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {post.summary}
        </p>
        {post.sourceUrl && (
          <p className="mt-3 truncate text-xs text-muted-foreground">
            출처: {post.sourceUrl}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 pt-3 pb-5 text-xs text-muted-foreground">
        <span>{new Date(post.publishedAt).toLocaleDateString("ko-KR")}</span>
        <span>{post.readTimeMinutes}분 분량</span>
      </div>
    </Card>
  )
}
