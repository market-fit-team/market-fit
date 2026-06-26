import { describe, expect, it } from "vitest"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { groupChatTurns } from "@/features/chat/lib/workspace/group-chat-turns"

describe("groupChatTurns", () => {
  it("assistant turn 내부에서 텍스트와 도구 카드 순서를 보존한다.", () => {
    const result = groupChatTurns({
      messages: [
        new HumanMessage({ id: "human-1", content: "리포트 만들고 저장해줘" }),
        new AIMessage({
          id: "ai-1",
          content: "초안을 먼저 만들겠습니다.",
          tool_calls: [
            {
              id: "tool-1",
              name: "artifact_create",
              args: { artifact_type: "markdown" },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-1",
          content: JSON.stringify({
            id: "artifact-1",
            thread_id: "thread-1",
            type: "markdown",
            title: "초안 아티팩트",
            summary: "임시 초안입니다.",
            raw_text: "초안 본문",
            version: 1,
            source_message_id: null,
            source_tool_call_id: "tool-1",
          }),
          tool_call_id: "tool-1",
        }),
        new AIMessage({
          id: "ai-2",
          content: "이제 라이브러리에 저장하겠습니다.",
          tool_calls: [
            {
              id: "tool-2",
              name: "artifact_save_as_document",
              args: { artifact_id: "artifact-1" },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-2",
          content: JSON.stringify({
            id: "doc-1",
            type: "markdown",
            title: "저장된 문서",
            summary: "재사용 가능한 문서입니다.",
            raw_text: "문서 본문",
            source_artifact_id: "artifact-1",
          }),
          tool_call_id: "tool-2",
        }),
        new AIMessage({
          id: "ai-3",
          content: "정리가 끝났습니다.",
        }),
      ],
      toolCalls: [
        {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          args: { artifact_type: "markdown" },
        },
        {
          id: "tool-2",
          callId: "tool-2",
          name: "artifact_save_as_document",
          status: "finished",
          args: { artifact_id: "artifact-1" },
        },
      ] as never,
    })

    expect(result.turns).toHaveLength(2)

    const assistantTurn =
      result.turns[1] && result.turns[1].kind === "assistant"
        ? result.turns[1]
        : null

    expect(assistantTurn?.items).toEqual([
      {
        kind: "text",
        key: "ai-1-text",
        text: "초안을 먼저 만들겠습니다.",
      },
      {
        kind: "tool-call",
        key: "tool-1",
        toolCallId: "tool-1",
        toolCallName: "artifact_create",
        toolCall: {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          args: { artifact_type: "markdown" },
        },
        toolResult: {
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          argsSummary: JSON.stringify({ artifact_type: "markdown" }, null, 2),
          resultSummary: JSON.stringify({
            id: "artifact-1",
            thread_id: "thread-1",
            type: "markdown",
            title: "초안 아티팩트",
            summary: "임시 초안입니다.",
            raw_text: "초안 본문",
            version: 1,
            source_message_id: null,
            source_tool_call_id: "tool-1",
          }),
        },
        cards: [
          {
            kind: "artifact",
            artifact: expect.objectContaining({
              id: "artifact-1",
              thread_id: "thread-1",
              type: "markdown",
              title: "초안 아티팩트",
              summary: "임시 초안입니다.",
              raw_text: "초안 본문",
              version: 1,
            }),
          },
        ],
      },
      {
        kind: "text",
        key: "ai-2-text",
        text: "이제 라이브러리에 저장하겠습니다.",
      },
      {
        kind: "tool-call",
        key: "tool-2",
        toolCallId: "tool-2",
        toolCallName: "artifact_save_as_document",
        toolCall: {
          id: "tool-2",
          callId: "tool-2",
          name: "artifact_save_as_document",
          status: "finished",
          args: { artifact_id: "artifact-1" },
        },
        toolResult: {
          callId: "tool-2",
          name: "artifact_save_as_document",
          status: "finished",
          argsSummary: JSON.stringify({ artifact_id: "artifact-1" }, null, 2),
          resultSummary: JSON.stringify({
            id: "doc-1",
            type: "markdown",
            title: "저장된 문서",
            summary: "재사용 가능한 문서입니다.",
            raw_text: "문서 본문",
            source_artifact_id: "artifact-1",
          }),
        },
        cards: [
          {
            kind: "library-document",
            document: expect.objectContaining({
              id: "doc-1",
              type: "markdown",
              title: "저장된 문서",
              summary: "재사용 가능한 문서입니다.",
              raw_text: "문서 본문",
              source_artifact_id: "artifact-1",
            }),
          },
        ],
      },
      {
        kind: "text",
        key: "ai-3-text",
        text: "정리가 끝났습니다.",
      },
    ])
  })

  it("artifact 도구 호출은 라이브러리 카드로 오인하지 않는다.", () => {
    const result = groupChatTurns({
      messages: [
        new HumanMessage({ id: "human-1", content: "초안만 만들어줘" }),
        new AIMessage({
          id: "ai-1",
          content: "초안을 만들겠습니다.",
          tool_calls: [
            {
              id: "tool-1",
              name: "artifact_create",
              args: { artifact_type: "markdown" },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-1",
          content: JSON.stringify({
            id: "artifact-1",
            thread_id: "thread-1",
            type: "markdown",
            title: "초안 아티팩트",
            summary: null,
            raw_text: "초안 본문",
            version: 1,
            source_message_id: null,
            source_tool_call_id: "tool-1",
          }),
          tool_call_id: "tool-1",
        }),
      ],
      toolCalls: [
        {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          args: { artifact_type: "markdown" },
        },
      ] as never,
    })

    const assistantTurn =
      result.turns[1] && result.turns[1].kind === "assistant"
        ? result.turns[1]
        : null
    const toolItem =
      assistantTurn?.items.find(
        (item) => item.kind === "tool-call" && item.toolCallName === "artifact_create"
      ) ?? null

    expect(toolItem && toolItem.kind === "tool-call" ? toolItem.cards : []).toEqual([
      {
        kind: "artifact",
        artifact: expect.objectContaining({
          id: "artifact-1",
        }),
      },
    ])
  })
})
