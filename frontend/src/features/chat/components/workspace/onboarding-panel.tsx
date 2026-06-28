"use client"

import {
  Eye,
  Fingerprint,
  MessageSquarePlus,
  MoreVertical,
  PanelLeftClose,
} from "lucide-react"
import type { ChatOnboardingResultPreview } from "@/features/chat/types/workspace"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { formatRelativeTime } from "@/shared/utils"

export type OnboardingPanelItem = ChatOnboardingResultPreview & {
  createdAt: string
  isAttached: boolean
}

type OnboardingPanelProps = {
  items: OnboardingPanelItem[]
  isLoading?: boolean
  isInteractionPending?: boolean
  onCollapsePanel: () => void
  onOpenResult: (result: ChatOnboardingResultPreview) => void
  onToggleContext: (result: ChatOnboardingResultPreview) => void
}

export function OnboardingPanel({
  items,
  isLoading,
  isInteractionPending = false,
  onCollapsePanel,
  onOpenResult,
  onToggleContext,
}: OnboardingPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border/20 bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">성향분석</span>
          <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
            {items.length}
          </Badge>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onCollapsePanel}
                className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
                id="onboarding-panel-collapse-btn"
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">패널 접기</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
        <div className="space-y-1 p-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}

          {!isLoading &&
            items.map((item) => (
              <div
                key={`${item.resultCode}-${item.isDefault ? "default" : "saved"}`}
                onClick={() => onOpenResult(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onOpenResult(item)
                  }
                }}
                role="button"
                tabIndex={0}
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-border/50 hover:bg-muted/25"
                id={`onboarding-row-${item.resultCode}`}
              >
                <div className="mt-0.5 rounded-full border border-border/40 bg-muted/30 p-1.5 text-muted-foreground">
                  <Fingerprint className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="min-w-0 truncate text-xs font-medium text-foreground">
                      {item.profileName}
                    </p>
                    {item.isDefault && (
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        기본값
                      </Badge>
                    )}
                    {item.isAttached && (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        채팅에 추가됨
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {buildOnboardingMetaText(item)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                <OnboardingMenu
                  disabled={isInteractionPending}
                  isAttached={item.isAttached}
                  onOpen={() => onOpenResult(item)}
                  onToggleContext={() => onToggleContext(item)}
                  resultCode={item.resultCode}
                />
              </div>
            ))}

          {!isLoading && items.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              저장된 성향분석 결과가 없습니다
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/15 px-4 py-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          결과를 열어 상세를 보고 현재 채팅에 추가할 수 있습니다
        </p>
      </div>
    </div>
  )
}

function OnboardingMenu({
  disabled,
  isAttached,
  onOpen,
  onToggleContext,
  resultCode,
}: {
  disabled: boolean
  isAttached: boolean
  onOpen: () => void
  onToggleContext: () => void
  resultCode: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/50 hover:text-foreground"
          id={`onboarding-menu-${resultCode}`}
        >
          <MoreVertical className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            onToggleContext()
          }}
          disabled={disabled}
          className="cursor-pointer"
        >
          <MessageSquarePlus className="size-3.5" />
          <span>{isAttached ? "채팅에서 제거" : "채팅에 추가"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
          className="cursor-pointer"
        >
          <Eye className="size-3.5" />
          <span>상세 보기</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const buildOnboardingMetaText = (item: OnboardingPanelItem) => {
  if (item.isDefault) {
    return `기본 프로필 · 결과 코드 ${item.resultCode}`
  }

  if (item.savedLabel?.trim()) {
    return `${item.savedLabel.trim()} · 결과 코드 ${item.resultCode}`
  }

  return `${resolveSavedSourceLabel(item.savedSource)} · 결과 코드 ${item.resultCode}`
}

const resolveSavedSourceLabel = (savedSource: string | null) => {
  switch (savedSource) {
    case "survey_submit":
      return "설문 결과"
    case "manual_save":
      return "수동 저장"
    default:
      return "저장 결과"
  }
}
