from langchain_core.messages import AnyMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.runtime import get_runtime

from agent.services.chat.context import (
    ChatRuntimeContext,
    HarnessOverrides,
    resolve_chat_model_context,
)
from agent.services.chat.models import get_chat_model
from agent.services.chat.state import ChatState
from agent.services.chat.system_context import (
    append_system_context_to_latest_human_message,
    build_system_context,
)
from agent.services.chat.system_context_state import prepare_system_context_state_update
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOLS


CHAT_SYSTEM_PROMPT = """
당신은 상권·창업 판단을 돕는 Pickle AI 에이전트입니다. 한국어로, 실제 사용자가 바로 이해할 말로 답합니다.

반드시 지킬 규칙:
- 모든 턴은 사용자에게 보이는 일반 텍스트 답변을 남깁니다. 빈 답변으로 끝내지 않습니다.
- "확인해볼게요", "검색해볼게요" 같은 진행 문장만 말하고 턴을 끝내지 않습니다.
- 요즘, 최신, 최근, 현재, 분위기, 트렌드, 정책, 임대료, 상권 변화가 나오면 최종 답변 전에 검색 도구를 호출합니다.
- 검색 결과가 비어 있거나 메타서치 오류/한계가 보이면 그 한계를 짧게 말하고, 확인된 맥락과 추정을 구분합니다.
- 검색 결과가 1개 이상 있으면 답변 끝에 "근거/출처"를 만들고, 도구 결과에 있는 제목과 URL을 2개 이상 적습니다. URL이 없으면 URL을 지어내지 말고 확인 한계로 적습니다.
- 숫자, 매장명, 기관명, 통계는 검색 결과나 이미 확인된 대화 맥락에 있을 때만 확정적으로 말합니다. 추정이면 "추정"이라고 표시합니다.
- 도구 DSL, DSML, XML 호출문, tool-call JSON을 사용자 답변에 쓰지 않습니다.
- 내부 타입명이나 tool명을 사용자에게 쓰지 않습니다. 금지: commercial_report, search_report, research_report, markdown, code, artifact_create, document_create, web_search, web_fetch.
- 저장 실행은 사용자가 저장/생성/남기기를 명시적으로 요청할 때만 합니다. 어떤 자료로 남길지 묻는 경우에는 도구를 호출하지 않고 설명만 합니다.

보고서 형식:
- 핵심 판단 요약
- 상권/입지 개요
- 고객·수요
- 경쟁·차별화
- 비용·리스크
- 실행 액션
- 근거/출처와 확인 한계

차트 형식:
- 숫자 비교가 있으면 ```chart fenced block을 사용합니다.
- chart block 안에는 JSON만 넣습니다.
- bar/line: {"type":"bar","title":"제목","xKey":"label","series":[{"key":"value","label":"값"}],"data":[{"label":"A","value":1}]}
- pie: {"type":"pie","title":"제목","nameKey":"label","dataKey":"value","data":[{"label":"A","value":1}]}

자료로 남기는 법을 물으면:
- 보고서 전체: "상권 분석 보고서"
- 검색 링크와 요약: "검색 결과 정리"
- 짧은 아이디어/체크리스트: "간단 노트"
""".strip()

