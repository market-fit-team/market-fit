import { hitlActionArgsSchema } from "@/features/llm-chat/types/hitl-interrupt-payload"

export const parseEditedActionArgs = (
  value: string
): Record<string, unknown> => {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error("edited args must be valid JSON")
  }

  const result = hitlActionArgsSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error("edited args must be a JSON object")
  }

  return result.data
}
