"use client"

import { useState } from "react"
import { CrawlSummaryCreateWidget } from "@/features/post/components/crawl-summary-create-widget/crawl-summary-create-widget"
import { useCreateCrawlSummaryPost } from "@/features/post/hooks/use-create-crawl-summary-post"
import type {
  CrawlSummaryPost,
  PostVisibility,
} from "@/features/post/types/post"

const MIN_RAW_CONTENT_LENGTH = 20

type CrawlSummaryCreateWidgetContainerProps = {
  onCreated?: (post: CrawlSummaryPost) => void
}

const validateInput = (url: string, rawContent: string) => {
  const trimmedUrl = url.trim()
  const trimmedContent = rawContent.trim()

  if (!trimmedUrl && !trimmedContent) {
    return "URL 또는 원문 중 하나를 입력해주세요."
  }

  if (trimmedUrl) {
    try {
      const parsedUrl = new URL(trimmedUrl)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return "URL은 http 또는 https 형식이어야 합니다."
      }
    } catch {
      return "올바른 URL 형식을 입력해주세요."
    }
  }

  if (trimmedContent && trimmedContent.length < MIN_RAW_CONTENT_LENGTH) {
    return `원문은 최소 ${MIN_RAW_CONTENT_LENGTH}자 이상 입력해주세요.`
  }

  return null
}

export function CrawlSummaryCreateWidgetContainer({
  onCreated,
}: CrawlSummaryCreateWidgetContainerProps) {
  const [url, setUrl] = useState(
    "https://www.hankyung.com/economy"
  )
  const [keyword, setKeyword] = useState("")
  const [rawContent, setRawContent] = useState("초록우산·힘난다· 경기도사회적경제원, 자립준비청년 창업지원 협력")
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC")
  const [validationError, setValidationError] = useState<string | null>(null)
  const { create, data, error, isLoading, reset } = useCreateCrawlSummaryPost()

  const handleFieldChange = (setter: (value: string) => void) => {
    return (value: string) => {
      setter(value)
      setValidationError(null)
      if (data || error) reset()
    }
  }

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const inputError = validateInput(url, rawContent)
    if (inputError) {
      setValidationError(inputError)
      return
    }

    const post = await create({
      url: url.trim() || null,
      keyword: keyword.trim() || null,
      rawContent: rawContent.trim() || null,
      visibility,
    }).catch(() => null)

    if (!post) return

    setUrl("")
    setKeyword("")
    setRawContent("")
    onCreated?.(post)
  }

  return (
    <CrawlSummaryCreateWidget
      url={url}
      keyword={keyword}
      rawContent={rawContent}
      visibility={visibility}
      isLoading={isLoading}
      error={validationError ?? error}
      createdPost={data}
      onUrlChange={handleFieldChange(setUrl)}
      onKeywordChange={handleFieldChange(setKeyword)}
      onRawContentChange={handleFieldChange(setRawContent)}
      onVisibilityChange={(value) => {
        setVisibility(value)
        setValidationError(null)
      }}
      onSubmit={(event) => void handleSubmit(event)}
    />
  )
}
