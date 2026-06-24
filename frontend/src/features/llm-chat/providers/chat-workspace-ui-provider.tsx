"use client"

import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react"
import type {
  ChatWorkspaceDetailTarget,
  ChatWorkspaceTab,
} from "@/features/llm-chat/types/workspace/chat-workspace"

type ChatWorkspaceUiContextValue = {
  selectedDocumentIds: string[]
  selectedArtifactIds: string[]
  activeTab: ChatWorkspaceTab
  isSidebarOpen: boolean
  isContextPanelOpen: boolean
  isSelectionLocked: boolean
  detailTarget: ChatWorkspaceDetailTarget | null
  toggleDocument: (documentId: string) => void
  toggleArtifact: (artifactId: string) => void
  setActiveTab: (tab: ChatWorkspaceTab) => void
  setSidebarOpen: (open: boolean) => void
  setContextPanelOpen: (open: boolean) => void
  setSelectionLocked: (locked: boolean) => void
  setDetailTarget: (detailTarget: ChatWorkspaceDetailTarget | null) => void
  resetSelections: () => void
}

const ChatWorkspaceUiContext =
  createContext<ChatWorkspaceUiContextValue | null>(null)

const toggleId = (items: string[], id: string) => {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id]
}

type ChatWorkspaceUiProviderProps = {
  children: ReactNode
}

export function ChatWorkspaceUiProvider({
  children,
}: ChatWorkspaceUiProviderProps) {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ChatWorkspaceTab>("documents")
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isContextPanelOpen, setContextPanelOpen] = useState(false)
  const [isSelectionLocked, setSelectionLocked] = useState(false)
  const [detailTarget, setDetailTarget] =
    useState<ChatWorkspaceDetailTarget | null>(null)

  const value = useMemo<ChatWorkspaceUiContextValue>(() => {
    return {
      selectedDocumentIds,
      selectedArtifactIds,
      activeTab,
      isSidebarOpen,
      isContextPanelOpen,
      isSelectionLocked,
      detailTarget,
      toggleDocument: (documentId) =>
        setSelectedDocumentIds((current) => toggleId(current, documentId)),
      toggleArtifact: (artifactId) =>
        setSelectedArtifactIds((current) => toggleId(current, artifactId)),
      setActiveTab,
      setSidebarOpen,
      setContextPanelOpen,
      setSelectionLocked,
      setDetailTarget,
      resetSelections: () => {
        setSelectedDocumentIds([])
        setSelectedArtifactIds([])
      },
    }
  }, [
    selectedDocumentIds,
    selectedArtifactIds,
    activeTab,
    isSidebarOpen,
    isContextPanelOpen,
    isSelectionLocked,
    detailTarget,
  ])

  return (
    <ChatWorkspaceUiContext.Provider value={value}>
      {children}
    </ChatWorkspaceUiContext.Provider>
  )
}

export function useChatWorkspaceUi() {
  const context = useContext(ChatWorkspaceUiContext)

  if (!context) {
    throw new Error("ChatWorkspaceUiProvider가 필요합니다.")
  }

  return context
}
