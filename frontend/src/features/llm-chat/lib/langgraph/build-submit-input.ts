import { HumanMessage } from "@langchain/core/messages"

export const buildSubmitInput = (
  content: string
): { messages: [HumanMessage] } => ({
  messages: [
    // Protocol V2 공식 React hook(@langchain/react)은 BaseMessage projection을 기준으로 메시지를 조립합니다.
    // 입력도 @langchain/core 메시지 인스턴스로 보내면 optimistic echo와 서버 values.messages 병합이 안정적입니다.
    // 근거:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    // https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md
    new HumanMessage({
      content,
      id: crypto.randomUUID(),
    }),
  ],
})
