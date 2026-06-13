# HITL and Tools

`src/agent/services/chat/graph.py`는 chat model 호출 뒤 tool call을 approval gate로 보낸다.  
`src/agent/services/chat/toolkits/chat_toolkit.py`는 tool registry와 API metadata를 한 번에 만든다.  
`src/agent/services/chat/approvals/*`는 LangGraph interrupt payload를 `approve / edit / reject / respond` 결정으로 바꾼다.

## `ToolSpec`

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

```py
ToolCategory = Literal[
    "calculator",
    "rag",
    "document",
    "web",
    "file",
    "system",
]
```

`validate_contract()`는 이 계약을 강제한다.

```py
if not _TOOL_NAME_PATTERN.fullmatch(self.name):
    raise ValueError(...)
if self.tool.name != self.name:
    raise ValueError(...)
if not self.description.strip():
    raise ValueError(...)
if not _is_supported_args_schema(self.args_schema):
    raise ValueError(...)
```

현재 registry는 calculator 도구만 가진다.

```py
CHAT_TOOL_SPECS = validate_tool_specs((*CALCULATOR_TOOL_SPECS,))

CHAT_TOOLS = [spec.tool for spec in CHAT_TOOL_SPECS]
CHAT_TOOLS_BY_NAME = {spec.name: spec.tool for spec in CHAT_TOOL_SPECS}
CHAT_TOOL_SPECS_BY_NAME = {spec.name: spec for spec in CHAT_TOOL_SPECS}
```

`list_chat_tools()`는 API client와 정책 UI가 읽는 메타데이터를 반환한다.

```py
class ChatToolInfo(BaseModel):
    name: str
    description: str
    category: str
    default_allowed: bool
    allowed_decisions: list[ChatApprovalDecisionType]

class ListChatToolsResponse(BaseModel):
    tools: list[ChatToolInfo]
```

## calculator

```py
DEFAULT_CALCULATOR_DECISIONS = ["approve", "edit", "reject", "respond"]

@tool
def add(a: float, b: float) -> float:
    return a + b

@tool
def subtract(a: float, b: float) -> float:
    return a - b

@tool
def multiply(a: float, b: float) -> float:
    return a * b

@tool
def divide(a: float, b: float) -> float:
    if b == 0:
        raise InvalidToolInputError("0으로 나눌 수 없습니다.")
    return a / b
```

```py
CALCULATOR_TOOL_SPECS = (
    ToolSpec(tool=add, name="add", description="두 숫자를 더합니다.", category="calculator", args_schema=add.args_schema, default_allowed=True, allowed_decisions=DEFAULT_CALCULATOR_DECISIONS),
    ToolSpec(tool=subtract, name="subtract", description="첫 번째 숫자에서 두 번째 숫자를 뺍니다.", category="calculator", args_schema=subtract.args_schema, default_allowed=True, allowed_decisions=DEFAULT_CALCULATOR_DECISIONS),
    ToolSpec(tool=multiply, name="multiply", description="두 숫자를 곱합니다.", category="calculator", args_schema=multiply.args_schema, default_allowed=True, allowed_decisions=DEFAULT_CALCULATOR_DECISIONS),
    ToolSpec(tool=divide, name="divide", description="첫 번째 숫자를 두 번째 숫자로 나눕니다.", category="calculator", args_schema=divide.args_schema, default_allowed=True, allowed_decisions=DEFAULT_CALCULATOR_DECISIONS),
)
```

`divide`만 입력 오류를 던진다. 나머지는 단순 산술 함수다.

## `ChatRuntimeContext`

```py
class ChatRuntimeContext(TypedDict):
    model: NotRequired[str]
    reasoning_effort: NotRequired[ReasoningEffort]
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
```

`allowed_tools`와 `interrupt_on`은 한 번의 run 동안 유지되는 runtime context다.  
`state["messages"]`는 여기에 들어가지 않는다.

## `allowed_tools`

```py
def requires_approval(
    *,
    tool_name: str,
    allowed_tools: list[str] | None = None,
    interrupt_on: InterruptOnConfig | None = None,
) -> bool:
    if interrupt_on is not None and tool_name in interrupt_on:
        return interrupt_on[tool_name] is not False

    allowed = set(allowed_tools if allowed_tools is not None else default_allowed_tools())
    return tool_name not in allowed
```

`interrupt_on`이 먼저다.  
그 다음이 turn별 allowlist인 `allowed_tools`다.  
`allowed_tools`가 비어 있으면 `ToolSpec.default_allowed`를 쓴다.

`default_allowed_tools()`는 `default_allowed=True`인 spec 이름을 새 list로 돌려준다.  
`default_allowed_decisions()`는 registry 안의 `allowed_decisions`를 순서대로 합친다.

## `interrupt_on`

```py
HitlDecisionType = Literal["approve", "edit", "reject", "respond"]

class HitlDecision(TypedDict, total=False):
    type: HitlDecisionType
    message: str
    editedAction: HitlAction

class HitlActionRequest(TypedDict):
    name: str
    args: dict[str, Any]
    description: str

class HitlReviewConfig(TypedDict):
    action_name: str
    allowed_decisions: list[HitlDecisionType]

InterruptOnConfig: TypeAlias = dict[str, bool | InterruptOnPolicy]
```

