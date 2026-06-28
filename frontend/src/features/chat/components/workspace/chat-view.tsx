"use client"

import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  FlaskConical,
  Globe,
  Lightbulb,
  Maximize,
  Minimize,
  PanelRight,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { AIMessage, BaseMessage } from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import { HitlInterruptCard } from "@/features/chat/components/hitl/hitl-interrupt-card"
import { ArtifactActionButtons } from "@/features/chat/components/workspace/artifact-action-buttons"
import { ChatWorkspaceComposer } from "@/features/chat/components/workspace/chat-workspace-composer"
import { useAutoScroll } from "@/features/chat/hooks/use-auto-scroll"
import { useLangGraphChatStream } from "@/features/chat/hooks/use-langgraph-chat-stream"
import {
  getArtifactIcon,
  getArtifactPreview,
  getArtifactTitle,
  getDocumentIcon,
  getDocumentPreview,
  getDocumentTitle,
} from "@/features/chat/lib/display/chat-display"
import {
  type ChatAssistantTurnItem,
  type ChatGroupedTurn,
  type ChatTurnToolCard,
  groupChatTurns,
} from "@/features/chat/lib/workspace/group-chat-turns"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"
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

type ChatViewProps = {
  activeThreadTitle: string
  artifacts: ArtifactResponse[]
  documents: DocumentResponse[]
  hasOnboardingContext?: boolean
  isOnboardingContextRemoving?: boolean
  isRightPanelOpen: boolean
  isExpanded: boolean
  onRemoveOnboardingContext?: () => void
  onSetRightPanel: (panel: ChatRightPanel) => void
  onToggleExpand: () => void
  onToggleRightPanel: () => void
}

