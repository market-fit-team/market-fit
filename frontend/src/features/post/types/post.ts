export type PostCategory = "TREND" | "GUIDE" | "POLICY"
export type PostSourceType = "MANUAL" | "CRAWLING" | "LLM_REPORT"
export type PostVisibility = "PUBLIC" | "PRIVATE"

export type PostSummary = {
  id: string
  authorName: string
  title: string
  summary: string
  category: PostCategory
  readTimeMinutes: number
  sourceType: PostSourceType
  sourceUrl: string | null
  llmProvider: string | null
  publishedAt: string
}

export type PostDetail = PostSummary & {
  authorId: string
  content: string
  sourceTitle: string | null
  collectedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PostWriteInput = {
  title: string
  summary: string
  content: string
  category: PostCategory
  readTimeMinutes: number
}

export type MainPostCarouselSection = {
  id: string
  title: string
  description: string
  category: PostCategory
  posts: PostSummary[]
}

export type MyPostSummary = {
  totalCount: number
  publishedThisMonth: number
  llmReportCount: number
  recentPosts: PostSummary[]
}

export type CreateLlmReportInput = {
  url?: string
  rawContent?: string
  category?: PostCategory
}

export type CreateCrawlSummaryPostInput = {
  url: string | null
  keyword: string | null
  rawContent: string | null
  visibility: PostVisibility
}

export type CrawlSummaryPost = {
  id: string
  title: string
  summary: string
  thumbnailUrl: string | null
  sourceType: PostSourceType
  sourceId: string | null
  createdAt: string
}

export type PostPage = {
  content: PostSummary[]
  totalElements: number
  totalPages: number
  number: number
  last: boolean
}
