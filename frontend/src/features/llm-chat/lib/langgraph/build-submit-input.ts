import type { HumanMessage } from "@langchain/langgraph-sdk"
import type { LangGraphChatContext } from "./build-submit-config"

export const buildSubmitInput = (
  content: string,
  context: LangGraphChatContext
): { messages: [HumanMessage] } & LangGraphChatContext => ({
  messages: [
    {
      type: "human",
      content,
      id: crypto.randomUUID(),
    },
  ],
  // native Agent Server에서는 기존 호환 adapter가 없으므로
  // graph state가 필요로 하는 model/tool policy 값을 input에도 같이 넣습니다.
  ...context,
})
