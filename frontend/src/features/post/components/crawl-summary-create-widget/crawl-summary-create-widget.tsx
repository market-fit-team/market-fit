"use client"

import { Sparkles } from "lucide-react"
import type {
  CrawlSummaryPost,
  PostVisibility,
} from "@/features/post/types/post"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"
import { Textarea } from "@/shared/components/ui/textarea"

type CrawlSummaryCreateWidgetProps = {
  url: string
  keyword: string
  rawContent: string
  visibility: PostVisibility
  isLoading: boolean
  error: string | null
  createdPost: CrawlSummaryPost | null
  onUrlChange: (value: string) => void
  onKeywordChange: (value: string) => void
  onRawContentChange: (value: string) => void
  onVisibilityChange: (value: PostVisibility) => void
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void
}

export function CrawlSummaryCreateWidget({
  url,
  keyword,
  rawContent,
  visibility,
  isLoading,
  error,
  createdPost,
  onUrlChange,
  onKeywordChange,
  onRawContentChange,
  onVisibilityChange,
  onSubmit,
}: CrawlSummaryCreateWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle>크롤링 AI 리포트 생성</CardTitle>
        </div>
        <CardDescription>
          URL 또는 직접 입력한 원문을 서버에서 수집하고 LLM 리포트로 생성합니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="crawl-summary-url">URL</Label>
            <Input
              id="crawl-summary-url"
              type="url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://www.hankyung.com/economy"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crawl-summary-keyword">키워드</Label>
            <Input
              id="crawl-summary-keyword"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="AI 채용 트렌드"
              maxLength={500}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crawl-summary-content">원문</Label>
            <Textarea
              id="crawl-summary-content"
              value={rawContent}
              onChange={(event) => onRawContentChange(event.target.value)}
              placeholder="URL 대신 요약할 원문을 직접 입력할 수 있습니다."
              className="min-h-44"
              maxLength={100_000}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crawl-summary-visibility">공개 범위</Label>
            <NativeSelect
              id="crawl-summary-visibility"
              value={visibility}
              onChange={(event) =>
                onVisibilityChange(event.target.value as PostVisibility)
              }
              disabled={isLoading}
            >
              <NativeSelectOption value="PUBLIC">공개</NativeSelectOption>
              <NativeSelectOption value="PRIVATE">비공개</NativeSelectOption>
            </NativeSelect>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "리포트 생성 중..." : "AI 리포트 생성"}
          </Button>
        </form>

        {createdPost && (
          <div
            className="rounded-lg border border-border bg-muted/30 p-4"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{createdPost.sourceType}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(createdPost.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
            <h3 className="mt-3 font-semibold">{createdPost.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {createdPost.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
