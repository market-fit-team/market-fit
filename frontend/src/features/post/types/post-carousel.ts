export type MainPostCategory = "Trend" | "Guide" | "Policy"

export interface MainPostItem {
  id: string
  title: string
  summary: string
  category: MainPostCategory
  readTime: string
  date: string
}

export interface MainPostCarouselSection {
  id: string
  title: string
  description: string
  posts: MainPostItem[]
}
