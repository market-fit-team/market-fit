# Models and Providers

`src/agent/services/chat/model_cards.py`가 public model id와 provider route 순서를 들고 있다.  
`src/agent/services/chat/models.py`는 card lookup 뒤에 fallback runner를 붙인다.  
`src/agent/services/chat/providers/*`는 provider별 client 생성과 stream 차이를 감싼다.

## `ChatModelCard`

```py
@dataclass(frozen=True, slots=True)
class ChatModelRoute:
    provider: ChatModelProvider
    langchain_model: str
    context_window: int

@dataclass(frozen=True, slots=True)
class ChatModelCard:
    id: str
    model_family: str
    routes: tuple[ChatModelRoute, ...]
    supported_reasoning_efforts: tuple[ReasoningEffort, ...]
    default_reasoning_effort: ReasoningEffort
    fallback_retry_delay_seconds: float = 10.0
    created: int = 0
    object: str = "model"
```

`ChatModelProvider`는 `ollama`, `google`, `opencode_zen`, `openrouter`만 받는다.

```text
gpt-oss:120b
  1. ollama -> gpt-oss:120b
  supported_reasoning_efforts: none, low, medium, high
  default_reasoning_effort: medium

gemma-4-31b-it
  1. google -> gemma-4-31b-it
  2. openrouter -> google/gemma-4-31b-it
  supported_reasoning_efforts: high
  default_reasoning_effort: high

deepseek-v4-flash
  1. opencode_zen -> deepseek-v4-flash-free
  2. openrouter -> deepseek/deepseek-v4-flash
  supported_reasoning_efforts: none, high
  default_reasoning_effort: high
```

`fallback_retry_delay_seconds`는 카드 기본값 10초다.  
route 순서는 `routes` 튜플 순서를 그대로 쓴다.

## `list_chat_models()`

```py
class ChatModelInfo(BaseModel):
    id: str
    object: str
    created: int
    supported_reasoning_efforts: list[ReasoningEffort]

class ListChatModelsResponse(BaseModel):
    object: str
    data: list[ChatModelInfo]
```

```py
return ListChatModelsResponse(
    object="list",
    data=[card.to_model_info() for card in list_chat_model_cards()],
)
```

`to_model_info()`는 `created=0`과 `object="model"`을 그대로 내보낸다.  
`src/agent/webapp.py`의 `GET /api/v1/llm/models`는 이 응답을 그대로 돌려준다.  
카탈로그 변환에서 `ValueError`나 `TypeError`가 나면 502가 난다.

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-oss:120b",
      "object": "model",
      "created": 0,
      "supported_reasoning_efforts": ["none", "low", "medium", "high"]
    }
  ]
}
```

## `resolve_chat_model_context()`

```py
model = raw_context.get("model") or _default_model_id()
model_card = get_chat_model_card(model)
reasoning_effort = raw_context.get("reasoning_effort") or model_card.default_reasoning_effort
```

`_default_model_id()`는 catalog의 첫 번째 card id를 쓴다.  
지금은 `gpt-oss:120b`다.

## `get_chat_model()`

```py
card = get_chat_model_card(model)
assert_supported_reasoning_effort(card=card, reasoning_effort=reasoning_effort)
return FallbackChatModel(
    card=card,
    reasoning_effort=reasoning_effort,
    model_factory=create_chat_model_for_route,
)
```

지원하지 않는 reasoning effort면 `UnsupportedReasoningEffortError`가 난다.  
모델 id가 없으면 `ChatModelNotFoundError`가 난다.

## `create_chat_model_for_route()`

```py
if route.provider == "ollama":
    return create_ollama_chat_model(...)
if route.provider == "google":
    return create_google_chat_model(...)
if route.provider == "opencode_zen":
    return create_opencode_zen_chat_model(...)
if route.provider == "openrouter":
    return create_openrouter_chat_model(...)
raise ValueError(...)
```

`route.provider`가 카드에 적힌 순서 그대로 들어온다.  
없는 provider 문자열은 받지 않는다.

## `FallbackChatModel`

```py
for index, route in enumerate(self.card.routes):
    try:
        model = self.model_factory(route, self.reasoning_effort)
        if self.bind_tools_args or self.bind_tools_kwargs:
            model = model.bind_tools(*self.bind_tools_args, **(self.bind_tools_kwargs or {}))
        return await model.ainvoke(input, config=config, **kwargs)
    except Exception as error:
        record_chat_error(error, context={...})
        if first_error is None:
            first_error = error
        if index < len(self.card.routes) - 1:
            await self.sleep(self.card.fallback_retry_delay_seconds)

if first_error is not None:
    raise first_error
```

첫 route가 실패하면 다음 route로 넘어간다.  
중간 실패는 `record_chat_error()`로 남긴다.  
모든 route가 실패하면 첫 번째 에러를 다시 던진다.  
route가 하나도 없으면 `ValueError`가 난다.

## provider adapters

### `ollama`

```py
kwargs = {
    "model": route.langchain_model,
    "base_url": settings.ollama_base_url,
    "num_ctx": route.context_window,
    "reasoning": False if reasoning_effort == "none" else reasoning_effort,
}
if settings.ollama_api_key:
    headers = {"Authorization": f"Bearer {settings.ollama_api_key}"}
    kwargs["client_kwargs"] = {"headers": headers}
    kwargs["async_client_kwargs"] = {"headers": headers}
    kwargs["sync_client_kwargs"] = {"headers": headers}
return ChatOllama(**kwargs)
```

`OLLAMA_API_KEY`가 있을 때만 Bearer header를 붙인다.  
`route.context_window`는 `num_ctx`로 들어간다.

### `google`

```py
kwargs = {
    "model": route.langchain_model,
    "api_key": settings.gemini_api_key,
}
if reasoning_effort != "none":
    kwargs["thinking_level"] = reasoning_effort
