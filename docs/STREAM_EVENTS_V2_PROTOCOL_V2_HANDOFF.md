# Stream Events Protocol V2 최종 전환 인수 문서

## 결론

이 패치는 legacy `/threads/{thread_id}/runs/stream` + `stream_mode: ["tools"]` 조합을 완전히 제거하고, 공식 Protocol V2 `/threads/{thread_id}/stream/events` + `/threads/{thread_id}/commands` 구조로 전환한다.
프론트엔드는 커스텀 SSE listener/parser/adapter를 만들지 않고, 공식 `@langchain/react` `useStream`의 built-in SSE transport를 사용한다.

근거:
- https://docs.langchain.com/langsmith/agent-server-changelog
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- https://reference.langchain.com/javascript/langchain-react/use-stream
- https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md

## 생성 파일

```text
frontend/src/features/llm-chat/lib/langgraph/build-submit-input.ts  # @langchain/core HumanMessage 입력 사용으로 수정됨
frontend/src/features/llm-chat/lib/langgraph/message-content.ts      # BaseMessage projection 호환 헬퍼로 수정됨
docs/STREAM_EVENTS_V2_PROTOCOL_V2_HANDOFF.md                         # 이 문서
```

## 수정 파일

```text
docker-compose.yml
backend/services/agent-service/README.md
backend/services/agent-service/Dockerfile
backend/services/agent-service/evals/ATTRIBUTION.md
backend/services/agent-service/evals/agent_eval/client.py
backend/services/agent-service/evals/agent_eval/runner.py
backend/services/agent-service/evals/agent_eval/sse.py
backend/services/agent-service/evals/agent_eval/validators.py
frontend/package.json
frontend/package-lock.json
frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx
frontend/src/features/llm-chat/hooks/langgraph-chat-stream-context.ts
frontend/src/features/llm-chat/types/langgraph-chat-state.ts
frontend/src/features/llm-chat/page/components/chat-messages-panel.tsx
frontend/src/features/llm-chat/components/messages/sdk-message-content.tsx
frontend/src/features/llm-chat/components/messages/sdk-message-list.tsx
frontend/src/features/llm-chat/components/messages/sdk-message-item.tsx
frontend/src/features/llm-chat/lib/langgraph/build-submit-config.ts
frontend/src/features/llm-chat/lib/langgraph/build-tool-call-view-model.ts
```

## 삭제 파일

```text
backend/services/agent-service/scripts/patch_langgraph_api_openapi_stream_modes.py
backend/services/agent-service/tests/unit_tests/test_stream_mode_contract.py
frontend/src/features/llm-chat/lib/langgraph/stream-modes.ts
docs/STREAM_EVENTS_V2_PATCH_HANDOFF.md
```

## 핵심 변경

1. `docker-compose.yml`의 `agent-service.environment`에 `FF_V2_EVENT_STREAMING=true`를 추가한다.
2. 프론트는 `@langchain/langgraph-sdk/react`가 아니라 `@langchain/react`의 `useStream`을 사용한다.
3. legacy `streamMode`, `streamResumable`, `optimisticValues`, `switchThread`, `toolProgress` 사용을 제거한다.
4. submit은 `stream.submit(input, { config: { configurable: context } })`로 보낸다.
5. HITL resume은 `stream.respond({ decisions }, { config: { configurable: context } })`로 보낸다.
6. tools UI는 legacy `toolProgress`가 아니라 Protocol V2 `tools` 채널이 조립한 `stream.toolCalls`를 렌더링한다.
7. eval harness는 기존 시나리오를 유지하되, `/stream/events`를 관찰하고 `/commands`로 `run.start` / `input.respond`를 보낸다.

## 검증한 항목

- Python eval 관련 파일 문법 검증: `py_compile` 통과.
- `npm install --package-lock-only --ignore-scripts`로 lock 갱신 완료.
- `npm install --ignore-scripts --omit=optional --no-audit --no-fund` 실행 완료.
- `npm run typecheck -- --pretty false` 실행 결과, 기존 generated API/PageProps/LayoutProps 문제는 남아 있으나 `src/features/llm-chat/**` 관련 TypeScript 오류는 없음.
- `patch_langgraph_api_openapi`, `DEFAULT_LANGGRAPH_STREAM_MODE`, `streamMode`, `streamResumable`, `optimisticValues`, `@langchain/langgraph-sdk/react` 런타임 사용 제거 확인.

## 남은 검증

- 실제 Docker/Compose 환경에서 `agent-service`가 `FF_V2_EVENT_STREAMING=true`로 `/threads/{thread_id}/stream/events`와 `/threads/{thread_id}/commands`를 노출하는지 확인해야 한다.
- 브라우저 Network 탭에서 더 이상 `/threads/{thread_id}/runs/stream` 요청이 없어야 한다.
- 새 요청은 `/threads/{thread_id}/stream/events`와 `/threads/{thread_id}/commands`로만 발생해야 한다.
- calculator add, divide HITL 시나리오에서 `stream.toolCalls`, `stream.interrupts`, `stream.messages`가 정상 렌더링되는지 확인해야 한다.
- `npm build`는 수행하지 않았다. 사용자가 금지했고, 이 환경에서는 generated API 산출물이 없어 전체 typecheck도 기존 오류로 완주할 수 없다.

## 중단 조건

아래 중 하나라도 발생하면 프론트에 커스텀 SSE listener/parser/adapter를 만들지 말고 중단한다.

1. `@langchain/react` built-in SSE transport가 Python Agent Server의 `/stream/events` + `/commands`에 연결하지 못함.
2. `FF_V2_EVENT_STREAMING=true`를 켰는데도 Agent Server가 `/stream/events` 또는 `/commands`를 404로 반환함.
3. `stream.toolCalls`가 비어 있고 raw SSE를 직접 파싱해야만 tools UI를 만들 수 있음.

이 경우 확인할 출처:
- https://docs.langchain.com/langsmith/agent-server-changelog
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- https://reference.langchain.com/javascript/langchain-react/use-stream
