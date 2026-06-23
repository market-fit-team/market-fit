// src/app/agent/design4/page.tsx
// AI 에이전트 종합 워크스페이스 — ResizablePanel 3단 레이아웃
"use client"

import * as React from "react"
import { Folder, Menu, MessageSquare, NotebookPen, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import { ChatView } from "./_components/chat-view"
import { DocumentPanel } from "./_components/document-panel"
import { DynamicPanel } from "./_components/dynamic-panel"
import { ThreadList } from "./_components/thread-list"
import { MemoryPanel } from "./_components/memory-panel"
import {
  type ChatMessage,
  type DocumentItem,
  type MessageFile,
  type Thread,
  type AiMemory,
  type RightPanelContent,
  generateBotResponse,
  initialDocuments,
  initialMessages,
  initialThreads,
  initialMemories,
} from "./_fixtures/mock-data"

/** Design4 — Adaptive Minimalism AI Agent 종합 워크스페이스 */
export default function Page() {
  // ── 기존 상태 (design3 계승) ─────────────────────────────
  const [threads, setThreads] = React.useState<Thread[]>(initialThreads)
  const [messages, setMessages] =
    React.useState<Record<string, ChatMessage[]>>(initialMessages)
  const [activeThreadId, setActiveThreadId] = React.useState<string>("thread-1")
  const [isTyping, setIsTyping] = React.useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)

  // ── 신규 상태 (design4 추가) ─────────────────────────────
  const [documents] = React.useState<DocumentItem[]>(initialDocuments)
  const [rightPanelContent, setRightPanelContent] = React.useState<RightPanelContent>({ type: "document", data: documents })
  const isDocPanelOpen = rightPanelContent !== null
  const [attachedDocs, setAttachedDocs] = React.useState<DocumentItem[]>([])

  // ── 탭 상태 ──────────────────────────────────────────────
  const [activeTab, setActiveTab] =
    React.useState<"chat" | "folder" | "memory">("chat")

  // ── AI Memory 상태 ─────────────────────────────────────────
  const [memories, setMemories] = React.useState<AiMemory[]>(initialMemories)

  const isExpanded = !isSidebarOpen && !isDocPanelOpen
  // 리사이저블 패널 크기는 숫자로 쓰면 px로 해석된다. 임의로 숫자값으로 바꾸지 말 것.
  const chatPanelDefaultSize = isSidebarOpen
    ? isDocPanelOpen
      ? "46%"
      : "76%"
    : isDocPanelOpen
      ? "65%"
      : "100%"
  const docPanelDefaultSize = isSidebarOpen ? "30%" : "35%"

  // 현재 활성 스레드 정보
  const activeThread = threads.find((t) => t.id === activeThreadId)
  const activeTitle = activeThread?.title ?? "새 대화"
  const currentMessages = activeThreadId ? (messages[activeThreadId] ?? []) : []
  const activityButtonClassName =
    "size-8 cursor-pointer rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
  const activeActivityButtonClassName =
    "bg-muted text-foreground ring-1 ring-border/40 hover:bg-muted"

  // ── 스레드 선택 ──────────────────────────────────────────
  const handleSelectThread = (id: string) => {
    setActiveThreadId(id)
    // 스레드 전환 시 첨부 문서 초기화
    setAttachedDocs([])
  }

  // ── 새 스레드 생성 ────────────────────────────────────────
  const handleCreateThread = () => {
    const newId = `thread-${Date.now()}`
    const newThread: Thread = {
      id: newId,
      title: `새 대화 #${threads.length + 1}`,
      updatedAt: "방금",
      messageCount: 0,
    }
    setThreads((prev) => [newThread, ...prev])
    setMessages((prev) => ({ ...prev, [newId]: [] }))
    setActiveThreadId(newId)
    setAttachedDocs([])
    toast.success("새 대화가 시작되었습니다.")
  }

  // ── 스레드 삭제 ───────────────────────────────────────────
  const handleDeleteThread = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id))
    setMessages((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

    if (activeThreadId === id) {
      const remaining = threads.filter((t) => t.id !== id)
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id)
      } else {
        setActiveThreadId("")
      }
    }
    toast("대화가 삭제되었습니다.", { icon: "🗑️" })
  }

  // ── 메시지 전송 ───────────────────────────────────────────
  const handleSendMessage = (content: string, file?: MessageFile) => {
    if (!activeThreadId) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    // 사용자 메시지 (첨부 문서 포함)
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content,
      timestamp: timeStr,
      file,
      attachedDocs: attachedDocs.length > 0 ? [...attachedDocs] : undefined,
    }

    setMessages((prev) => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] ?? []), userMsg],
    }))

    // 전송 후 첨부 문서 초기화
    setAttachedDocs([])

    // 스레드 정보 업데이트
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? { ...t, updatedAt: "방금", messageCount: t.messageCount + 1 }
          : t
      )
    )

    // AI 응답 시뮬레이션
    setIsTyping(true)
    setTimeout(() => {
      const response = generateBotResponse()
      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        thinkingSteps: response.steps,
      }

      setMessages((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] ?? []), botMsg],
      }))

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messageCount: t.messageCount + 2 }
            : t
        )
      )
      setIsTyping(false)
    }, 1800)
  }

  // ── 피드백 토글 ───────────────────────────────────────────
  const handleToggleFeedback = (
    messageId: string,
    type: "like" | "dislike"
  ) => {
    if (!activeThreadId) return
    setMessages((prev) => {
      const roomMsgs = prev[activeThreadId] ?? []
      const updated = roomMsgs.map((m) => {
        if (m.id !== messageId) return m
        if (type === "like")
          return { ...m, isLiked: !m.isLiked, isDisliked: false }
        return { ...m, isDisliked: !m.isDisliked, isLiked: false }
      })
      return { ...prev, [activeThreadId]: updated }
    })
  }

  // ── 권한 게이트 ───────────────────────────────────────────
  const handlePermissionAction = (
    gateId: string,
    action: "approve" | "deny"
  ) => {
    if (!activeThreadId) return
    setMessages((prev) => {
      const roomMsgs = prev[activeThreadId] ?? []
      const updated = roomMsgs.map((m) => {
        if (!m.permissionGate || m.permissionGate.id !== gateId) return m
        return {
          ...m,
          permissionGate: {
            ...m.permissionGate,
            status:
              action === "approve"
                ? ("approved" as const)
                : ("denied" as const),
          },
        }
      })
      return { ...prev, [activeThreadId]: updated }
    })

    if (action === "approve") {
      toast.success("작업이 승인되었습니다.")
    } else {
      toast("작업이 거부되었습니다.", { icon: "🚫" })
    }
  }

  // ── 문서 첨부/제거 ────────────────────────────────────────

  /** 문서를 컴포저에 추가 (중복 방지) */
  const handleAttachDoc = (doc: DocumentItem) => {
    setAttachedDocs((prev) => {
      if (prev.some((d) => d.id === doc.id)) {
        toast("이미 첨부된 파일입니다.", { icon: "📎" })
        return prev
      }
      toast.success(`${doc.name}이(가) 첨부되었습니다.`)
      return [...prev, doc]
    })
  }

  /** 컴포저에서 문서 제거 */
  const handleDetachDoc = (docId: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  /** 문서 패널 접기/펴기 토글 */
  const handleToggleDocPanel = () => {
    setRightPanelContent((prev) => prev ? null : { type: "document", data: documents })
  }

  /** 전체 화면 확장 토글 */
  const handleToggleExpand = () => {
    if (isExpanded) {
      setIsSidebarOpen(true)
      setRightPanelContent({ type: "document", data: documents })
    } else {
      setIsSidebarOpen(false)
      setRightPanelContent(null)
    }
  }

  // ── AI Memory 관리 ────────────────────────────────────────
  const handleAddMemory = (content: string) => {
    const newMemory: AiMemory = {
      id: `mem-${Date.now()}`,
      content,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setMemories((prev) => [newMemory, ...prev])
    toast.success("새로운 기억이 추가되었습니다.")
  }

  const handleUpdateMemory = (id: string, content: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    )
    toast.success("기억이 수정되었습니다.")
  }

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id))
    toast("기억이 삭제되었습니다.", { icon: "🗑️" })
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background text-foreground">
      {/* ── 액티비티 바 (Far Left) ── */}
      <div className="relative z-0 flex w-10 shrink-0 flex-col items-center justify-between border-r border-border/30 bg-background/95 py-3">
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveTab("chat")
                    setIsSidebarOpen(true)
                  }}
                  className={cn(
                    activityButtonClassName,
                    activeTab === "chat" && isSidebarOpen
                      ? activeActivityButtonClassName
                      : "hover:bg-muted/70"
                  )}
                >
                  <MessageSquare className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">채팅 목록</TooltipContent>
            </Tooltip>
          </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setActiveTab("folder")
                  setIsSidebarOpen(true)
                }}
                className={cn(
                  activityButtonClassName,
                  activeTab === "folder" && isSidebarOpen
                    ? activeActivityButtonClassName
                    : "hover:bg-muted/70"
                )}
              >
                <Folder className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">프로젝트 파일</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setActiveTab("memory")
                  setIsSidebarOpen(true)
                }}
                className={cn(
                  activityButtonClassName,
                  activeTab === "memory" && isSidebarOpen
                    ? activeActivityButtonClassName
                    : "hover:bg-muted/70"
                )}
              >
                <NotebookPen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">AI 메모리</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>
      </div>

      {/* ── 모바일 오버레이 ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── 메인 작업 영역 (Resizable 3단) ── */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* 모바일 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-3 left-3 z-30 cursor-pointer md:hidden"
          id="mobile-menu-btn"
        >
          {isSidebarOpen ? (
            <X className="size-4" />
          ) : (
            <Menu className="size-4" />
          )}
        </Button>

        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          {/* 좌측 패널: 스레드 목록 또는 문서 패널 */}
          {isSidebarOpen && (
            <>
              {/* 아래 크기값은 react-resizable-panels v4 기준 퍼센트 문자열이다. 숫자로 되돌리면 왼쪽 패널이 px 단위로 깨진다. */}
              <ResizablePanel defaultSize="24%" minSize="18%" maxSize="36%">
                {activeTab === "chat" && (
                  <ThreadList
                    threads={threads}
                    activeThreadId={activeThreadId}
                    onSelectThread={(id) => {
                      handleSelectThread(id)
                      if (window.innerWidth < 768) setIsSidebarOpen(false)
                    }}
                    onCreateThread={handleCreateThread}
                    onDeleteThread={handleDeleteThread}
                    onToggleCollapse={() => setIsSidebarOpen(false)}
                  />
                )}
                {activeTab === "folder" && (
                  <DocumentPanel
                    documents={documents}
                    onAttachToComposer={handleAttachDoc}
                    onCollapsePanel={() => setIsSidebarOpen(false)}
                    side="left"
                  />
                )}
                {activeTab === "memory" && (
                  <MemoryPanel
                    memories={memories}
                    onAdd={handleAddMemory}
                    onUpdate={handleUpdateMemory}
                    onDelete={handleDeleteMemory}
                    onCloseSidebar={() => setIsSidebarOpen(false)}
                  />
                )}
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="z-10 !w-1.5 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/40"
              />
            </>
          )}

          {/* 중앙 패널: 채팅 영역 */}
          <ResizablePanel defaultSize={chatPanelDefaultSize} minSize="40%">
            <ChatView
              messages={currentMessages}
              isTyping={isTyping}
              activeThreadTitle={activeTitle}
              attachedDocs={attachedDocs}
              isDocPanelOpen={isDocPanelOpen}
              isExpanded={isExpanded}
              onToggleExpand={handleToggleExpand}
              onSendMessage={handleSendMessage}
              onToggleFeedback={handleToggleFeedback}
              onPermissionAction={handlePermissionAction}
              onDetachDoc={handleDetachDoc}
              onDropDoc={handleAttachDoc}
              onToggleDocPanel={handleToggleDocPanel}
              onOpenInPanel={(content) => {
                setRightPanelContent(content)
                if (window.innerWidth < 768) setIsSidebarOpen(false)
              }}
            />
          </ResizablePanel>

          {/* 우측 패널: 문서 패널 (접기/펴기) */}
          {isDocPanelOpen && rightPanelContent && (
            <>
              <ResizableHandle
                withHandle
                className="!w-1.5 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/40"
              />
              <ResizablePanel defaultSize={docPanelDefaultSize} minSize="20%" maxSize="50%">
                <DynamicPanel
                  content={rightPanelContent}
                  onClose={() => setRightPanelContent(null)}
                  onAttachToComposer={handleAttachDoc}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
