export type LlmToolDefinition = {
  name: string
  description: string
  category: string
  defaultAllowed: boolean
  allowedDecisions: string[]
}
