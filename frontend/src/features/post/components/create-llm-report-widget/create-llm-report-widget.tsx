"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createLlmReport } from "@/features/post/api/post-api"
import type { PostCategory } from "@/features/post/types/post"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"
import { Textarea } from "@/shared/components/ui/textarea"

export function CreateLlmReportWidget() {
  const [url, setUrl] = useState("")
  const [rawContent, setRawContent] = useState("")
  const [category, setCategory] = useState<PostCategory>("TREND")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsPending(true)
    try {
      const post = await createLlmReport({
        url: url.trim() || undefined,
        rawContent: rawContent.trim() || undefined,
        category,
      })
      setUrl("")
      setRawContent("")
      toast.success(`LLM 리포트 생성 완료: ${post.title}`)
    } catch {
      toast.error("LLM 리포트를 생성하지 못했습니다.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle>크롤링 LLM 리포트</CardTitle>
        </div>
        <CardDescription>
          원문, 입력 URL, 서버 기본 URL 순서로 수집 대상을 선택합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.hankyung.com/economy"
            disabled={isPending}
          />
          <Textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            placeholder="수집한 원문을 직접 붙여넣으면 URL 요청보다 우선 사용합니다."
            className="min-h-40"
            disabled={isPending}
          />
          <NativeSelect
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as PostCategory)
            }
            disabled={isPending}
          >
            <NativeSelectOption value="TREND">시장 트렌드</NativeSelectOption>
            <NativeSelectOption value="GUIDE">
              창업 실무 가이드
            </NativeSelectOption>
            <NativeSelectOption value="POLICY">정책/법률</NativeSelectOption>
          </NativeSelect>
          <Button type="submit" disabled={isPending}>
            {isPending ? "리포트 생성 중..." : "리포트 생성"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
