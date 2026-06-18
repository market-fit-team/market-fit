import type { StateCreator } from "zustand"
import type { ChatMessage } from "@/features/agent/types/chat"

export type ConversationSlice = {
  addMessage: (message: ChatMessage) => void
  ensureInitialMessage: (message: ChatMessage) => void
  isResponding: boolean
  messages: ChatMessage[]
  resetConversation: () => void
  setIsResponding: (isResponding: boolean) => void
}

// 대화 상태 조각은 공용 채팅 상태만 가진다. 지도용 프롬프트와 리포트 이동은
// 지도 채팅 위젯과 응답 생성 로직에 둔다.
export const createConversationSlice: StateCreator<ConversationSlice> = (
  set
) => ({
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  ensureInitialMessage: (message) =>
    set((state) => {
      if (state.messages.length > 0) {
        return state
      }

      return { messages: [message] }
    }),
  isResponding: false,
  messages: [],
  resetConversation: () =>
    set({
      isResponding: false,
      messages: [],
    }),
  setIsResponding: (isResponding) => set({ isResponding }),
})
