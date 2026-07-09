"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useSession } from "@/features/auth/lib/auth-client"
import {
  createPostComment,
  deletePostComment,
  getPostComments,
  updatePostComment,
} from "@/features/post/api/post-api"
import type { PostComment } from "@/features/post/types/post"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

type PostCommentsProps = {
  postId: string
}

export function PostComments({ postId }: PostCommentsProps) {
  const { data: session, isPending } = useSession()
  const [comments, setComments] = useState<PostComment[]>([])
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setComments(await getPostComments(postId))
    } catch {
      setError("댓글을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadComments()
  }, [loadComments])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreate = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await createPostComment(postId, content)
      setContent("")
      await loadComments()
      toast.success("댓글이 등록되었습니다.")
    } catch {
      toast.error("댓글 등록에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (commentId: string) => {
    if (!editingContent.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await updatePostComment(postId, commentId, editingContent)
      setEditingId(null)
      setEditingContent("")
      await loadComments()
      toast.success("댓글이 수정되었습니다.")
    } catch {
      toast.error("댓글 수정에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await deletePostComment(postId, commentId)
      await loadComments()
      toast.success("댓글이 삭제되었습니다.")
    } catch {
      toast.error("댓글 삭제에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">댓글</h3>
        <span className="text-xs text-muted-foreground">
          {comments.length}개
        </span>
      </div>

      {isPending ? null : session ? (
        <div className="mb-5 space-y-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="댓글을 입력하세요"
            className="min-h-24 resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!content.trim() || isSubmitting}
              onClick={handleCreate}
              className="dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/80"
            >
              댓글 등록
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          로그인하면 댓글을 작성할 수 있습니다.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          댓글을 불러오는 중입니다.
        </p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {comment.authorName}
                  </p>
                  <time
                    dateTime={comment.createdAt}
                    className="text-xs text-muted-foreground"
                  >
                    {new Date(comment.createdAt).toLocaleString("ko-KR")}
                  </time>
                </div>
                {comment.canEdit ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditingContent(comment.content)
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                    >
                      삭제
                    </Button>
                  </div>
                ) : null}
              </div>
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="min-h-20 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!editingContent.trim() || isSubmitting}
                      onClick={() => handleUpdate(comment.id)}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                  {comment.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
