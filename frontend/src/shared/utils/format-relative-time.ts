export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}시간 전`

  const diffD = Math.floor(diffH / 24)
  return `${diffD}일 전`
}
