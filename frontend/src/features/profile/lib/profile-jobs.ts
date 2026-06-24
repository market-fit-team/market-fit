export const JOBS = [
  "학생",
  "취업준비생",
  "개발자",
  "디자이너",
  "기획자",
  "마케터",
  "창업가",
  "직장인",
  "프리랜서",
  "연구원",
  "교사",
  "공무원",
  "의료인",
  "자영업자",
] as const

export type JobOption = (typeof JOBS)[number]
