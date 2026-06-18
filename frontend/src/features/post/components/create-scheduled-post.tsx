"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { ImageUpload } from "@/features/media/components/image-upload"
import {
  getGetScheduledPostsQueryKey,
  useCreateScheduledPost,
} from "@/shared/api/generated/community/endpoints/scheduled-posts/scheduled-posts"
import { problemDetailSchema } from "@/shared/api/problem-detail-schema"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"

export function CreateScheduledPost() {
  const [content, setContent] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [mediaAttachmentIds, setMediaAttachmentIds] = useState<number[]>([])
  const queryClient = useQueryClient()

  const { mutate: createScheduledPost, isPending } = useCreateScheduledPost({
    mutation: {
      onSuccess: () => {
        setContent("")
        setScheduledAt("")
        setMediaAttachmentIds([])
        // 예약 게시글 요청에 필수 파라미터가 있을 때는 getQueryKey로 우회할 수 있다.
        void queryClient.invalidateQueries({
          queryKey: getGetScheduledPostsQueryKey(),
        })
        toast.success("예약게시글 작성 완료")
      },
      onError: (error) => {
        console.error("Create scheduled post failed", error)
        const parsedError = problemDetailSchema.safeParse(error)
        toast.error(parsedError.data?.detail ?? "예약게시글 작성 실패")
      },
    },
  })

  const handleUploadSuccess = (mediaId: number) => {
    setMediaAttachmentIds((prev) => [...prev, mediaId])
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim() && mediaAttachmentIds.length === 0) return
    if (!scheduledAt) {
      toast.warning("예약 시간을 설정해주세요")
      return
    }

    createScheduledPost({
      data: {
        content,
        scheduledAt: new Date(scheduledAt).toISOString(),
        mediaAttachmentIds,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="예약게시글 내용을 입력하세요"
        disabled={isPending}
      />
      <Input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        disabled={isPending}
      />
      <ImageUpload onUploadSuccess={handleUploadSuccess} />
      <Button type="submit" disabled={isPending}>
        예약 등록
      </Button>
    </form>
  )
}
