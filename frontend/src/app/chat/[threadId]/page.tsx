import { ChatWorkspaceThreadView } from "@/features/chat/components/workspace/chat-workspace-thread-view"

type SearchParams = Promise<{
  starter?: string | string[]
}>

type ChatThreadPageProps = {
  params: Promise<{
    threadId: string
  }>
  searchParams: SearchParams
}

const getStarterMessage = async (searchParams: SearchParams) => {
  const params = await searchParams
  const starter = params.starter

  if (Array.isArray(starter)) {
    return starter[0] ?? null
  }

  return starter ?? null
}

export default async function ChatThreadPage({
  params,
  searchParams,
}: ChatThreadPageProps) {
  const { threadId } = await params
  const starterMessage = await getStarterMessage(searchParams)

  return (
    <ChatWorkspaceThreadView
      threadId={threadId}
      starterMessage={starterMessage}
    />
  )
}
