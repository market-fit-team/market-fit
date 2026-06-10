export const buildToolPolicySummary = (
  totalTools: number,
  allowedTools: number
): string => {
  const reviewTools = Math.max(totalTools - allowedTools, 0)

  return `${allowedTools} auto / ${reviewTools} review`
}
