import { useCallback, useRef } from "react"

export function useAutoScroll() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const isAutoScrollEnabled = useRef(true)

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = target

    // 사용자가 스크롤 맨 밑부분 근처에 있는지 확인 (임계값: 50px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 300
    isAutoScrollEnabled.current = isAtBottom
  }, [])

  const scrollToBottom = useCallback((force = false) => {
    if (force || isAutoScrollEnabled.current) {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({
          top: viewportRef.current.scrollHeight,
          behavior: "auto",
        })
      }
    }
  }, [])

  return { viewportRef, onScroll, scrollToBottom }
}
