"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createPost } from "@/features/post/api/post-api"
import type { PostCategory } from "@/features/post/types/post"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"
import { Textarea } from "@/shared/components/ui/textarea"

export function CreatePost() {
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<PostCategory>("TREND")
  const [readTimeMinutes, setReadTimeMinutes] = useState(5)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !summary.trim() || !content.trim()) return

    setIsPending(true)
    try {
      await createPost({
        title,
        summary,
        content,
        category,
        readTimeMinutes,
      })
      setTitle("")
      setSummary("")
      setContent("")
      toast.success("게시글 작성 완료")
    } catch {
      toast.error("게시글 작성 실패")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="제목"
        maxLength={200}
        disabled={isPending}
      />
      <Input
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder="요약"
        maxLength={500}
        disabled={isPending}
      />
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="내용을 입력하세요"
        disabled={isPending}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NativeSelect
          value={category}
          onChange={(event) => setCategory(event.target.value as PostCategory)}
          disabled={isPending}
        >
          <NativeSelectOption value="TREND">시장 트렌드</NativeSelectOption>
          <NativeSelectOption value="GUIDE">
            창업 실무 가이드
          </NativeSelectOption>
          <NativeSelectOption value="POLICY">정책/법률</NativeSelectOption>
        </NativeSelect>
        <Input
          type="number"
          min={1}
          max={120}
          value={readTimeMinutes}
          onChange={(event) => setReadTimeMinutes(Number(event.target.value))}
          disabled={isPending}
          aria-label="예상 읽기 시간"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "등록 중..." : "등록"}
      </Button>
    </form>
  )
}
