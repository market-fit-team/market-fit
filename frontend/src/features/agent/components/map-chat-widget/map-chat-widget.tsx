"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Send } from "lucide-react"
import {
  buildMapChatReply,
  initialMapChatMessage,
  mapChatPresetPrompts,
} from "@/features/agent/lib/build-map-chat-reply"
import { useChatStore } from "@/features/agent/store/chat-store"
import type { DistrictData } from "@/features/startup/lib/data"
import { Button } from "@/shared/components/ui/button"
import { CardContent, CardFooter } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"

type MapChatWidgetProps = {
  selectedTradeArea: DistrictData | null
}

// MapChatWidget은 지도 페이지에 붙는 에이전트 채팅 UI다.
// 지도 스토어를 직접 불러오지 않고 헤더와 지도 맥락만 속성으로 받는다.
export function MapChatWidget({ selectedTradeArea }: MapChatWidgetProps) {
  const router = useRouter()
  const [chatInput, setChatInput] = useState("")
  const addMessage = useChatStore((state) => state.addMessage)
  const ensureInitialMessage = useChatStore(
    (state) => state.ensureInitialMessage
  )
  const isResponding = useChatStore((state) => state.isResponding)
  const messages = useChatStore((state) => state.messages)
  const setIsResponding = useChatStore((state) => state.setIsResponding)

  useEffect(() => {
    ensureInitialMessage(initialMapChatMessage)
  }, [ensureInitialMessage])

  const handleSendChat = (text: string) => {
    if (!text.trim()) {
      return
    }

    addMessage({ role: "user", content: text })
    setChatInput("")
    setIsResponding(true)

    window.setTimeout(() => {
      addMessage({
        role: "assistant",
        content: buildMapChatReply({
          text,
          selectedTradeArea,
        }),
      })
      setIsResponding(false)
    }, 700)
  }

  const handleGenerateReport = () => {
    if (!selectedTradeArea) {
      return
    }

    router.push(`/report?district=${selectedTradeArea.id}`)
  }

  return (
    <>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-xs">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex max-w-[85%] flex-col ${
              message.role === "user"
                ? "items-end self-end"
                : "items-start self-start"
            }`}
          >
            <span className="mb-1 text-xs text-muted-foreground">
              {message.role === "user" ? "나" : "AI 비서"}
            </span>
            <div
              className={`rounded-2xl border p-3 leading-relaxed ${
                message.role === "user"
                  ? "rounded-tr-none border-primary bg-primary text-primary-foreground"
                  : "rounded-tl-none border-border bg-muted/40 text-foreground"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isResponding && (
          <div className="animate-pulse self-start text-xs text-muted-foreground">
            AI가 상권 통계 정보를 매칭 중입니다...
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            자주 묻는 질문
          </span>
          <div className="flex flex-wrap gap-1.5">
            {mapChatPresetPrompts.map((prompt) => (
              <Button
                key={prompt.text}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleSendChat(prompt.prompt)}
              >
                {prompt.text}
              </Button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSendChat(chatInput)
          }}
          className="flex gap-2"
        >
          <Input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="상권이나 창업에 대해 질문해 보세요..."
            className="flex-1"
          />
          <Button type="submit" size="lg" className="px-3">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleGenerateReport}
          disabled={!selectedTradeArea}
          className="w-full gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span>AI 리포트 작성</span>
        </Button>
      </CardFooter>
    </>
  )
}
