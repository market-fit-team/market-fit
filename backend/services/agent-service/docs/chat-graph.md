# chat_graph

`backend/services/agent-service/src/agent/services/chat/graph.py`는 `chat_model -> approval_gate -> tools -> chat_model` 루프를 묶는다. `StateGraph(ChatState, context_schema=ChatRuntimeContext)`로 상태와 런타임 context를 분리한다. `compile()` 결과는 `Pregel`이다.

이 파일은 `checkpointer`를 붙이지 않는다. 상태 저장은 Agent Server의 thread/checkpoint 쪽이 맡는다.

```py
from langgraph.graph import END, START, StateGraph

from agent.services.chat.approvals.nodes import approval_gate, call_tools_with_approval
from agent.services.chat.context import ChatRuntimeContext
from agent.services.chat.nodes import call_chat_model
from agent.services.chat.routing import route_after_chat_model
from agent.services.chat.state import ChatState


def _build_chat_graph() -> Any:
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

    return builder.compile()
```

```text
START
  -> chat_model
      -> route_after_chat_model
          tool call 없음 -> END
          tool call 있음 -> approval_gate -> tools -> chat_model
```

`backend/services/agent-service/tests/unit_tests/test_configuration.py`는 `chat_graph`가 `Pregel`로 컴파일되는지만 확인한다.

```py
from langgraph.pregel import Pregel

assert isinstance(chat_graph, Pregel)
```

`backend/services/agent-service/langgraph.json`은 graph id를 `chat`로 잡는다.

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  }
}
```

## ChatState

```py
from typing import Annotated, NotRequired, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages

from agent.services.chat.approvals.schemas import ApprovalDecision


class ChatState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    tool_approval_decisions: NotRequired[list[ApprovalDecision]]
```

`messages`는 `add_messages` reducer를 탄다. 새 메시지는 붙고, 같은 `id`를 가진 메시지는 교체된다. `AIMessage`의 tool call, `ToolMessage`의 결과, 승인 뒤에 만든 합성 메시지가 모두 이 리스트에 들어간다.

```text
messages
  -> 사용자 메시지
  -> AIMessage(tool_calls=[...])
  -> ToolMessage(...)
  -> AIMessage(...)
```

`tool_approval_decisions`는 `approval_gate`에서 `tools`로 넘길 때만 쓰는 임시 상태다. 승인 resume 뒤에는 비워진다.

## ChatRuntimeContext

```py
class ChatRuntimeContext(TypedDict):
    model: NotRequired[str]
    reasoning_effort: NotRequired[ReasoningEffort]
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
```

```py
InterruptOnConfig: TypeAlias = dict[str, bool | InterruptOnPolicy]


class InterruptOnPolicy(TypedDict, total=False):
    allowed_decisions: list[HitlDecisionType]
```

```py
class ResolvedChatRuntimeContext(TypedDict):
    model: str
    reasoning_effort: ReasoningEffort
```

```py
def resolve_chat_model_context(context: ChatRuntimeContext | None) -> ResolvedChatRuntimeContext:
    raw_context = context or {}
    model = raw_context.get("model") or _default_model_id()
    model_card = get_chat_model_card(model)
    reasoning_effort = raw_context.get("reasoning_effort") or model_card.default_reasoning_effort

    return {
        "model": model,
        "reasoning_effort": reasoning_effort,
    }
