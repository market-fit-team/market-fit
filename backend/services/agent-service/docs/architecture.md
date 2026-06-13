# Architecture

`langgraph.json`이 native Agent Server, custom routes, custom auth를 한 파일에서 묶는다.  
`langgraph.eval.json`은 같은 graph와 app만 두고 auth를 뺀다.  
`--config`는 이 두 파일 중 하나를 고른다.

## langgraph.json

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "http": {
    "app": "./src/agent/webapp.py:app",
    "enable_custom_route_auth": true
  },
  "auth": {
    "path": "src/agent/security/auth.py:auth"
  }
}
```

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "http": {
    "app": "./src/agent/webapp.py:app"
  }
}
```

`langgraph dev`와 `langgraph up`는 기본적으로 `langgraph.json`을 읽는다.  
`--config langgraph.eval.json`으로 바꾸면 auth가 없는 eval 서버가 뜬다.

```text
langgraph dev
  -> langgraph.json

langgraph dev --config langgraph.eval.json
  -> langgraph.eval.json
```

## src/agent/webapp.py

```ts
app = FastAPI(title="Pickle Agent Custom Routes")

@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(_: DocumentedBearerAuth) -> ListChatToolsResponse:
    return ListChatToolsResponse(tools=list_chat_tools())

@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(_: DocumentedBearerAuth) -> ListChatModelsResponse:
    return await list_chat_models()
```

`DocumentedBearerAuth`는 OpenAPI에 `bearerAuth`를 보이게 하는 용도다.  
실제 JWT 검증은 `src/agent/security/auth.py`가 맡는다.

`ListChatToolsResponse`와 `ListChatModelsResponse`는 `src/agent/schemas/chat.py`에 있다.

## src/agent/security/auth.py

```py
auth = Auth()

@auth.authenticate
async def get_current_user(authorization: str | None) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    payload = await _decode_token(token)
    return {
        "identity": payload["sub"],
        "email": payload.get("email"),
        "name": payload.get("name"),
        "claims": payload,
    }
```

JWKS는 `JWKS_URL`에서 가져오고, `PyJWT`로 `iss`, `aud`, `exp`, `sub`를 확인한다.  
`_fetch_jwks()`는 300초 동안 캐시한다.

```text
Authorization: Bearer <JWT>
  -> JWKS_URL
  -> kid match
  -> PyJWT decode
  -> {"identity": sub, "email": ..., "name": ..., "claims": ...}
```

## src/agent/services/chat/graph.py

```py
builder = StateGraph(ChatState, context_schema=ChatRuntimeContext)

builder.add_node("chat_model", call_chat_model)
builder.add_node("approval_gate", approval_gate)
builder.add_node("tools", call_tools_with_approval)

builder.add_edge(START, "chat_model")
builder.add_conditional_edges(
    "chat_model",
    route_after_chat_model,
    {
        "approval_gate": "approval_gate",
        END: END,
    },
)
builder.add_edge("tools", "chat_model")
```

상태와 runtime context는 아래 shape다.

```py
class ChatState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    tool_approval_decisions: NotRequired[list[ApprovalDecision]]

class ChatRuntimeContext(TypedDict):
    model: NotRequired[str]
    reasoning_effort: NotRequired[ReasoningEffort]
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
```

`call_chat_model()`은 `SystemMessage("도구 호출이 완료된 뒤에는 결과를 사용자에게 보고해야 합니다.")`를 앞에 붙이고, `CHAT_TOOLS`를 bind한다.  
`approval_gate()`가 HITL interrupt를 만들고, `call_tools_with_approval()`이 approve/edit/reject/respond 결정을 정리한다.

## src/agent/services/chat/toolkits/chat_toolkit.py

```py
CHAT_TOOL_SPECS: Final[tuple[ToolSpec, ...]] = validate_tool_specs((*CALCULATOR_TOOL_SPECS,))
CHAT_TOOLS: Final[list[BaseTool]] = [spec.tool for spec in CHAT_TOOL_SPECS]
```

계산기 tool 네 개가 `ToolSpec`으로 등록된다.

```py
ToolSpec(
    tool=add,
    name="add",
    description="두 숫자를 더합니다.",
    category="calculator",
    args_schema=add.args_schema,
    default_allowed=True,
    allowed_decisions=["approve", "edit", "reject", "respond"],
)
```

`allowed_tools`가 비어 있으면 기본 allowlist는 `default_allowed=True`인 tool 이름이다.

## src/agent/services/chat/providers

`src/agent/services/chat/models.py`는 내부 모델 카드를 `FallbackChatModel`로 감싼다.  
`FallbackChatModel`은 카드의 `routes`를 순서대로 시도하고, 실패하면 다음 provider로 넘어간다.

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

`reasoning_effort`는 카드별 허용값만 받는다.  
`resolve_chat_model_context()`는 모델이 빠졌을 때 첫 카드 `gpt-oss:120b`와 기본 `medium` effort를 고른다.

## evals/

`evals/config.yaml`이 suite entry point다.

```yaml
run:
  repetitions: 1
  output_dir: reports
  workdir: .workdir
  fail_fast: true

runners:
  - name: local-agent-server
    type: http_sse
    base_url: http://localhost:2024
```

`evals/agent_eval/config_loader.py`는 `scenarios/*.yaml`과 `matrix`를 읽어 `scenario x runner` 조합을 만든다.  
`evals/agent_eval/runner.py`는 다음 순서로 돈다.

```text
load_suite(evals/config.yaml)
  -> build_test_pairs()
  -> POST /threads
  -> POST /threads/{thread_id}/stream/events
  -> POST /threads/{thread_id}/commands
  -> interrupt_requests()
  -> validate_all()
  -> reports/report.json
```

`langgraph.eval.json`에는 `auth`가 없어서 eval은 JWT 없이 로컬에서 돈다.  
프로덕션 경로는 `langgraph.json` + `src/agent/security/auth.py`를 탄다.

## 주요 파일

- `langgraph.json`
- `langgraph.eval.json`
- `src/agent/webapp.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/graph.py`
- `src/agent/services/chat/context.py`
- `src/agent/services/chat/state.py`
- `src/agent/services/chat/model_cards.py`
- `src/agent/services/chat/models.py`
- `src/agent/services/chat/providers/factory.py`
- `src/agent/services/chat/providers/google.py`
- `src/agent/services/chat/providers/ollama.py`
- `src/agent/services/chat/providers/openrouter.py`
- `src/agent/services/chat/providers/opencode_zen.py`
- `src/agent/services/chat/approvals/nodes.py`
- `src/agent/services/chat/fallback/runner.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `evals/config.yaml`
- `evals/agent_eval/config_loader.py`
- `evals/agent_eval/runner.py`
- `evals/agent_eval/client.py`
- `evals/agent_eval/sse.py`
- `evals/scenarios/calculator-add-tool.yaml`
- `evals/scenarios/calculator-divide-hitl.yaml`

## 참고 문서

- LangGraph application structure: https://docs.langchain.com/langsmith/application-structure
- LangGraph CLI: https://docs.langchain.com/langsmith/cli
- LangGraph local development & testing: https://docs.langchain.com/langsmith/local-dev-testing
- LangSmith Agent Server: https://docs.langchain.com/langsmith/agent-server
- LangSmith custom routes: https://docs.langchain.com/langsmith/custom-routes
- Agent Server Protocol V2 event stream SSE: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- Agent Server Protocol V2 command: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth JWT plugin: https://better-auth.com/docs/plugins/jwt
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
