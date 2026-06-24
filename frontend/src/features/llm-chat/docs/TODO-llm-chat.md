# TODO-llm-chat

`src/app/example/chat/layout.tsx`는 좌측 채팅 목록과 우측 컨텍스트 패널을 유지한다.  
`src/app/example/chat/[threadId]/page.tsx`는 앱 스레드 UUID를 받아 실제 대화 본문을 렌더한다.  
`langgraph_thread_id`는 `features/llm-chat/components/workspace/chat-workspace-thread-view.tsx`에서 `useStream`과 native thread state hydrate에만 쓴다.

## raw_text viewer

문서와 아티팩트 상세는 아직 `raw_text`만 보여준다.

```text
/example/chat/documents/[documentId]
-> ChatDocumentDetailView
-> raw_text

/example/chat/artifacts/[artifactId]
-> ChatArtifactDetailView
-> raw_text
```

현재 구현 경로:

- `src/features/llm-chat/components/workspace/chat-document-detail-view.tsx`
- `src/features/llm-chat/components/workspace/chat-artifact-detail-view.tsx`
- `src/features/llm-chat/components/workspace/chat-detail-dialog.tsx`

두 상세 뷰에는 아래 TODO 주석이 이미 들어가 있다.

```tsx
// TODO: markdown/chart 전용 렌더러를 붙이면 raw_text 대신 구조화 렌더링으로 교체한다.
// TODO: artifact type별 viewer registry를 도입하면 raw_text 대신 전용 viewer를 연결한다.
```

## markdown/chart renderer

문서나 아티팩트가 markdown 본문 안에 chart block을 담기 시작하면 `raw_text`를 그대로 뿌리는 방식은 한계가 있다.

필요한 확장 지점:

```text
raw_text
-> markdown parser
-> block AST
-> chart block detect
-> recharts component
```

후보 경로:

- `src/features/llm-chat/components/workspace/chat-document-detail-view.tsx`
- `src/features/llm-chat/components/workspace/chat-artifact-detail-view.tsx`
- `src/features/llm-chat/lib/workspace/`

`chat-*detail-view.tsx`에서 바로 파싱을 시작하지 말고, block 변환 로직은 `lib/workspace`로 먼저 분리하는 편이 낫다.

## artifact viewer registry

아티팩트는 `type`에 따라 viewer가 달라질 가능성이 크다.

현재 type:

```text
commercial_report
search_report
research_report
markdown
code
```

확장할 때는 아래처럼 registry shape를 두는 편이 안전하다.

```ts
type ArtifactViewerProps = {
  type: string
  rawText: string
  summary: string | null
}

const artifactViewerRegistry = {
  markdown: MarkdownArtifactViewer,
  code: CodeArtifactViewer,
}
```

현재 상세 뷰는 registry가 없고 `raw_text` fallback만 있다.

## 채팅 안의 결과물 표시

현재 결과물 노출은 두 군데만 한다.

```text
우측 Artifacts 패널
상단 "생성된 결과물" 배지 + 최신 결과물 링크
```

관련 경로:

- `src/features/llm-chat/components/workspace/chat-artifact-list.tsx`
- `src/features/llm-chat/components/workspace/chat-workspace-header.tsx`

다음 단계에서는 `source_message_id`를 기준으로 특정 AI 메시지 아래에 결과물 링크나 얇은 카드 블록을 붙일 수 있다.  
이때도 본문 렌더링 컴포넌트는 `messages/`에 직접 넣기보다 `workspace/` 쪽 어댑터를 두는 편이 낫다.

## native thread hydrate

최신 대화와 HITL interrupt 복원은 `@langchain/react`의 `useStream({ threadId })`가 맡는다.
workspace 화면은 `agent_threads.langgraph_thread_id`만 넘기고, 별도 `threads/{langgraph_thread_id}/state` 조회를 하지 않는다.

```text
app thread id
-> agent-threads list
-> langgraph_thread_id resolve
-> useStream({ threadId: langgraph_thread_id })
-> SDK hydrate
-> messages / toolCalls / interrupts
```

관련 경로:

- `src/features/llm-chat/components/workspace/chat-workspace-thread-view.tsx`
- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`

`useStream`이 durable thread state를 읽고 `messages`, `toolCalls`, `interrupts` projection을 만든다.
workspace에서 `initialValues`를 따로 넣으면 messages와 interrupts의 원천이 갈라진다.

## 참고 문서

- `useStream`: `https://reference.langchain.com/javascript/langchain-react/use-stream`
- Join & rejoin: `https://docs.langchain.com/oss/javascript/langchain/frontend/join-rejoin`
- Threads: `https://docs.langchain.com/langsmith/use-threads`
- Persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
