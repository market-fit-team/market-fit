import { fetchWithAuth } from "@/features/auth/lib/fetch-with-auth"
import type {
  CrawlSummaryPost,
  CreateCrawlSummaryPostInput,
} from "@/features/post/types/post"

const crawlSummaryApiUrl = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8081"}/api/posts/crawl-summary`

export const createCrawlSummaryPost = (input: CreateCrawlSummaryPostInput) =>
  fetchWithAuth<CrawlSummaryPost>(crawlSummaryApiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
