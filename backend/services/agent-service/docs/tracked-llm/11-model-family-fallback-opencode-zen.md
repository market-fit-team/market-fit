# 11. Model Family Fallback And OpenCode Zen Adapter

이 문서는 chat model 호출을 서버 내부 모델 카드와 provider adapter로 처리하는 구조를 정리한다.

## Model Card

`src/services/chat/model_cards.py`가 chat model catalog의 단일 출처다.

외부 API와 client에는 public model id와 reasoning effort만 노출한다. `model_family`, provider route, context window, fallback 순서는 서버 내부 정보이며 `/langgraph/models` 응답에 포함하지 않는다.

현재 public model id는 다음이다.

```text
gpt-oss:120b
gemma-4-31b-it
deepseek-v4-flash
```

각 모델 카드는 내부 route 목록을 가진다.

```text
gpt-oss:120b
  -> ollama / gpt-oss:120b

gemma-4-31b-it
  -> google / gemma-4-31b-it
  -> openrouter / google/gemma-4-31b-it

deepseek-v4-flash
  -> opencode_zen / deepseek-v4-flash-free
  -> openrouter / deepseek/deepseek-v4-flash
```

## Fallback Runner

`src/services/chat/fallback/runner.py`의 `FallbackChatModel`이 route 순서대로 모델을 호출한다.

- `bind_tools()` 호출은 wrapper에 저장했다가 실제 route model에 동일하게 적용한다.
- route 호출이 실패하면 `record_chat_error()`로 provider, route index, model id, model family, 내부 model id를 기록한다.
- 다음 route가 있으면 `fallback_retry_delay_seconds`만큼 기다린다. 현재 기본값은 10초다.
- 모든 route가 실패하면 마지막 오류가 아니라 최초 route에서 발생한 오류를 다시 raise한다.

이 구조 때문에 run-level SSE `error` event는 최종 fallback 오류가 아니라 최초 provider 오류를 기준으로 만들어질 수 있다.

## Error Log

`src/services/chat/error_log.py`의 `record_chat_error()`는 chat 오류를 로컬 JSONL 파일에 기록한다.

```text
llm/.logs/chat-errors.jsonl
```

이 파일은 gitignore 대상이다. 나중에 DB 저장으로 바꾸려면 `record_chat_error()` 내부 구현만 교체한다.

## ChatOpenCodeZen

OpenCode Zen은 OpenAI-compatible chat completions endpoint다.

```text
https://opencode.ai/zen/v1
```

`src/services/chat/providers/opencode_zen.py`의 `ChatOpenCodeZen`은 `langchain_openai.ChatOpenAI`를 상속한다. 목적은 OpenCode Zen raw streaming delta의 `reasoning_content`를 LangChain `AIMessageChunk.additional_kwargs.reasoning_content`로 보존하는 것이다.

근거:

- DeepSeek thinking mode는 `reasoning_content`를 `content`와 같은 레벨로 반환한다.
  - https://api-docs.deepseek.com/guides/thinking_mode
- LangChain `ChatOpenAI`는 OpenAI 공식 spec 밖의 third-party field를 보존하지 않는다고 문서화되어 있다.
  - https://docs.langchain.com/oss/python/integrations/chat/openai
- 같은 문제는 LangChain issue로도 보고되어 있다.
  - https://github.com/langchain-ai/langchain/issues/35516

`ChatOpenCodeZen`은 LangChain의 기존 tool call, usage, callback, `astream()`/`astream_events()` 흐름은 유지하고, raw chunk 변환 직후 `delta.reasoning_content`만 추가로 복원한다.

## Stream path

현재 public run stream은 provider별 chunk를 별도 `stream_events` 모듈에서 `data.chunk.text` 같은 custom shape로 재정규화하지 않는다. LangGraph `messages` stream으로 나온 message chunk를 `langgraph_protocol.json.dump_jsonable()`로 직렬화하고, LangGraph SDK가 읽을 수 있는 SSE event로 내보낸다.

OpenCode Zen reasoning 보존 경로:

```text
OpenCode Zen raw delta.reasoning_content
  -> ChatOpenCodeZen
  -> AIMessageChunk.additional_kwargs.reasoning_content
  -> chat_graph.astream(..., stream_mode="messages")
  -> sdk_stream_adapter.to_sdk_sse_event(...)
  -> SSE event: messages
```

Tool call 보존 경로:

```text
OpenCode Zen raw delta.tool_calls
  -> ChatOpenAI tool_call_chunks
  -> AIMessageChunk.tool_call_chunks
  -> LangGraph messages/tools stream
  -> SDK-compatible SSE events
```

검증 포인트는 다음 테스트에 있다.

```text
tests/services/chat/test_opencode_zen.py
tests/services/chat/langgraph_protocol/test_json.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter_tools.py
tests/services/chat/test_fallback_runner.py
```

## Provider adapter 경계

Provider adapter가 해도 되는 일:

- provider SDK/client 생성
- provider raw response의 누락 필드 복원
- LangChain message/chunk 계약으로 변환
- provider 오류를 fallback runner가 다룰 수 있게 전파

Provider adapter가 하지 말아야 할 일:

- HTTP endpoint response shape 결정
- LangGraph thread/run lifecycle 관리
- SSE frame 직접 생성
- HITL interrupt payload 생성
- ToolSpec registry 수정

이 경계를 지켜야 `/langgraph` API와 provider 구현을 독립적으로 유지할 수 있다.