```

`context.py`의 주석처럼, 이 코드는 `config["configurable"]` 대신 `context_schema + Runtime.context`를 쓴다. 노드 안에서는 `get_runtime(ChatRuntimeContext)`로 읽는다.

```py
runtime = get_runtime(ChatRuntimeContext)
context = resolve_chat_model_context(runtime.context)
```

로컬 호출은 `context=`를 받는다.

```py
await chat_graph.ainvoke(
    {"messages": [{"role": "user", "content": "What is 19*3?"}]},
    context={
        "model": "gpt-oss:120b",
        "reasoning_effort": "medium",
        "allowed_tools": ["multiply"],
        "interrupt_on": {},
    },
)
```

Agent Server 쪽 run body는 `config.configurable`과 `context`를 함께 가진다.

```json
{
  "input": {
    "messages": [{"role": "user", "content": "What is 19*3?"}]
  },
  "config": {
    "configurable": {
      "thread_id": "thread-123"
    }
  },
  "context": {
    "model": "gpt-oss:120b",
    "reasoning_effort": "medium",
    "allowed_tools": ["multiply"],
    "interrupt_on": {}
  }
}
```

## CHAT_TOOLS

```py
CHAT_TOOL_SPECS: Final[tuple[ToolSpec, ...]] = validate_tool_specs((*CALCULATOR_TOOL_SPECS,))
CHAT_TOOLS: Final[list[BaseTool]] = [spec.tool for spec in CHAT_TOOL_SPECS]
```

현재 등록된 tool은 `add`, `subtract`, `multiply`, `divide`다. `default_allowed_tools()`는 `default_allowed=True`인 tool 이름을 새 list로 돌려준다. `list_chat_tools()`는 UI가 쓰는 metadata를 만든다.

```text
calculator_tool/*
  -> ToolSpec
  -> CHAT_TOOL_SPECS
  -> CHAT_TOOLS
  -> bind_tools(...)
```

## call_chat_model

```py
async def call_chat_model(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage]]:
```

`chat_model` node는 runtime context에서 model과 reasoning effort를 고른 뒤, `CHAT_TOOLS`를 붙여 호출한다.

```py
CHAT_SYSTEM_PROMPT = "도구 호출이 완료된 뒤에는 결과를 사용자에게 보고해야 합니다."

runtime = get_runtime(ChatRuntimeContext)
context = resolve_chat_model_context(runtime.context)
model = get_chat_model(
    model=context["model"],
    reasoning_effort=context["reasoning_effort"],
).bind_tools(CHAT_TOOLS)
response: AnyMessage = await model.ainvoke(
    [SystemMessage(content=CHAT_SYSTEM_PROMPT), *state["messages"]],
    config=config,
)
return {"messages": [response]}
```

`get_chat_model()`는 `ChatModelCard`를 찾고, `FallbackChatModel`을 만든다. `state["messages"]` 앞에 system message를 하나 붙인다. 반환값은 `messages` 부분 업데이트다.

## route_after_chat_model

```py
ChatRoute = Literal["approval_gate", "__end__"]


def route_after_chat_model(state: ChatState) -> ChatRoute:
    route = tools_condition({"messages": state["messages"]})
    if route == "tools":
        return "approval_gate"
    return "__end__"
```

```text
AIMessage.tool_calls 없음
  -> __end__

AIMessage.tool_calls 있음
  -> approval_gate
```

`chat_model` node 뒤의 conditional edge는 이 함수만 본다. graph 쪽 매핑은 `"approval_gate"`와 `END` 둘뿐이다.

## approval_gate

```py
def approval_gate(
    state: ChatState,
) -> Command[Any]:
```

```py
class HitlActionRequest(TypedDict):
    name: str
    args: dict[str, Any]
    description: str


class HitlAction(TypedDict):
    name: str
    args: dict[str, Any]


class HitlReviewConfig(TypedDict):
    action_name: str
    allowed_decisions: list[HitlDecisionType]
    args_schema: NotRequired[dict[str, Any]]


class HitlDecision(TypedDict, total=False):
    type: HitlDecisionType
    message: str
    editedAction: HitlAction


class HitlRequest(TypedDict):
    action_requests: list[HitlActionRequest]
    review_configs: list[HitlReviewConfig]


class HitlResume(TypedDict):
    decisions: list[HitlDecision]
```

`approval_gate`는 최신 `AIMessage`의 tool call을 읽는다. `allowed_tools`와 `interrupt_on`은 `runtime.context`에서 온다. `requires_approval()`는 이 우선순위를 쓴다.

```text
1. interrupt_on[tool_name]
2. allowed_tools
3. ToolSpec.default_allowed
```

승인 대상이 없으면 바로 `tools`로 간다.

```py
return Command(update={"tool_approval_decisions": []}, goto="tools")
```

승인 대상이 있으면 `interrupt()`로 멈춘다.

```py
interrupt_payload: ApprovalInterruptPayload = {
    "action_requests": action_requests,
    "review_configs": review_configs,
}
resume_payload: ApprovalResumePayload = interrupt(interrupt_payload)

return Command(
    update={
        "tool_approval_decisions": resume_payload.get("decisions", []),
    },
    goto="tools",
)
```

`action_requests`와 `review_configs`는 같은 순서로 쌓인다. `decision_for_tool_call()`는 그 순서를 index로 맞춘다.

## call_tools_with_approval

```py
async def call_tools_with_approval(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage] | list[ApprovalDecision]]:
```

이 node는 승인된 tool call만 실행하고, reject/respond는 `ToolMessage`로 합성한다. 실제 실행은 `ToolNode(CHAT_TOOLS, ...)`가 맡는다.

```py
_tool_node = ToolNode(CHAT_TOOLS, handle_tool_errors=_handle_chat_tool_error)
```

```text
latest AIMessage.tool_calls
  -> approve
  -> edit
  -> reject
  -> respond
  -> missing decision
```

처리 방식은 이렇다.

```text
approve
  -> 원래 tool_call 실행

edit
  -> editedAction으로 name/args 교체
  -> 원래 tool_call_id 유지

reject
  -> status="error" ToolMessage 합성

respond
  -> status="success" ToolMessage 합성

missing decision
  -> status="error" ToolMessage 합성
```

실행 가능한 call만 모아서 `_tool_node.ainvoke()`에 다시 넣는다. 반환은 원래 tool_call 순서의 `ToolMessage` 리스트다. 마지막에는 `tool_approval_decisions`를 빈 리스트로 되돌린다.

```py
return {"messages": ordered_messages, "tool_approval_decisions": []}
```

`ChatToolError`만 문자열로 바꾸고, 그 밖의 예외는 그대로 올린다.

## fallback

```py
def get_chat_model(*, model: str, reasoning_effort: ReasoningEffort) -> Any:
    card = get_chat_model_card(model)
    assert_supported_reasoning_effort(card=card, reasoning_effort=reasoning_effort)
    return FallbackChatModel(
        card=card,
        reasoning_effort=reasoning_effort,
        model_factory=create_chat_model_for_route,
    )
```

`FallbackChatModel`은 `card.routes`를 앞에서부터 시도한다.

```py
for index, route in enumerate(self.card.routes):
    try:
        model = self.model_factory(route, self.reasoning_effort)
        if self.bind_tools_args or self.bind_tools_kwargs:
            model = model.bind_tools(...)
        return await model.ainvoke(input, config=config, **kwargs)
    except Exception as error:
        record_chat_error(...)
        if index < len(self.card.routes) - 1:
            await self.sleep(self.card.fallback_retry_delay_seconds)

if first_error is not None:
    raise first_error
```

현재 카드 순서는 이렇다.

```text
gpt-oss:120b
  -> ollama

gemma-4-31b-it
  -> google
  -> openrouter

deepseek-v4-flash
  -> opencode_zen
  -> openrouter
```

`fallback_retry_delay_seconds` 기본값은 `10.0`이다. 모든 route가 실패하면 첫 번째 에러를 다시 던진다.

## 주요 파일

- `src/agent/services/chat/graph.py`
- `src/agent/services/chat/state.py`
- `src/agent/services/chat/context.py`
- `src/agent/services/chat/nodes.py`
- `src/agent/services/chat/routing.py`
- `src/agent/services/chat/approvals/nodes.py`
- `src/agent/services/chat/approvals/messages.py`
- `src/agent/services/chat/approvals/policy.py`
- `src/agent/services/chat/approvals/schemas.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `src/agent/services/chat/models.py`
- `src/agent/services/chat/fallback/runner.py`
- `src/agent/services/chat/model_cards.py`
- `src/agent/services/chat/providers/factory.py`
- `src/agent/services/chat/tools/tool_spec.py`
- `src/agent/services/chat/tools/calculator_tool/calculator_tool.py`
- `langgraph.json`
- `tests/unit_tests/test_chat_runtime_context.py`
- `tests/unit_tests/test_configuration.py`
- `tests/integration_tests/test_graph.py`

## 참고 문서

- LangGraph graphs: https://reference.langchain.com/python/langgraph/graphs/
- LangGraph Runtime: https://reference.langchain.com/python/langgraph/runtime/
- LangGraph add_messages: https://reference.langchain.com/python/langgraph/graph/message/add_messages
- LangGraph use the graph API: https://docs.langchain.com/oss/python/langgraph/use-graph-api
- LangGraph interrupts: https://docs.langchain.com/oss/python/langgraph/interrupts
- LangGraph Agent Server create run stream output: https://docs.langchain.com/langsmith/agent-server-api/thread-runs/create-run-stream-output
