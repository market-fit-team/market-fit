"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { getMyPostSummary } from "@/features/post/api/post-api"
import type { MyPostSummary } from "@/features/post/types/post"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function MyPostSummaryWidget() {
  const [summary, setSummary] = useState<MyPostSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getMyPostSummary()
      .then(setSummary)
      .catch(() => setError(true))
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle>내 게시글</CardTitle>
        </div>
        <CardDescription>
          작성한 게시글과 이번 달 발행 현황입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-muted-foreground">
            게시글 요약을 불러오지 못했습니다.
          </p>
        ) : summary ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">전체 게시글</p>
                <p className="mt-1 text-xl font-semibold">
                  {summary.totalCount}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">LLM 리포트</p>
                <p className="mt-1 text-xl font-semibold">
                  {summary.llmReportCount}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">이번 달 발행</p>
                <p className="mt-1 text-xl font-semibold">
                  {summary.publishedThisMonth}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {summary.recentPosts.map((post) => (
                <li key={post.id} className="text-sm">
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.sourceType === "LLM_REPORT" ? "LLM 리포트 · " : ""}
                    {new Date(post.publishedAt).toLocaleDateString("ko-KR")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
