// src/app/agent/design4/_components/chat-view.tsx
// 미니멀리즘 AI 에이전트 — 메인 채팅 뷰 (컴포저 문서 첨부 + 드랍존 지원)
"use client"

import * as React from "react"
import {
  ArrowUp,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  FileCode2,
  FileText,
  Layout,
  Maximize,
  Minimize,
  PanelRight,
  Paperclip,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import type {
  ChatMessage,
  DocumentItem,
  InlineArtifact,
  MessageFile,
  PermissionGate,
  ThinkingStep,
  RightPanelContent,
  WebSearchResult,
} from "../_fixtures/mock-data"
import { promptSuggestions } from "../_fixtures/mock-data"

// ─── 프롬프트 제안 아이콘 매핑 ────────────────────────────

const suggestionIcons: Record<string, React.ReactNode> = {
  code: <Code className="size-3.5" />,
  shield: <Shield className="size-3.5" />,
  layout: <Layout className="size-3.5" />,
  zap: <Zap className="size-3.5" />,
}

// ─── 메인 ChatView Props ──────────────────────────────────

interface ChatViewProps {
  messages: ChatMessage[]
  isTyping: boolean
  activeThreadTitle: string
  /** 컴포저에 첨부된 문서 목록 */
  attachedDocs: DocumentItem[]
  /** 문서 패널이 열려있는지 */
  isDocPanelOpen: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onSendMessage: (content: string, file?: MessageFile) => void
  onToggleFeedback: (messageId: string, type: "like" | "dislike") => void
  onPermissionAction: (gateId: string, action: "approve" | "deny") => void
  /** 문서를 컴포저에서 제거 */
  onDetachDoc: (docId: string) => void
  /** 드랍으로 문서를 컴포저에 추가 */
  onDropDoc: (doc: DocumentItem) => void
  /** 문서 패널 토글 */
  onToggleDocPanel: () => void
  /** 우측 패널에 컨텐츠 열기 */
  onOpenInPanel: (content: RightPanelContent) => void
}

/** 메인 채팅 대화 뷰 */
export function ChatView({
  messages,
  isTyping,
  activeThreadTitle,
  attachedDocs,
  isDocPanelOpen,
  isExpanded,
  onToggleExpand,
  onSendMessage,
  onToggleFeedback,
  onPermissionAction,
  onDetachDoc,
  onDropDoc,
  onToggleDocPanel,
  onOpenInPanel,
}: ChatViewProps) {
  const [input, setInput] = React.useState("")
  const [isDragOver, setIsDragOver] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const isWelcomeScreen = messages.length === 0

  // 새 메시지 시 스크롤 하단으로
  React.useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-slot='scroll-area-viewport']"
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages, isTyping])

  // 메시지 전송 핸들러
  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  // Shift+Enter = 개행, Enter = 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 자동 높이 조절
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }

  // ── 드랍존 이벤트 ────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // 자식 요소로 이동할 때는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    try {
      const jsonData = e.dataTransfer.getData("application/json")
      if (jsonData) {
        const doc = JSON.parse(jsonData) as DocumentItem
        onDropDoc(doc)
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── 드래그 오버레이 ── */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 m-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <FileCode2 className="size-8 text-primary" />
            <span className="text-xs font-medium text-primary">
              여기에 파일을 놓으세요
            </span>
          </div>
        </div>
      )}

      {/* ── 헤더 ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            {activeThreadTitle}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="hidden h-4 px-2 py-0 text-[10px] font-normal sm:inline-flex"
          >
            GPT-4o
          </Badge>

          {/* 확장/축소 토글 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onToggleExpand}
                  className="mx-0.5 hidden cursor-pointer text-muted-foreground hover:text-foreground md:flex"
                >
                  {isExpanded ? (
                    <Minimize className="size-3.5" />
                  ) : (
                    <Maximize className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? "축소" : "확장"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 문서 패널 토글 */}
          {!isDocPanelOpen && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onToggleDocPanel}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    id="doc-panel-open-btn"
                  >
                    <PanelRight className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>문서 패널 열기</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </header>

      {/* ── 메시지 영역 ── */}
      <ScrollArea
        ref={scrollRef}
        className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!w-full"
      >
        <div className="mx-auto min-w-0 max-w-2xl px-4 py-6 sm:px-6">
          {isWelcomeScreen ? (
            <WelcomeScreen
              onSelectSuggestion={(text) => {
                setInput(text)
                textareaRef.current?.focus()
              }}
            />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onToggleFeedback={onToggleFeedback}
                  onPermissionAction={onPermissionAction}
                  onOpenInPanel={onOpenInPanel}
                />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── 입력 영역 (컴포저) ── */}
      <div className="shrink-0 border-t border-border/15 bg-background px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div
            className={cn(
              "relative rounded-xl border bg-muted/20 transition-all",
              isDragOver
                ? "border-primary/40 bg-primary/5"
                : "border-border/30 focus-within:border-border/50 focus-within:bg-muted/30"
            )}
          >
            {/* 첨부된 문서 칩 목록 */}
            {attachedDocs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-0">
                {attachedDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border/20 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    <FileCode2 className="size-2.5 text-muted-foreground" />
                    {doc.name}
                    <button
                      onClick={() => onDetachDoc(doc.id)}
                      className="ml-0.5 cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      id={`detach-doc-${doc.id}`}
                    >
                      <X className="size-2" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              id="chat-input-textarea"
            />

            {/* 입력 하단 컨트롤 바 */}
            <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        id="chat-attach-btn"
                      >
                        <Paperclip className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>파일 첨부</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {input.length > 0 ? `${input.length}자` : ""}
                  {attachedDocs.length > 0 &&
                    ` · ${attachedDocs.length}개 파일`}
                </span>
                <Button
                  size="icon-xs"
                  variant={input.trim() ? "default" : "ghost"}
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={cn(
                    "cursor-pointer transition-all",
                    input.trim()
                      ? "bg-foreground text-background hover:bg-foreground/80"
                      : "text-muted-foreground"
                  )}
                  id="chat-send-btn"
                >
                  <ArrowUp className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground">
            AI 에이전트는 실수할 수 있습니다. 중요한 내용은 반드시 직접
            확인하세요.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── 웰컴 스크린 ──────────────────────────────────────────

function WelcomeScreen({
  onSelectSuggestion,
}: {
  onSelectSuggestion: (text: string) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-6 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-foreground/5 blur-xl" />
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border/30 bg-background shadow-sm">
            <Sparkles className="size-6 text-foreground" />
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        무엇을 도와드릴까요?
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        코드 작성, 리팩토링, 보안 감사 등을 지원합니다
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-2">
        {promptSuggestions.map((item) => (
          <button
            key={item.label}
            onClick={() => onSelectSuggestion(item.description)}
            className="group flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border border-border/20 bg-background p-3.5 text-left transition-all hover:border-border/40 hover:bg-muted/20"
            id={`suggestion-${item.icon}`}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground transition-colors group-hover:bg-muted/60 group-hover:text-foreground">
              {suggestionIcons[item.icon]}
            </span>
            <span className="text-xs font-medium text-foreground">
              {item.label}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              {item.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 메시지 버블 ──────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage
  onToggleFeedback: (messageId: string, type: "like" | "dislike") => void
  onPermissionAction: (gateId: string, action: "approve" | "deny") => void
  onOpenInPanel: (content: RightPanelContent) => void
}

function MessageBubble({
  message,
  onToggleFeedback,
  onPermissionAction,
  onOpenInPanel,
}: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex min-w-0",
        isUser ? "justify-end" : "justify-start"
      )}
      id={`message-${message.id}`}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5",
          isUser ? "w-fit max-w-[85%] items-end" : "w-full max-w-full items-start",
        )}
      >
        {/* 첨부된 문서 표시 */}
        {message.attachedDocs && message.attachedDocs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.attachedDocs.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                <FileCode2 className="size-2" />
                {doc.name}
              </span>
            ))}
          </div>
        )}

        {message.thinkingSteps && message.thinkingSteps.length > 0 && (
          <ThinkingStepsBlock steps={message.thinkingSteps} onOpen={() => onOpenInPanel({ type: "thinking", data: message.thinkingSteps! })} />
        )}

        {message.searchResults && message.searchResults.length > 0 && (
          <SearchResultsBlock results={message.searchResults} onOpen={() => onOpenInPanel({ type: "search_result", data: message.searchResults! })} />
        )}

        <div
          className={cn(
            "max-w-full break-words rounded-xl px-3.5 py-2.5 text-sm leading-[1.7]",
            isUser
              ? "rounded-tr-sm bg-foreground text-background"
              : "rounded-tl-sm bg-muted/30 text-foreground"
          )}
        >
          <MessageContent content={message.content} />
        </div>

        {message.artifact && <ArtifactBlock artifact={message.artifact} onOpen={() => onOpenInPanel({ type: "artifact", data: message.artifact! })} />}
        {message.permissionGate && (
          <PermissionGateBlock
            gate={message.permissionGate}
            onAction={onPermissionAction}
          />
        )}

        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-xs text-muted-foreground">
            {message.timestamp}
          </span>
          {!isUser && (
            <div className="flex items-center gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToggleFeedback(message.id, "like")}
                      className={cn(
                        "cursor-pointer rounded-md p-1 transition-colors",
                        message.isLiked
                          ? "bg-foreground/[0.05] text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      id={`feedback-like-${message.id}`}
                    >
                      <ThumbsUp className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>도움이 됨</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToggleFeedback(message.id, "dislike")}
                      className={cn(
                        "cursor-pointer rounded-md p-1 transition-colors",
                        message.isDisliked
                          ? "bg-destructive/[0.05] text-destructive"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      id={`feedback-dislike-${message.id}`}
                    >
                      <ThumbsDown className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>개선 필요</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(message.content)
                      }
                      className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      id={`feedback-copy-${message.id}`}
                    >
                      <Copy className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>복사</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Thinking Steps ───────────────────────────────────────

function ThinkingStepsBlock({ steps, onOpen }: { steps: ThinkingStep[], onOpen: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const totalMs = steps.reduce((acc, s) => acc + (s.durationMs || 0), 0)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="flex max-w-full flex-wrap items-center gap-1"
    >
      <CollapsibleTrigger asChild>
        <button
          className="group flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors select-none hover:text-foreground"
          id="thinking-steps-toggle"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-foreground/[0.04]">
            {isOpen ? (
              <ChevronDown className="size-2.5" />
            ) : (
              <ChevronRight className="size-2.5" />
            )}
          </span>
          <span className="min-w-0 truncate">{steps.length}단계 사고 과정</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {(totalMs / 1000).toFixed(1)}s
          </span>
        </button>
      </CollapsibleTrigger>
      
      <button 
        onClick={onOpen}
        className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        title="패널에서 자세히 보기"
      >
        <Maximize className="size-3" />
      </button>

      <CollapsibleContent className="w-full min-w-0">
        <div className="ml-2 min-w-0 space-y-0 border-l border-border/20 py-1 pl-4">
          {steps.map((step) => (
            <div key={step.id} className="flex min-w-0 items-center gap-2 py-1 text-xs">
              <span
                className={cn(
                  "flex size-3.5 shrink-0 items-center justify-center rounded-full",
                  step.status === "done" &&
                    "bg-emerald-500/10 text-emerald-500",
                  step.status === "running" && "bg-amber-500/10 text-amber-500",
                  step.status === "error" &&
                    "bg-destructive/10 text-destructive",
                  step.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.status === "done" && <Check className="size-2" />}
                {step.status === "running" && (
                  <RotateCw className="size-2 animate-spin" />
                )}
                {step.status === "error" && <X className="size-2" />}
                {step.status === "pending" && (
                  <span className="size-1 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 break-words text-muted-foreground",
                  step.status === "done" && "text-foreground"
                )}
              >
                {step.label}
              </span>
              {step.durationMs && (
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {step.durationMs}ms
                </span>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Permission Gate ──────────────────────────────────────

function PermissionGateBlock({
  gate,
  onAction,
}: {
  gate: PermissionGate
  onAction: (gateId: string, action: "approve" | "deny") => void
}) {
  const riskColors = {
    low: "text-emerald-500 bg-emerald-500/10",
    medium: "text-amber-500 bg-amber-500/10",
    high: "text-destructive bg-destructive/10",
  }

  return (
    <div
      className="w-full min-w-0 space-y-3 rounded-xl border border-border/30 bg-background p-3 sm:p-4"
      id={`permission-gate-${gate.id}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            riskColors[gate.risk]
          )}
        >
          <ShieldAlert className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 break-words text-sm font-medium text-foreground">
              {gate.action}
            </span>
            <Badge
              variant={gate.risk === "high" ? "destructive" : "outline"}
              className="h-4 shrink-0 px-1.5 py-0 text-[10px] uppercase"
            >
              {gate.risk} risk
            </Badge>
          </div>
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
            {gate.description}
          </p>
        </div>
      </div>

      {gate.status === "pending" ? (
        <div className="grid min-w-0 grid-cols-1 gap-2 pt-1 min-[360px]:grid-cols-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(gate.id, "approve")}
            className="min-w-0 cursor-pointer gap-1 text-xs"
            id={`gate-approve-${gate.id}`}
          >
            <Check className="size-3" /> 승인
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(gate.id, "deny")}
            className="min-w-0 cursor-pointer gap-1 text-xs text-muted-foreground"
            id={`gate-deny-${gate.id}`}
          >
            <X className="size-3" /> 거부
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-1 text-xs">
          {gate.status === "approved" ? (
            <>
              <ShieldCheck className="size-3 text-emerald-500" />
              <span className="text-emerald-500">승인됨</span>
            </>
          ) : (
            <>
              <X className="size-3 text-destructive" />
              <span className="text-destructive">거부됨</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inline Artifact ──────────────────────────────────────

function ArtifactBlock({ artifact, onOpen }: { artifact: InlineArtifact, onOpen: () => void }) {
  const [copied, setCopied] = React.useState(false)
  const previewText = getArtifactPreviewText(artifact)
  const copyText = getArtifactCopyText(artifact)

  const handleCopy = () => {
    void navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border/25 bg-background">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/15 bg-muted/15 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <ArtifactIcon type={artifact.type} />
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {artifact.title}
          </span>
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-[10px]">
            v{artifact.version}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpen}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Maximize className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>패널에서 열기</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  id={`artifact-copy-${artifact.id}`}
                >
                  {copied ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "복사됨" : "코드 복사"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <ScrollArea className="max-h-64 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!w-full">
        {artifact.type === "code" ? (
          <pre className="max-w-full overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
            <code>{artifact.code}</code>
          </pre>
        ) : (
          <div className="space-y-2 p-3">
            <p className="break-words text-xs leading-relaxed text-muted-foreground">
              {previewText}
            </p>
            <div className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              <PanelRight className="size-2.5" />
              <span className="min-w-0 truncate">우측 패널에서 상세 보기</span>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function ArtifactIcon({ type }: { type: InlineArtifact["type"] }) {
  if (type === "code") return <Code className="size-3 text-muted-foreground" />
  if (type === "markdown") {
    return <FileText className="size-3 text-muted-foreground" />
  }
  if (type === "personality_analysis") {
    return <Brain className="size-3 text-muted-foreground" />
  }
  return <BarChart3 className="size-3 text-muted-foreground" />
}

const getArtifactPreviewText = (artifact: InlineArtifact) => {
  if (artifact.type === "code" || artifact.type === "markdown") {
    return artifact.code.slice(0, 180)
  }

  return artifact.summary
}

const getArtifactCopyText = (artifact: InlineArtifact) => {
  if (artifact.type === "code" || artifact.type === "markdown") {
    return artifact.code
  }

  return [
    `# ${artifact.title}`,
    artifact.summary,
    ...artifact.blocks.map((block) => {
      if (block.kind === "markdown") return block.content
      if (block.kind === "callout") return `## ${block.title}\n${block.content}`
      if (block.kind === "metric_grid") {
        return block.items
          .map((item) => `- ${item.label}: ${item.value}`)
          .join("\n")
      }
      return `## ${block.title}\n${block.description ?? ""}`.trim()
    }),
  ].join("\n\n")
}

// ─── 메시지 내용 파서 ─────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n")
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {parseBoldText(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  )
}

// ─── Web Search Results ───────────────────────────────────

function SearchResultsBlock({ results, onOpen }: { results: WebSearchResult[], onOpen: () => void }) {
  if (results.length === 0) return null;
  const firstResult = results[0];

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/30 bg-background/50 flex flex-col">
      <div className="flex items-center justify-between border-b border-border/15 bg-muted/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <GlobeIcon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {results.length}개의 출처 검색 완료
          </span>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline cursor-pointer"
        >
          패널에서 열기 <ChevronRight className="size-3" />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <h4 className="text-sm font-semibold text-foreground mb-1 truncate">{firstResult.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {firstResult.snippet}
        </p>
      </div>
    </div>
  )
}

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

const parseBoldText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const regex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-foreground">
        {match[1]}
      </strong>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// ─── 타이핑 인디케이터 ────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex min-w-0" id="typing-indicator">
      <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm bg-muted/30 px-4 py-3">
        <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-foreground/20" />
        <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-foreground/20" />
        <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-foreground/20" />
      </div>
    </div>
  )
}
