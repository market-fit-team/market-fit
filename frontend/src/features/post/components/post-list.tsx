"use client"

import { useEffect, useState } from "react"
import { getPosts } from "@/features/post/api/post-api"
import type { PostSummary } from "@/features/post/types/post"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

export function PostList() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPage = async (nextPage: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPosts(nextPage)
      setPosts((current) =>
        nextPage === 0 ? result.content : [...current, ...result.content]
      )
      setPage(nextPage)
      setHasNext(!result.last)
    } catch {
      setError("게시글을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    getPosts()
      .then((result) => {
        if (!active) return
        setPosts(result.content)
        setHasNext(!result.last)
      })
      .catch(() => {
        if (active) setError("게시글을 불러오지 못했습니다.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{post.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {post.summary}
                </p>
              </div>
              <Badge variant="outline">{post.category}</Badge>
            </div>
            <small className="mt-3 block text-muted-foreground">
              {post.authorName} ·{" "}
              {new Date(post.publishedAt).toLocaleString("ko-KR")}
            </small>
          </article>
        ))}
      </div>

      {hasNext && (
        <Button onClick={() => void loadPage(page + 1)} disabled={isLoading}>
          {isLoading ? "로딩 중..." : "더 보기"}
        </Button>
      )}
    </section>
  )
}
