"use client"

import { type ReactNode, createContext, useContext, useState } from "react"
import { createStore, useStore } from "zustand"
import {
  type ConversationSlice,
  createConversationSlice,
} from "@/features/agent/store/slices/conversation-slice"

export type ChatState = ConversationSlice

// 채팅 스토어는 프로바이더 범위로 생성하고, 대화 상태를 지도 화면 상태와 분리한다.
const createChatStore = (initialState?: Partial<ChatState>) =>
  createStore<ChatState>()((set, get, api) => ({
    ...createConversationSlice(set, get, api),
    ...initialState,
  }))

type ChatStoreApi = ReturnType<typeof createChatStore>

const ChatStoreContext = createContext<ChatStoreApi | undefined>(undefined)

type ChatStoreProviderProps = {
  children: ReactNode
  initialState?: Partial<ChatState>
}

export function ChatStoreProvider({
  children,
  initialState,
}: ChatStoreProviderProps) {
  const [store] = useState(() => createChatStore(initialState))

  return (
    <ChatStoreContext.Provider value={store}>
      {children}
    </ChatStoreContext.Provider>
  )
}

export function useChatStore<T>(selector: (state: ChatState) => T): T {
  const chatStoreContext = useContext(ChatStoreContext)

  if (!chatStoreContext) {
    throw new Error("useChatStore must be used within ChatStoreProvider")
  }

  return useStore(chatStoreContext, selector)
}