DEFAULT_CHAT_TOOL_DESCRIPTIONS = {
    "web_search": (
        "최신 웹 검색 도구입니다. 사용자 질문에 요즘, 최신, 최근, 현재, 분위기, "
        "트렌드, 상권 변화, 임대료, 정책이 있으면 반드시 호출합니다. 검색어는 "
        "지역+업종+기간을 포함합니다. 결과가 있으면 제목과 URL을 최종 답변 근거로 "
        "사용하고, 결과가 비어 있으면 한계를 짧게 말합니다. URL을 지어내지 않습니다."
    ),
    "web_fetch": (
        "검색 결과의 특정 URL 원문이 필요할 때만 호출합니다. 검색 결과에 URL이 없거나 "
        "원문 접근이 실패하면 실패를 과장하지 말고 '원문 확인 한계'로 짧게 설명합니다. "
        "이 도구 이름은 사용자에게 말하지 않습니다."
    ),
    "artifact_create": (
        "사용자가 명시적으로 저장, 생성, 남기기를 요청했을 때만 사용합니다. 사용자에게는 "
        "'상권 분석 보고서', '검색 결과 정리', '간단 노트'라고 말하고 내부 enum/tool명은 "
        "말하지 않습니다. raw_text에는 유효한 마크다운과 chart JSON만 넣습니다."
    ),
    "document_create": (
        "사용자가 여러 채팅에서 다시 볼 장기 보관 자료를 명시적으로 만들어 달라고 할 때만 "
        "사용합니다. 내부 document_type 값은 tool argument로만 사용합니다."
    ),
    "onboarding_get_default_profile": (
        "창업 성향, 취향, 온보딩 프로필을 사용자가 직접 묻거나 system_context에 힌트가 "
        "있을 때만 사용합니다. 일반 상권 트렌드 질문에는 사용하지 않습니다."
    ),
    "onboarding_get_survey_result": (
        "성향 분석 결과나 온보딩 설문 결과를 사용자가 직접 묻거나 system_context에 힌트가 "
        "있을 때만 사용합니다."
    ),
    "onboarding_get_area_recommendations": (
        "성향 결과 기반 지역 추천을 사용자가 요청하거나 system_context에 연결된 성향 결과가 "
        "있을 때만 사용합니다."
    ),
}


def _should_bind_tools(messages: list[AnyMessage]) -> bool:
    """마지막 메시지가 tool 결과이면 다음 model 호출은 최종 답변만 생성하게 합니다."""

    return not messages or not isinstance(messages[-1], ToolMessage)


def _system_prompt_for_harness(overrides: HarnessOverrides) -> str:
    return overrides.get("system_prompt") or CHAT_SYSTEM_PROMPT


def _tools_for_harness(
    tools: list[BaseTool], overrides: HarnessOverrides
) -> list[BaseTool]:
    tool_descriptions = {
        **DEFAULT_CHAT_TOOL_DESCRIPTIONS,
        **(overrides.get("tool_descriptions") or {}),
    }
    if not tool_descriptions:
        return tools

    harness_tools: list[BaseTool] = []
    for tool in tools:
        description = tool_descriptions.get(tool.name)
        if description is None:
            harness_tools.append(tool)
            continue
        harness_tools.append(tool.model_copy(update={"description": description}))
    return harness_tools


async def prepare_system_context_state(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, object]:
    """세션 스냅샷형 system_context 상태를 초기화·갱신합니다."""

    runtime = get_runtime(ChatRuntimeContext)
    return await prepare_system_context_state_update(
        state.get("system_context"),
        state.get("system_context_refresh"),
        config=config,
        context=runtime.context,
        # Runtime.server_info.user는 LangGraph Server가 인증 완료 후 주입하는 사용자다.
        # 도구 실행 전 system_context도 도구와 같은 owner 기준을 써야 한다.
        # https://docs.langchain.com/oss/python/langchain/tools#server-info
        server_user=runtime.server_info.user if runtime.server_info is not None else None,
    )


async def call_chat_model(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage]]:
    """등록된 tool schema를 붙여 chat model을 호출하는 LangGraph node입니다."""

    runtime = get_runtime(ChatRuntimeContext)
    context = resolve_chat_model_context(runtime.context)
    harness_overrides = context["harness_overrides"]
    input_messages = append_system_context_to_latest_human_message(
        list(state["messages"]),
        build_system_context(state.get("system_context")),
    )
    model = get_chat_model(
        model=context["model"],
        reasoning_effort=context["reasoning_effort"],
    )
    # interrupt resume 뒤 tool 결과가 들어오면 model은 사용자에게 결과를 보고해야 합니다.
    # 이 호출에서 도구를 다시 바인딩하면 같은 tool call이 재생성되어 같은 승인 카드가 반복될 수 있습니다.
    # https://docs.langchain.com/oss/python/langgraph/interrupts
    if _should_bind_tools(input_messages):
        model = model.bind_tools(_tools_for_harness(CHAT_TOOLS, harness_overrides))
    response: AnyMessage = await model.ainvoke(
        [SystemMessage(content=_system_prompt_for_harness(harness_overrides)), *input_messages],
        config=config,
    )
    return {"messages": [response]}
