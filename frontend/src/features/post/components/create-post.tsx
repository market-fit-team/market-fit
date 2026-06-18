"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { ImageUpload } from "@/features/media/components/image-upload"
import {
  invalidateGetPostsByCursorSuspenseInfinite,
  useCreatePost,
} from "@/shared/api/generated/community/endpoints/posts/posts"
import { problemDetailSchema } from "@/shared/api/problem-detail-schema"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

export function CreatePost() {
  const [content, setContent] = useState("")
  const [mediaAttachmentIds, setMediaAttachmentIds] = useState<number[]>([])
  const queryClient = useQueryClient()

  const { mutate: createPost, isPending } = useCreatePost({
    mutation: {
      onSuccess: () => {
        setContent("")
        setMediaAttachmentIds([])
        // 게시글 목록 캐시 무효화
        void invalidateGetPostsByCursorSuspenseInfinite(queryClient)
        toast.success("게시글 작성 완료")
      },
      onError: (error) => {
        console.error("Create post failed", error)
        const parsedError = problemDetailSchema.safeParse(error)
        toast.error(parsedError.data?.detail ?? "게시글 작성 실패")
      },
    },
  })

  const handleUploadSuccess = (mediaId: number) => {
    setMediaAttachmentIds((prev) => [...prev, mediaId])
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim() && mediaAttachmentIds.length === 0) return

    createPost({
      data: {
        content: content,
        mediaAttachmentIds: mediaAttachmentIds,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        disabled={isPending}
      />
      <ImageUpload onUploadSuccess={handleUploadSuccess} />
      <Button type="submit" disabled={isPending}>
        등록
      </Button>
    </form>
  )
}
