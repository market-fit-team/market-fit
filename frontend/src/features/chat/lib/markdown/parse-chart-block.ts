import {
  type ChatMarkdownChartBlock,
  chatMarkdownChartBlockSchema,
} from "@/features/chat/lib/markdown/chat-markdown-chart-schema"

type ParseChartBlockResult =
  | {
      ok: true
      chart: ChatMarkdownChartBlock
    }
  | {
      ok: false
      message: string
    }

export const parseChartBlock = (raw: string): ParseChartBlockResult => {
  let payload: unknown

  try {
    payload = JSON.parse(raw)
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "JSON 형식이 올바르지 않습니다."
    return {
      ok: false,
      message: `chart 블록 JSON 형식이 올바르지 않습니다. ${reason}`,
    }
  }

  const result = chatMarkdownChartBlockSchema.safeParse(payload)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
        return `${path}${issue.message}`
      })
      .join(" ")

    return {
      ok: false,
      message: `chart 블록 형식이 올바르지 않습니다. ${details}`,
    }
  }

  return {
    ok: true,
    chart: result.data,
  }
}
