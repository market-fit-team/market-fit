import { describe, expect, it } from "vitest"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { groupChatTurns } from "@/features/chat/lib/workspace/group-chat-turns"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const artifacts: ArtifactResponse[] = [
  {
    id: "artifact-1",
    thread_id: "thread-1",
    langgraph_thread_id: "lg-thread-1",
    source_message_id: null,
    source_tool_call_id: "tool-1",
    type: "markdown",
    title: "생성된 아티팩트",
    summary: null,
    raw_text: "본문",
    version: 1,
    created_at: "2026-06-26T00:00:00Z",
    updated_at: "2026-06-26T00:00:00Z",
  },
]

const documents: DocumentResponse[] = [
  {
    id: "doc-1",
    type: "markdown",
    title: "저장된 문서",
    summary: null,
    raw_text: "본문",
    source_artifact_id: "artifact-1",
    created_at: "2026-06-26T00:00:00Z",
    updated_at: "2026-06-26T00:00:00Z",
  },
]

describe("groupChatTurns", () => {
  it("연속된 AI/tool/AI 흐름을 하나의 assistant turn으로 묶는다.", () => {
    const firstAi = new AIMessage({
      id: "ai-1",
      content: "도구를 실행해볼게요.",
      tool_calls: [
        {
          id: "tool-1",
          name: "artifact_create",
          args: {},
        },
      ],
    })
    const toolResult = new ToolMessage({
      id: "tool-message-1",
      content: "done",
      tool_call_id: "tool-1",
    })
    const finalAi = new AIMessage({
      id: "ai-2",
      content: "완료했습니다.",
    })

    const result = groupChatTurns({
      messages: [
        new HumanMessage({ id: "human-1", content: "리포트 만들어줘" }),
        firstAi,
        toolResult,
        finalAi,
      ],
      toolCalls: [
        {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          args: {},
        },
      ] as never,
      artifacts,
      documents,
    })

    expect(result.turns).toHaveLength(2)
    expect(result.turns[1]).toMatchObject({
      kind: "assistant",
      textContent: "도구를 실행해볼게요.\n\n완료했습니다.",
      representativeMessageId: "ai-2",
    })

    const assistantTurn =
      result.turns[1] && result.turns[1].kind === "assistant"
        ? result.turns[1]
        : null

    expect(assistantTurn?.toolCalls).toHaveLength(1)
    expect(assistantTurn?.toolResults).toEqual([
      {
        callId: "tool-1",
        name: "artifact_create",
        status: "finished",
        argsSummary: "{}",
        resultSummary: "done",
      },
    ])
    expect(assistantTurn?.artifacts).toEqual(artifacts)
    expect(assistantTurn?.documents).toEqual(documents)
    expect(result.ungroupedArtifacts).toEqual([])
  })
})
