"use client"

import { type ReactNode, createContext, useContext, useState } from "react"
import { createStore, useStore } from "zustand"
import type {
  ChatDetailDialogState,
  ChatLeftTab,
} from "@/features/chat/types/workspace"

type ChatWorkspaceState = {
  activeLeftTab: ChatLeftTab
  detailDialog: ChatDetailDialogState | null
  isLeftSidebarOpen: boolean
  isSelectionLocked: boolean
  selectedArtifactIds: string[]
  selectedDocumentIds: string[]
}

type ChatWorkspaceActions = {
  setDetailDialog: (dialog: ChatDetailDialogState | null) => void
  setActiveLeftTab: (tab: ChatLeftTab) => void
  setIsLeftSidebarOpen: (open: boolean) => void
  setIsSelectionLocked: (locked: boolean) => void
  replaceSelections: (next: {
    documentIds: string[]
    artifactIds: string[]
  }) => void
  toggleArtifact: (artifactId: string) => void
  toggleDocument: (documentId: string) => void
  resetSelections: () => void
}

export type ChatWorkspaceStore = ChatWorkspaceState & ChatWorkspaceActions

const toggleId = (items: string[], id: string) => {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id]
}

const createChatWorkspaceStore = () =>
  createStore<ChatWorkspaceStore>()((set) => ({
    activeLeftTab: "threads",
    detailDialog: null,
    isLeftSidebarOpen: true,
    isSelectionLocked: false,
    selectedDocumentIds: [],
    selectedArtifactIds: [],
    setDetailDialog: (detailDialog) => set({ detailDialog }),
    setActiveLeftTab: (activeLeftTab) => set({ activeLeftTab }),
    setIsLeftSidebarOpen: (isLeftSidebarOpen) => set({ isLeftSidebarOpen }),
    setIsSelectionLocked: (isSelectionLocked) => set({ isSelectionLocked }),
    replaceSelections: ({ documentIds, artifactIds }) =>
      set({
        selectedDocumentIds: documentIds,
        selectedArtifactIds: artifactIds,
      }),
    toggleArtifact: (artifactId) =>
      set((state) => ({
        selectedArtifactIds: toggleId(state.selectedArtifactIds, artifactId),
      })),
    toggleDocument: (documentId) =>
      set((state) => ({
        selectedDocumentIds: toggleId(state.selectedDocumentIds, documentId),
      })),
    resetSelections: () =>
      set({
        selectedArtifactIds: [],
        selectedDocumentIds: [],
      }),
  }))

type ChatWorkspaceStoreApi = ReturnType<typeof createChatWorkspaceStore>

const ChatWorkspaceContext = createContext<ChatWorkspaceStoreApi | undefined>(
  undefined
)

type ChatWorkspaceProviderProps = {
  children: ReactNode
}

export function ChatWorkspaceProvider({
  children,
}: ChatWorkspaceProviderProps) {
  const [store] = useState(createChatWorkspaceStore)

  return (
    <ChatWorkspaceContext.Provider value={store}>
      {children}
    </ChatWorkspaceContext.Provider>
  )
}

const identity = <T,>(value: T) => value

export function useChatWorkspace(): ChatWorkspaceStore
export function useChatWorkspace<T>(
  selector: (state: ChatWorkspaceStore) => T
): T
export function useChatWorkspace<T>(
  selector?: (state: ChatWorkspaceStore) => T
) {
  const context = useContext(ChatWorkspaceContext)

  if (!context) {
    throw new Error("ChatWorkspaceProvider가 필요합니다.")
  }

  return useStore(
    context,
    (selector ?? identity) as (state: ChatWorkspaceStore) => T
  )
}
