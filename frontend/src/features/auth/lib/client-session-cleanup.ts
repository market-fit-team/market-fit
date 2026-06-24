import type { QueryClient } from "@tanstack/react-query"
import { useChatModelSelectionStore } from "@/features/llm-chat/stores/use-chat-model-selection-store"
import { useToolPolicyStore } from "@/features/llm-chat/stores/use-tool-policy-store"

export const clearClientSessionState = (queryClient: QueryClient) => {
  // 로그아웃 뒤에는 사용자별 서버 상태 구독까지 제거한다.
  // https://tanstack.com/query/latest/docs/reference/QueryClient
  queryClient.clear()
  useChatModelSelectionStore.getState().resetModelSelection()
  useToolPolicyStore.getState().resetToolPolicy()
}