```py
def build_review_config(
    *,
    tool_name: str,
    interrupt_on: InterruptOnConfig | None = None,
) -> ApprovalReviewConfig:
    return {
        "action_name": tool_name,
        "allowed_decisions": allowed_decisions_for_tool(
            tool_name=tool_name, interrupt_on=interrupt_on
        ),
    }
```

`interrupt_on[tool_name]`가 `False`면 중단하지 않는다.  
`True`이거나 policy dict면 중단한다.  
policy dict 안의 `allowed_decisions`가 비어 있으면 tool spec의 기본 결정을 쓴다.

## `approval_gate()`

```py
ai_message = get_latest_ai_message_with_tool_calls(list(state["messages"]))
...
for tool_call in ai_message.tool_calls:
    if not requires_approval(...):
        continue

    action_requests.append(
        build_action_request(tool_name=tool_name, tool_args=tool_call["args"])
    )
    review_configs.append(
        build_review_config(tool_name=tool_name, interrupt_on=interrupt_on)
    )

if not action_requests:
    return Command(update={"tool_approval_decisions": []}, goto="tools")

resume_payload = interrupt({
    "action_requests": action_requests,
    "review_configs": review_configs,
})
```

`interrupt()`에 들어가는 payload는 JSON 직렬화 가능해야 한다.  
resume 뒤에는 `{"decisions": [...]}`를 읽어서 `tool_approval_decisions`에 넣는다.

## `approve / edit / reject / respond`

```py
decision = decision_for_tool_call(decisions=decisions, index=approval_decision_index)
...
if decision_type == "approve":
    executable_calls.append(tool_call)
elif decision_type == "edit":
    executable_calls.append(edited_tool_call(tool_call=tool_call, decision=decision or {}))
elif decision_type == "reject":
    synthetic_messages_by_id[tool_call_id] = rejected_tool_message(...)
elif decision_type == "respond":
    synthetic_messages_by_id[tool_call_id] = responded_tool_message(...)
else:
    synthetic_messages_by_id[tool_call_id] = missing_decision_tool_message(tool_call=tool_call)
```

`decision_for_tool_call()`는 `action_requests` 순서와 같은 위치의 결정을 읽는다.  
여러 tool call이 한 번에 멈추면 결정을 같은 순서로 보내야 한다.

```py
def edited_tool_call(*, tool_call: ToolCall, decision: ApprovalDecision) -> ToolCall:
    edited_payload = decision.get("editedAction") or {}
    return {
        "name": edited_payload.get("name", tool_call["name"]),
        "args": edited_payload.get("args", tool_call.get("args", {})),
        "id": str(tool_call["id"]),
        "type": tool_call.get("type", "tool_call"),
    }
```

```py
ToolMessage(content=..., name=tool_call["name"], tool_call_id=str(tool_call["id"]), status="error")
ToolMessage(content=..., name=tool_call["name"], tool_call_id=str(tool_call["id"]), status="success")
```

`reject`는 error ToolMessage를 만든다.  
`respond`는 success ToolMessage를 만든다.  
`edit`는 `editedAction`의 `name`과 `args`를 ToolNode에 넘긴다.  
결정이 비어 있으면 안전한 error ToolMessage가 들어간다.

## `route_after_chat_model()`

```py
route = tools_condition({"messages": state["messages"]})
if route == "tools":
    return "approval_gate"
return "__end__"
```

`chat_model`이 tool call을 만들면 `approval_gate`로 간다.  
tool call이 없으면 graph가 끝난다.

## `graph.py`

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

`call_chat_model()`은 `get_chat_model(...).bind_tools(CHAT_TOOLS)`로 model에 tool schema를 붙인다.  
`call_tools_with_approval()`은 승인된 call만 `ToolNode`에 넘기고, 실행 결과와 synthetic ToolMessage를 원래 순서대로 다시 놓는다.

## 주요 파일

- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `src/agent/services/chat/tools/tool_spec.py`
- `src/agent/services/chat/tools/calculator_tool/calculator_tool.py`
- `src/agent/services/chat/approvals/policy.py`
- `src/agent/services/chat/approvals/nodes.py`
- `src/agent/services/chat/approvals/schemas.py`
- `src/agent/services/chat/approvals/messages.py`
- `src/agent/services/chat/routing.py`
- `src/agent/services/chat/graph.py`
- `src/agent/services/chat/nodes.py`
- `src/agent/services/chat/context.py`
- `src/agent/schemas/chat.py`
- `src/agent/webapp.py`
- `tests/integration_tests/test_graph.py`
- `tests/unit_tests/test_eval_protocol_v2.py`
- `evals/scenarios/calculator-add-tool.yaml`
- `evals/scenarios/calculator-divide-hitl.yaml`

## 참고 문서

- LangChain Tools: https://docs.langchain.com/oss/python/langchain/tools
- LangChain Human-in-the-Loop: https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- LangGraph Interrupts: https://docs.langchain.com/oss/python/langgraph/interrupts
- LangChain Chat model integrations: https://docs.langchain.com/oss/python/integrations/chat