return ChatGoogleGenerativeAI(**kwargs)
```

`none`일 때는 `thinking_level`을 넘기지 않는다.  
나머지는 `thinking_level`에 reasoning effort를 그대로 넣는다.

### `openrouter`

```py
kwargs = {
    "model": route.langchain_model,
    "api_key": settings.openrouter_api_key,
    "base_url": settings.openrouter_base_url,
    "streaming": True,
    "use_responses_api": False,
}
if reasoning_effort == "none":
    kwargs["extra_body"] = {"reasoning": {"enabled": False}}
else:
    kwargs["extra_body"] = {"reasoning": {"effort": reasoning_effort}}
return ChatOpenAI(**kwargs)
```

`streaming=True`다.  
`use_responses_api=False`다.  
`extra_body.reasoning`로 reasoning mode를 붙인다.

### `opencode_zen`

```py
class ChatOpenCodeZen(ChatOpenAI):
    def _get_request_payload(...):
        ...
        reasoning_content = original_message.additional_kwargs.get("reasoning_content")
        if reasoning_content:
            request_message["reasoning_content"] = reasoning_content

    def _convert_chunk_to_generation_chunk(...):
        generation_chunk = super()._convert_chunk_to_generation_chunk(...)
        reasoning_content = _extract_reasoning_content(chunk)
        if reasoning_content and isinstance(generation_chunk.message, AIMessageChunk):
            generation_chunk.message.additional_kwargs["reasoning_content"] = reasoning_content
        return generation_chunk
```

```py
kwargs = {
    "model": route.langchain_model,
    "api_key": settings.opencode_zen_api_key,
    "base_url": settings.opencode_zen_base_url,
    "streaming": True,
    "use_responses_api": False,
}
if reasoning_effort == "none":
    kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
else:
    kwargs["reasoning_effort"] = reasoning_effort
    kwargs["extra_body"] = {"thinking": {"type": "enabled"}}
```

이 adapter는 `reasoning_content`가 request와 stream chunk 양쪽에서 지워지지 않게 붙잡는다.  
DeepSeek thinking stream을 그대로 넘기려는 처리다.

## `inspect_provider_stream_events.py`

```py
PROVIDER_DEFAULT_REASONING = {
    "ollama": "medium",
    "google": "high",
    "opencode_zen": "high",
    "openrouter": "high",
}

card, route = _route_for_provider(args.provider, model_id=args.model)
model = create_chat_model_for_route(route, PROVIDER_DEFAULT_REASONING[route.provider])

async for event in model.astream_events(prompt, version="v2"):
    compact = _compact_event(event)
    compact["route"] = {
        "public_model_id": card.id,
        "provider": route.provider,
        "langchain_model": route.langchain_model,
    }
    print(json.dumps(compact, ensure_ascii=False))
```

이 스크립트는 provider별 stream event shape를 직접 찍는다.  
`_route_for_provider()`는 card 목록을 순서대로 보고, 같은 provider가 있으면 첫 번째 route를 고른다.

## `core/config.py` / `.env.example`

```py
class Settings(BaseSettings):
    jwks_url: str = "http://host.docker.internal:3000/api/auth/jwks"
    jwt_issuer: str = "http://localhost:3000"
    jwt_audience: str = "frontend-api"
    jwt_algorithm: str = "RS256"

    ollama_api_key: str | None = None
    ollama_base_url: str = "https://ollama.com"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    opencode_zen_api_key: str | None = None
    opencode_zen_base_url: str = "https://opencode.ai/zen/v1"
    gemini_api_key: str | None = None
```

```text
JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=frontend-api
JWT_ALGORITHM=RS256

OLLAMA_API_KEY=
OLLAMA_BASE_URL=https://ollama.com
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENCODE_ZEN_API_KEY=
OPENCODE_ZEN_BASE_URL=https://opencode.ai/zen/v1
GEMINI_API_KEY=
```

`Settings`는 `.env`를 읽는다.  
provider adapter는 이 값만 보고 client를 만든다.

## 주요 파일

- `src/agent/services/chat/model_cards.py`
- `src/agent/services/chat/model_catalog.py`
- `src/agent/services/chat/models.py`
- `src/agent/services/chat/fallback/runner.py`
- `src/agent/services/chat/providers/factory.py`
- `src/agent/services/chat/providers/google.py`
- `src/agent/services/chat/providers/ollama.py`
- `src/agent/services/chat/providers/openrouter.py`
- `src/agent/services/chat/providers/opencode_zen.py`
- `src/agent/services/chat/context.py`
- `src/agent/core/config.py`
- `src/agent/webapp.py`
- `.env.example`
- `scripts/inspect_provider_stream_events.py`

## 참고 문서

- LangChain chat model integrations: https://docs.langchain.com/oss/python/integrations/chat
- ChatOpenAI integration: https://docs.langchain.com/oss/python/integrations/chat/openai
- ChatGoogleGenerativeAI integration: https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai
- Google integrations: https://docs.langchain.com/oss/python/integrations/providers/google
- Google Gemini thinking: https://ai.google.dev/gemini-api/docs/thinking
- OpenRouter authentication: https://openrouter.ai/docs/api/reference/authentication
- OpenRouter quickstart: https://openrouter.ai/docs/quickstart
- OpenRouter streaming: https://openrouter.ai/docs/api/reference/streaming
- OpenRouter models API: https://openrouter.ai/docs/api/api-reference/models/get-models
- Ollama introduction: https://docs.ollama.com/api/introduction
- Ollama authentication: https://docs.ollama.com/api/authentication
- Ollama OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
