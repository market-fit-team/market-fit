"use client"

import { Sparkles } from "lucide-react"
import type {
  CrawlPreview,
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
  preview: CrawlPreview | null
  isPreviewLoading: boolean
  onUrlChange: (value: string) => void
  onKeywordChange: (value: string) => void
  onRawContentChange: (value: string) => void
  onVisibilityChange: (value: PostVisibility) => void
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void
  onPreview: () => void
}

export function CrawlSummaryCreateWidget({
  url,
  keyword,
  rawContent,
  visibility,
  isLoading,
  error,
  createdPost,
  preview,
  isPreviewLoading,
  onUrlChange,
  onKeywordChange,
  onRawContentChange,
  onVisibilityChange,
  onSubmit,
  onPreview,
}: CrawlSummaryCreateWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle>크롤링 AI 칼럼 생성</CardTitle>
        </div>
        <CardDescription>
          URL 또는 직접 입력한 원문을 서버에서 수집하고 LLM 칼럼으로 생성합니다.
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isPreviewLoading || !url.trim()}
              onClick={onPreview}
            >
              {isPreviewLoading ? "미리보기 중..." : "크롤링 미리보기"}
            </Button>
            <Button type="submit" disabled={isLoading || isPreviewLoading}>
              {isLoading ? "칼럼 생성 중..." : "AI 칼럼 생성"}
            </Button>
          </div>
        </form>

        {preview && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{preview.inputUrlType}</Badge>
              <Badge variant="outline">
                기사 {preview.crawledArticleCount}개
              </Badge>
              <Badge variant="outline">
                관련도 {Math.round(preview.relevanceScore * 100)}%
              </Badge>
            </div>
            <p className="text-sm">
              관련 키워드: {preview.matchedKeywords.join(", ") || "없음"}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {preview.discoveredArticleUrls.map((articleUrl) => (
                <li key={articleUrl} className="break-all">
                  {articleUrl}
                </li>
              ))}
            </ul>
            <pre className="max-h-72 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
              {preview.extractedTextPreview}
            </pre>
          </div>
        )}

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
            {createdPost.debug?.notificationEligible && (
              <p className="mt-3 rounded-md bg-primary/10 p-3 text-sm text-primary">
                프랜차이즈 관련 AI 칼럼이 생성되었습니다. 알림 대상 칼럼입니다.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
