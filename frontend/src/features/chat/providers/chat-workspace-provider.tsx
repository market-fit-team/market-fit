"use client"

import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react"
import type {
  ChatLeftTab,
  ChatRightPanel,
} from "@/features/chat/types/workspace"

type ChatWorkspaceContextValue = {
  activeLeftTab: ChatLeftTab
  isLeftSidebarOpen: boolean
  isSelectionLocked: boolean
  rightPanel: ChatRightPanel | null
  selectedArtifactIds: string[]
  selectedDocumentIds: string[]
  setActiveLeftTab: (tab: ChatLeftTab) => void
  setIsLeftSidebarOpen: (open: boolean) => void
  setIsSelectionLocked: (locked: boolean) => void
  setRightPanel: (panel: ChatRightPanel | null) => void
  replaceSelections: (next: {
    documentIds: string[]
    artifactIds: string[]
  }) => void
  toggleArtifact: (artifactId: string) => void
  toggleDocument: (documentId: string) => void
  resetSelections: () => void
}

const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(
  null
)

const toggleId = (items: string[], id: string) => {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id]
}

type ChatWorkspaceProviderProps = {
  children: ReactNode
}

export function ChatWorkspaceProvider({
  children,
}: ChatWorkspaceProviderProps) {
  const [activeLeftTab, setActiveLeftTab] = useState<ChatLeftTab>("threads")
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)
  const [isSelectionLocked, setIsSelectionLocked] = useState(false)
  const [rightPanel, setRightPanel] = useState<ChatRightPanel | null>({
    kind: "library",
  })
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([])

  const value = useMemo<ChatWorkspaceContextValue>(
    () => ({
      activeLeftTab,
      isLeftSidebarOpen,
      isSelectionLocked,
      rightPanel,
      selectedArtifactIds,
      selectedDocumentIds,
      setActiveLeftTab,
      setIsLeftSidebarOpen,
      setIsSelectionLocked,
      setRightPanel,
      replaceSelections: ({ documentIds, artifactIds }) => {
        setSelectedDocumentIds(documentIds)
        setSelectedArtifactIds(artifactIds)
      },
      toggleArtifact: (artifactId) =>
        setSelectedArtifactIds((current) => toggleId(current, artifactId)),
      toggleDocument: (documentId) =>
        setSelectedDocumentIds((current) => toggleId(current, documentId)),
      resetSelections: () => {
        setSelectedArtifactIds([])
        setSelectedDocumentIds([])
      },
    }),
    [
      activeLeftTab,
      isLeftSidebarOpen,
      isSelectionLocked,
      rightPanel,
      selectedArtifactIds,
      selectedDocumentIds,
    ]
  )

  return (
    <ChatWorkspaceContext.Provider value={value}>
      {children}
    </ChatWorkspaceContext.Provider>
  )
}

export function useChatWorkspace() {
  const context = useContext(ChatWorkspaceContext)

  if (!context) {
    throw new Error("ChatWorkspaceProvider가 필요합니다.")
  }

  return context
}