export function ChatView({
  activeThreadTitle,
  artifacts,
  documents,
  hasOnboardingContext = false,
  isOnboardingContextRemoving = false,
  isRightPanelOpen,
  isExpanded,
  onRemoveOnboardingContext,
  onSetRightPanel,
  onToggleExpand,
  onToggleRightPanel,
}: ChatViewProps) {
  const [draft, setDraft] = React.useState("")
  const {
    hitlInterrupts,
    isBusy,
    isHydrating,
    localNotice,
    messages,
    models,
    modelSelection,
    queueLimit,
    queuedMessages,
    removeQueuedMessage,
    resume,
    submitMessage,
    toolPolicy,
    toolCalls,
  } = useLangGraphChatStream()
  const selectedArtifactIds = useChatWorkspace(
    (state) => state.selectedArtifactIds
  )
  const selectedDocumentIds = useChatWorkspace(
    (state) => state.selectedDocumentIds
  )
  const setIsSelectionLocked = useChatWorkspace(
    (state) => state.setIsSelectionLocked
  )
  const { viewportRef, onScroll, scrollToBottom } = useAutoScroll()
  const disabled = isBusy || isHydrating || hitlInterrupts.length > 0
  const isSendDisabled =
    isHydrating ||
    hitlInterrupts.length > 0 ||
    queuedMessages.length >= queueLimit
  const groupedTurns = React.useMemo(
    () =>
      groupChatTurns({
        messages,
        toolCalls,
      }),
    [messages, toolCalls]
  )
  React.useEffect(() => {
    setIsSelectionLocked(disabled)
    return () => setIsSelectionLocked(false)
  }, [disabled, setIsSelectionLocked])

  React.useEffect(() => {
    scrollToBottom(true)
  }, [
    groupedTurns.turns.length,
    hitlInterrupts.length,
    localNotice,
    scrollToBottom,
  ])

  const handleSubmit = async (message: string) => {
    return submitMessage(message, {
      selectedArtifactIds,
      selectedDocumentIds,
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-3.5 shrink-0 text-foreground" />
          <span className="truncate text-sm font-medium text-foreground">
            {activeThreadTitle}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="hidden h-4 px-2 py-0 text-[10px] font-normal sm:inline-flex"
          >
            {modelSelection.model}
          </Badge>
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
          {!isRightPanelOpen && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onToggleRightPanel}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    id="right-panel-open-btn"
                  >
                    <PanelRight className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>패널 열기</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </header>

      <ScrollArea
        ref={viewportRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full [&_[data-slot=scroll-area-viewport]>div]:!min-w-0"
      >
        <div className="mx-auto max-w-2xl min-w-0 px-4 py-6 sm:px-6">
          {isHydrating ? (
            <TypingIndicator label="대화를 불러오는 중" />
          ) : (
            <div className="space-y-6">
              {groupedTurns.turns.map((turn) =>
                turn.kind === "user" ? (
                  <UserMessageBubble key={turn.key} message={turn.message} />
                ) : (
                  <AssistantTurnBlock
                    key={turn.key}
                    turn={turn}
                    artifacts={artifacts}
                    documents={documents}
                    timeLabel={getAssistantTurnTimeLabel(turn)}
                    onOpenDetails={(reasoning, relatedToolCalls) =>
                      onSetRightPanel({
                        kind: "thinking",
                        title: "생각 / 도구 호출 결과",
                        reasoning,
                        toolCalls: relatedToolCalls,
                      })
                    }
                    onOpenArtifact={(artifact) =>
                      onSetRightPanel({ kind: "artifact", artifact })
                    }
                    onOpenDocument={(document) =>
                      onSetRightPanel({ kind: "library-document", document })
                    }
                    onOpenWebSearch={(result) =>
                      onSetRightPanel({ kind: "web-search", result })
                    }
                    onOpenWebFetch={(result) =>
                      onSetRightPanel({ kind: "web-fetch", result })
                    }
                  />
                )
              )}

              {localNotice && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                  {localNotice}
                </div>
              )}

              {hitlInterrupts.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onSetRightPanel({
                        kind: "hitl",
                        interrupts: hitlInterrupts,
                      })
                    }
                    className="h-7 cursor-pointer gap-1.5 text-xs"
                  >
                    <PanelRight className="size-3" />
                    우측 패널에서 승인 보기
                  </Button>
                  <HitlInterruptCard
                    interrupts={hitlInterrupts}
                    disabled={isBusy || isHydrating}
                    onDecide={(decisions) => void resume(decisions)}
                  />
                </div>
              )}

              {isBusy && <TypingIndicator />}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/15 bg-background px-6 py-4">
        <QueuedMessageList
          queuedMessages={queuedMessages}
          queueLimit={queueLimit}
          onRemoveQueuedMessage={removeQueuedMessage}
        />
        <ChatWorkspaceComposer
          artifacts={artifacts}
          documents={documents}
          draft={draft}
          disabled={disabled}
          inputDisabled={false}
          sendDisabled={isSendDisabled}
          hasOnboardingContext={hasOnboardingContext}
          isOnboardingContextRemoving={isOnboardingContextRemoving}
          models={models}
          modelSelection={modelSelection}
          toolPolicy={toolPolicy}
          onChangeDraft={setDraft}
          onSubmit={handleSubmit}
          onRemoveOnboardingContext={onRemoveOnboardingContext}
        />
      </div>
    </div>
  )
}

function QueuedMessageList({
  queuedMessages,
  queueLimit,
  onRemoveQueuedMessage,
}: {
  queuedMessages: Array<{
    id: string
    content: string
    status: "pending" | "failed"
  }>
  queueLimit: number
  onRemoveQueuedMessage: (id: string) => void
}) {
  if (queuedMessages.length === 0) {
    return null
  }

  return (
    <div className="mx-auto mb-3 flex max-w-2xl flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-muted-foreground">대기 메시지</span>
        <span className="text-[11px] text-muted-foreground">
          {queuedMessages.length}/{queueLimit}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {queuedMessages.map((queuedMessage) => (
          <div
            key={queuedMessage.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
              queuedMessage.status === "failed"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border/40 bg-muted/30 text-muted-foreground"
            )}
          >
            <Clock3 className="size-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {queuedMessage.content}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 shrink-0"
              onClick={() => onRemoveQueuedMessage(queuedMessage.id)}
            >
              <X className="size-3" />
              <span className="sr-only">대기 메시지 제거</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

type AssistantTurnBlockProps = {
  turn: Extract<ChatGroupedTurn, { kind: "assistant" }>
  artifacts: ArtifactResponse[]
  documents: DocumentResponse[]
  timeLabel: string
  onOpenDetails: (
    reasoning: string | undefined,
    toolCalls: AssembledToolCall[]
  ) => void
  onOpenArtifact: (artifact: ArtifactResponse) => void
  onOpenDocument: (document: DocumentResponse) => void
  onOpenWebSearch: (
    result: Extract<ChatTurnToolCard, { kind: "web-search" }>["result"]
  ) => void
  onOpenWebFetch: (
    result: Extract<ChatTurnToolCard, { kind: "web-fetch" }>["result"]
  ) => void
}

function AssistantTurnBlock({
  turn,
  artifacts,
  documents,
  timeLabel,
  onOpenDetails,
  onOpenArtifact,
  onOpenDocument,
  onOpenWebSearch,
  onOpenWebFetch,
}: AssistantTurnBlockProps) {
  const copyText = buildAssistantTurnCopyText(turn)
  const artifactsById = React.useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts]
  )
  const documentsById = React.useMemo(
    () => new Map(documents.map((document) => [document.id, document])),
    [documents]
  )

  return (
    <div
      className="flex min-w-0 justify-start"
      id={
        turn.representativeMessageId
          ? `message-${turn.representativeMessageId}`
          : undefined
      }
    >
      <div className="flex w-full max-w-full flex-col gap-2">
        {turn.reasoning && (
          <ReasoningBlock
            reasoning={turn.reasoning}
            onOpen={() =>
              onOpenDetails(turn.reasoning ?? undefined, turn.toolCalls)
            }
          />
        )}

        {turn.items.map((item) =>
          item.kind === "text" ? (
            <AssistantTextBlock key={item.key} text={item.text} />
          ) : (
            <ToolCallTimelineBlock
              key={item.key}
              item={item}
              reasoning={turn.reasoning ?? undefined}
              artifactsById={artifactsById}
              documentsById={documentsById}
              onOpenDetails={onOpenDetails}
              onOpenArtifact={onOpenArtifact}
              onOpenDocument={onOpenDocument}
              onOpenWebSearch={onOpenWebSearch}
              onOpenWebFetch={onOpenWebFetch}
            />
          )
        )}

        <TurnFooter copyText={copyText} timeLabel={timeLabel} />
      </div>
    </div>
  )
}

function UserMessageBubble({ message }: { message: BaseMessage }) {
  if (!message.text) {
    return null
  }

  return (
    <div
      className="flex min-w-0 justify-end"
      id={message.id ? `message-${message.id}` : undefined}
    >
      <div className="flex w-fit max-w-[85%] flex-col items-end gap-1.5">
        <div className="max-w-full rounded-xl rounded-tr-sm bg-foreground px-3.5 py-2.5 text-sm leading-[1.7] break-words text-background">
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    </div>
  )
}

function AssistantTextBlock({ text }: { text: string }) {
  return (
    <div className="max-w-full rounded-xl rounded-tl-sm bg-muted/30 px-3.5 py-2.5 text-sm leading-[1.7] break-words text-foreground">
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  )
}

type ToolCallTimelineBlockProps = {
  item: Extract<ChatAssistantTurnItem, { kind: "tool-call" }>
  reasoning: string | undefined
  artifactsById: Map<string, ArtifactResponse>
  documentsById: Map<string, DocumentResponse>
  onOpenDetails: (
    reasoning: string | undefined,
    toolCalls: AssembledToolCall[]
  ) => void
  onOpenArtifact: (artifact: ArtifactResponse) => void
  onOpenDocument: (document: DocumentResponse) => void
  onOpenWebSearch: (
    result: Extract<ChatTurnToolCard, { kind: "web-search" }>["result"]
  ) => void
  onOpenWebFetch: (
    result: Extract<ChatTurnToolCard, { kind: "web-fetch" }>["result"]
  ) => void
}

function ToolCallTimelineBlock({
  item,
  reasoning,
  artifactsById,
  documentsById,
  onOpenDetails,
  onOpenArtifact,
  onOpenDocument,
  onOpenWebSearch,
  onOpenWebFetch,
}: ToolCallTimelineBlockProps) {
  const artifactCards = item.cards.filter(
    (card): card is Extract<ChatTurnToolCard, { kind: "artifact" }> =>
      card.kind === "artifact"
  )
  const documentCards = item.cards.filter(
    (card): card is Extract<ChatTurnToolCard, { kind: "library-document" }> =>
      card.kind === "library-document"
  )
  const webSearchCards = item.cards.filter(
    (card): card is Extract<ChatTurnToolCard, { kind: "web-search" }> =>
      card.kind === "web-search"
  )
  const webFetchCards = item.cards.filter(
    (card): card is Extract<ChatTurnToolCard, { kind: "web-fetch" }> =>
      card.kind === "web-fetch"
  )
  const relatedToolCalls = item.toolCall ? [item.toolCall] : []
  const handleOpenToolPanel = () => {
    const webSearchCard = webSearchCards[0]
    if (webSearchCard) {
      onOpenWebSearch(webSearchCard.result)
      return
    }

    const webFetchCard = webFetchCards[0]
    if (webFetchCard) {
      onOpenWebFetch(webFetchCard.result)
      return
    }

    onOpenDetails(reasoning, relatedToolCalls)
  }

  return (
    <div className="space-y-2">
      <ToolCallResultBlock
        toolCallName={item.toolCallName}
        toolResult={item.toolResult}
        onOpen={handleOpenToolPanel}
      />

      {webSearchCards.map((card) => (
        <WebSearchTimelineCard
          key={`${item.key}-web-search-${card.result.query}`}
          result={card.result}
          onOpen={() => onOpenWebSearch(card.result)}
        />
      ))}

      {webFetchCards.map((card) => (
        <WebFetchTimelineCard
          key={`${item.key}-web-fetch-${card.result.final_url}`}
          result={card.result}
          onOpen={() => onOpenWebFetch(card.result)}
        />
      ))}

      {artifactCards.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            {getArtifactStripLabel(item.toolCallName)}
          </p>
          {artifactCards.map((card) => {
            const liveArtifact = artifactsById.get(card.artifact.id) ?? null

            return (
              <ArtifactTimelineCard
                key={card.artifact.id}
                artifact={card.artifact}
                liveArtifact={liveArtifact}
                onOpenArtifact={onOpenArtifact}
              />
            )
          })}
        </div>
      )}

      {documentCards.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            {getDocumentStripLabel(item.toolCallName)}
          </p>
          {documentCards.map((card) => {
            const liveDocument = documentsById.get(card.document.id) ?? null

            return (
              <DocumentTimelineCard
                key={card.document.id}
                document={card.document}
                liveDocument={liveDocument}
                onOpenDocument={onOpenDocument}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function WebSearchTimelineCard({
  result,
  onOpen,
}: {
  result: Extract<ChatTurnToolCard, { kind: "web-search" }>["result"]
  onOpen: () => void
}) {
  const previewResults = result.results.slice(0, 2)

  return (
    <div className="rounded-xl border border-border/30 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Search className="size-3.5 text-muted-foreground" />웹 검색 결과
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {result.query}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          aria-label="검색 결과 패널 보기"
          className="h-7 shrink-0 cursor-pointer gap-1 text-xs"
        >
          <PanelRight className="size-3" />
          패널 보기
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {previewResults.map((searchResult) => (
          <div
            key={`${searchResult.rank}-${searchResult.url}`}
            className="rounded-lg border border-border/25 bg-muted/10 p-2.5"
          >
            <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>#{searchResult.rank}</span>
              <span className="truncate">
                {getUrlHostname(searchResult.url) ?? searchResult.url}
              </span>
            </div>
            <p className="line-clamp-1 text-xs font-medium text-foreground">
              {searchResult.title}
            </p>
            {searchResult.snippet && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {searchResult.snippet}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {formatSearchResultSummary(result)}
      </p>
    </div>
  )
}

function WebFetchTimelineCard({
  result,
  onOpen,
}: {
  result: Extract<ChatTurnToolCard, { kind: "web-fetch" }>["result"]
  onOpen: () => void
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Globe className="size-3.5 text-muted-foreground" />웹 문서 가져옴
          </div>
          <p className="truncate text-xs font-medium text-foreground">
            {result.title ??
              getUrlHostname(result.final_url) ??
              result.final_url}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {result.final_url}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          aria-label="웹 문서 패널 보기"
          className="h-7 shrink-0 cursor-pointer gap-1 text-xs"
        >
          <PanelRight className="size-3" />
          패널 보기
        </Button>
      </div>

      <div className="mt-3 rounded-lg border border-border/25 bg-muted/10 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-5 text-[10px]">
            {result.status_code}
          </Badge>
          <Badge variant="outline" className="h-5 text-[10px]">
            {result.content_type || "unknown"}
          </Badge>
          {result.truncated && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              잘림
            </Badge>
          )}
        </div>
        <p className="line-clamp-4 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
          {result.content}
        </p>
      </div>
    </div>
  )
}

function ReasoningBlock({
  reasoning,
  onOpen,
}: {
  reasoning: string
  onOpen: () => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="w-full max-w-full rounded-lg border border-border/30 bg-muted/20">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              {isOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <Lightbulb className="size-3" />
              생각
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpen}
            className="h-6 cursor-pointer gap-1 px-2 text-xs"
          >
            <PanelRight className="size-3" />
            열기
          </Button>
        </div>
        <CollapsibleContent>
          <div className="border-t border-border/20 px-3 py-2">
            <pre className="text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
              {reasoning}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function ToolCallResultBlock({
  toolCallName,
  toolResult,
  onOpen,
}: {
  toolCallName: string
  toolResult: Extract<
    ChatAssistantTurnItem,
    { kind: "tool-call" }
  >["toolResult"]
  onOpen: () => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="w-full max-w-full rounded-lg border border-border/30 bg-background/70">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              {isOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <FlaskConical className="size-3" />
              도구 호출 결과
              <span className="rounded-full border border-border/40 px-1.5 py-0 font-mono text-[10px] text-foreground">
                {toolCallName}
              </span>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {toolResult.status ?? "finished"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpen}
              className="h-6 cursor-pointer gap-1 px-2 text-xs"
            >
              <PanelRight className="size-3" />
              열기
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="space-y-2 border-t border-border/20 px-3 py-2">
            <div className="rounded-lg border border-border/30 bg-muted/15 p-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span className="font-mono text-xs font-medium text-foreground">
                  {toolResult.name}
                </span>
              </div>
              {toolResult.argsSummary && (
                <div className="mb-2 space-y-1">
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    입력
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-background/80 p-2 text-[11px] leading-5 whitespace-pre-wrap text-muted-foreground">
                    {toolResult.argsSummary}
                  </pre>
                </div>
              )}
              {toolResult.resultSummary && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    결과
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-background/80 p-2 text-[11px] leading-5 whitespace-pre-wrap text-foreground">
                    {toolResult.resultSummary}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function TurnFooter({
  copyText,
  timeLabel,
}: {
  copyText: string
  timeLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-xs text-muted-foreground">{timeLabel}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if (!copyText.trim()) {
                  return
                }
                void navigator.clipboard.writeText(copyText)
                toast.success("응답이 복사되었습니다.")
              }}
              className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!copyText.trim()}
            >
              <Copy className="size-2.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>복사</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function ArtifactTimelineCard({
  artifact,
  liveArtifact,
  onOpenArtifact,
}: {
  artifact: ArtifactResponse
  liveArtifact: ArtifactResponse | null
  onOpenArtifact: (artifact: ArtifactResponse) => void
}) {
  const displayArtifact = liveArtifact ?? artifact
  const canInteract = liveArtifact != null

  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/30 bg-muted/15 p-3">
      <button
        type="button"
        onClick={() => {
          if (liveArtifact) {
            onOpenArtifact(liveArtifact)
          }
        }}
        disabled={!canInteract}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left disabled:cursor-default"
      >
        <span className="mt-0.5">{getArtifactIcon(displayArtifact.type)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">
            {getArtifactTitle(displayArtifact)}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
            {getArtifactPreview(displayArtifact)}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-start gap-1">
        <Badge variant="outline" className="h-5 text-[10px]">
          v{displayArtifact.version}
        </Badge>
        <ArtifactActionButtons
          artifactId={displayArtifact.id}
          canInteract={canInteract}
        />
      </div>
    </div>
  )
}

function DocumentTimelineCard({
  document,
  liveDocument,
  onOpenDocument,
}: {
  document: DocumentResponse
  liveDocument: DocumentResponse | null
  onOpenDocument: (document: DocumentResponse) => void
}) {
  const displayDocument = liveDocument ?? document
  const canInteract = liveDocument != null

  return (
    <button
      type="button"
      key={displayDocument.id}
      onClick={() => {
        if (liveDocument) {
          onOpenDocument(liveDocument)
        }
      }}
      disabled={!canInteract}
      className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border/30 bg-background/60 p-3 text-left transition-colors hover:bg-muted/20 disabled:cursor-default disabled:hover:bg-background/60"
    >
      <span className="mt-0.5">{getDocumentIcon(displayDocument.type)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">
          {getDocumentTitle(displayDocument)}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
          {getDocumentPreview(displayDocument)}
        </span>
      </span>
    </button>
  )
}

function TypingIndicator({ label = "AI가 응답 중입니다" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </span>
      {label}
    </div>
  )
}

const getArtifactStripLabel = (toolCallName: string) => {
  switch (toolCallName) {
    case "artifact_update":
      return "아티팩트 수정됨"
    case "artifact_create":
    default:
      return "아티팩트 생성됨"
  }
}

const getDocumentStripLabel = (toolCallName: string) => {
  switch (toolCallName) {
    case "artifact_save_as_document":
      return "라이브러리에 저장됨"
    case "document_update":
      return "라이브러리 문서 수정됨"
    case "document_create":
    default:
      return "라이브러리 문서 생성됨"
  }
}

const formatSearchResultSummary = (
  result: Extract<ChatTurnToolCard, { kind: "web-search" }>["result"]
) => {
  if (result.results_count == null) {
    return `상위 ${result.results.length}건을 표시합니다.`
  }

  return `총 ${result.results_count.toLocaleString("ko-KR")}건 중 상위 ${result.results.length}건을 표시합니다.`
}

const getUrlHostname = (value: string) => {
  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

const buildAssistantTurnCopyText = (
  turn: Extract<ChatGroupedTurn, { kind: "assistant" }>
) => {
  const itemSections = turn.items
    .map((item) => {
      if (item.kind === "text") {
        return item.text
      }

      const cardTitles = item.cards
        .map((card) =>
          card.kind === "artifact"
            ? getArtifactTitle(card.artifact)
            : card.kind === "library-document"
              ? getDocumentTitle(card.document)
              : card.kind === "web-search"
                ? `웹 검색: ${card.result.query}`
                : `웹 문서: ${card.result.title ?? card.result.final_url}`
        )
        .join("\n")

      return [
        `도구: ${item.toolResult.name}`,
        item.toolResult.argsSummary
          ? `입력:\n${item.toolResult.argsSummary}`
          : null,
        item.toolResult.resultSummary
          ? `결과:\n${item.toolResult.resultSummary}`
          : null,
        cardTitles || null,
      ]
        .filter(Boolean)
        .join("\n")
    })
    .filter((value) => value.trim().length > 0)

  return [turn.reasoning ? `생각\n${turn.reasoning}` : null, ...itemSections]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    )
    .join("\n\n")
}

const formatTurnTime = (date: Date) => {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

const getTimestampValue = (message: AIMessage) => {
  const candidates = [
    message.response_metadata?.timestamp,
    message.response_metadata?.created_at,
    message.response_metadata?.createdAt,
    message.additional_kwargs?.timestamp,
    message.additional_kwargs?.created_at,
    message.additional_kwargs?.createdAt,
  ]

  for (const candidate of candidates) {
    if (candidate == null) {
      continue
    }

    const date =
      typeof candidate === "number"
        ? new Date(candidate)
        : new Date(String(candidate))

    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

const getAssistantTurnTimeLabel = (
  turn: Extract<ChatGroupedTurn, { kind: "assistant" }>
) => {
  for (let index = turn.aiMessages.length - 1; index >= 0; index -= 1) {
    const message = turn.aiMessages[index]
    if (!message) {
      continue
    }

    const timestamp = getTimestampValue(message)
    if (timestamp) {
      return formatTurnTime(timestamp)
    }
  }

  return formatTurnTime(new Date())
}
