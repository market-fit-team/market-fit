import { type KeyboardEvent, type RefObject } from "react"
import { Textarea } from "@/shared/components/ui/textarea"

interface ChatComposerTextareaProps {
  disabled: boolean
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onSubmit: () => void
}

export function ChatComposerTextarea({
  disabled,
  textareaRef,
  onSubmit,
}: ChatComposerTextareaProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex items-start gap-3 px-3 pt-2">
      <div className="min-w-0 flex-1">
        <Textarea
          ref={textareaRef}
          disabled={disabled}
          rows={2}
          placeholder="메시지 입력… Shift+Enter 줄바꿈"
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-20 resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  )
}
