# Catalog API

`src/agent/webapp.py`가 chat 화면에서 읽는 모델과 tool 목록을 낸다.  
프론트는 `http://localhost:8088/api/agent` 뒤에 이 두 경로를 붙여 호출한다.

```text
GET http://localhost:8088/api/agent/api/v1/llm/models
GET http://localhost:8088/api/agent/api/v1/llm/tools
```

## `/api/v1/llm/models`

```py
@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(_: DocumentedBearerAuth) -> ListChatModelsResponse:
    try:
        return await list_chat_models()
    except ChatModelCatalogError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="failed to fetch chat models",
        ) from None
```

`DocumentedBearerAuth`는 `HTTPBearer(auto_error=False)`다.  
`/docs`와 `/openapi.json`에 `Bearer JWT` 스키마를 보이게 하려는 용도다.  
실제 JWT 검증은 `src/agent/security/auth.py`의 LangGraph custom auth가 맡는다.

```py
bearer_auth = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="bearerAuth",
    description="authentik access token를 Authorization: Bearer <token> 헤더로 전달합니다.",
    auto_error=False,
)
```

`list_chat_models()`는 내부 모델 카드 목록을 `ListChatModelsResponse`로 바꾼다.

```py
async def list_chat_models() -> ListChatModelsResponse:
    try:
        return ListChatModelsResponse(
            object="list",
            data=[card.to_model_info() for card in list_chat_model_cards()],
        )
    except (ValueError, TypeError) as error:
        raise ChatModelCatalogError("failed to fetch chat models") from error
```

```py
class ListChatModelsResponse(BaseModel):
    object: str
    data: list[ChatModelInfo]


class ChatModelInfo(BaseModel):
    id: str
    object: str
    created: int
    supported_reasoning_efforts: list[ReasoningEffort]
```

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

현재 카드 목록은 세 개다.

```py
ChatModelCard(
    id="gpt-oss:120b",
    routes=(
        ChatModelRoute(provider="ollama", langchain_model="gpt-oss:120b", context_window=128000),
    ),
    supported_reasoning_efforts=("none", "low", "medium", "high"),
    default_reasoning_effort="medium",
)

ChatModelCard(
    id="gemma-4-31b-it",
    routes=(
        ChatModelRoute(provider="google", langchain_model="gemma-4-31b-it", context_window=1000000),
        ChatModelRoute(provider="openrouter", langchain_model="google/gemma-4-31b-it", context_window=1000000),
    ),
    supported_reasoning_efforts=("high",),
    default_reasoning_effort="high",
)

ChatModelCard(
    id="deepseek-v4-flash",
    routes=(
        ChatModelRoute(provider="opencode_zen", langchain_model="deepseek-v4-flash-free", context_window=262144),
        ChatModelRoute(provider="openrouter", langchain_model="deepseek/deepseek-v4-flash", context_window=262144),
    ),
    supported_reasoning_efforts=("none", "high"),
    default_reasoning_effort="high",
)
```

프론트는 `frontend/src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`에서 이 응답을 `zod`로 파싱한다.

```ts
const modelsResponseSchema = z.object({
  object: z.string(),
  data: z.array(
    z.object({
      id: z.string(),
      object: z.string(),
      created: z.number(),
      supported_reasoning_efforts: z.array(reasoningEffortSchema),
    })
  ),
})
```

```ts
await fetch("http://localhost:8088/api/agent/api/v1/llm/models", {
  credentials: "include",
  cache: "no-store",
})
```

`ChatModelCatalogError`는 변환 실패용 예외다.  
`webapp.py`는 이 예외를 502 `application/problem+json`으로 바꾼다.

## `/api/v1/llm/tools`

```py
@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(_: DocumentedBearerAuth) -> ListChatToolsResponse:
    return ListChatToolsResponse(tools=list_chat_tools())
```

```py
class ListChatToolsResponse(BaseModel):
    tools: list[ChatToolInfo]


class ChatToolInfo(BaseModel):
    name: str
    description: str
    category: str
    default_allowed: bool
    allowed_decisions: list[ChatApprovalDecisionType]
```

현재 등록된 tool은 `calculator` 하나고, 노출되는 이름은 `add`, `subtract`, `multiply`, `divide`다.

```py
ToolSpec(
    tool=add,
    name="add",
    description="두 숫자를 더합니다.",
    category="calculator",
    default_allowed=True,
    allowed_decisions=["approve", "edit", "reject", "respond"],
)
```

`ToolSpec`는 이름, 설명, category, `args_schema`를 검증한다.

```py
class ToolSpec(BaseModel):
    tool: BaseTool
    name: str
    description: str
    category: ToolCategory
    args_schema: Any
    default_allowed: bool
    allowed_decisions: list[ApprovalDecisionType]
```

`validate_tool_specs()`는 중복 tool 이름을 막는다.  
`list_chat_tools()`는 이 spec을 `ChatToolInfo`로 옮겨준다.

```py
def list_chat_tools() -> list[ChatToolInfo]:
    return [
        ChatToolInfo(
            name=spec.name,
            description=spec.description,
            category=spec.category,
            default_allowed=spec.default_allowed,
            allowed_decisions=list(spec.allowed_decisions),
        )
        for spec in CHAT_TOOL_SPECS
    ]
```

프론트는 `default_allowed`로 기본 승인 목록을 만든다.  
`allowed_decisions`는 HITL UI의 선택지로 그대로 들어간다.

## `application/problem+json`

`src/agent/core/exception_handlers.py`는 FastAPI 예외를 RFC 7807 모양으로 통일한다.

```py
class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str | None = None
    status: int
    detail: str | None = None
    instance: str | None = None
```

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "body.name: Field required",
  "instance": "/validate"
}
```

```json
{
  "type": "about:blank",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "서버 내부 오류가 발생했습니다.",
  "instance": "/error"
}
```

## 주요 파일

- `src/agent/webapp.py`
- `src/agent/schemas/chat.py`
- `src/agent/services/chat/model_catalog.py`
- `src/agent/services/chat/model_cards.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `src/agent/services/chat/tools/calculator_tool/calculator_tool.py`
- `src/agent/core/exception_handlers.py`
- `src/agent/core/exceptions.py`
- `src/agent/schemas/problem_detail.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/context.py`
- `src/agent/services/chat/models.py`
- `src/agent/services/chat/providers/factory.py`
- `src/agent/services/chat/fallback/runner.py`

## 참고 문서

- LangGraph custom routes: https://docs.langchain.com/langsmith/custom-routes
- LangGraph OpenAPI security: https://docs.langchain.com/langsmith/openapi-security
- FastAPI Security Tools: https://fastapi.tiangolo.com/reference/security/
- FastAPI Dependencies and Security: https://fastapi.tiangolo.com/reference/dependencies/
