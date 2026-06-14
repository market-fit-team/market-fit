from typing import Any, cast

from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGenerationChunk
from langchain_openai import ChatOpenAI

from agent.core.config import settings
from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelRoute
from agent.services.chat.providers.normalized import normalize_chat_generation, normalize_chat_result


class ChatOpenCodeZen(ChatOpenAI):
    """OpenCode Zen용 ChatOpenAI adapter입니다.

    DeepSeek thinking mode는 `delta.reasoning_content`를 `content`와 같은 레벨로
    스트리밍합니다. 참고:
    https://api-docs.deepseek.com/guides/thinking_mode

    LangChain ChatOpenAI는 OpenAI 공식 spec 밖의 third-party 필드(`reasoning_content`
    등)를 보존하지 않는다고 문서화되어 있습니다. 참고:
    https://docs.langchain.com/oss/python/integrations/chat/openai

    같은 문제가 LangChain 이슈로도 보고되어 있습니다:
    https://github.com/langchain-ai/langchain/issues/35516
    """

    def _generate(self, *args: Any, **kwargs: Any) -> Any:
        return normalize_chat_result(super()._generate(*args, **kwargs))

    async def _agenerate(self, *args: Any, **kwargs: Any) -> Any:
        return normalize_chat_result(await super()._agenerate(*args, **kwargs))

    def _get_request_payload(
        self,
        input_: Any,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        payload = super()._get_request_payload(input_, stop=stop, **kwargs)

        # LangChain message 객체 원본을 다시 가져온다.
        original_messages = self._convert_input(input_).to_messages()
        request_messages = payload.get("messages")

        if not isinstance(request_messages, list):
            return payload

        for original_message, request_message in zip(
            original_messages, request_messages, strict=False
        ):
            if not isinstance(original_message, AIMessage):
                continue

            if not isinstance(request_message, dict):
                continue

            if request_message.get("role") != "assistant":
                continue

            reasoning_content = original_message.additional_kwargs.get("reasoning_content")
            if reasoning_content:
                request_message["reasoning_content"] = reasoning_content

        return payload

    def _convert_chunk_to_generation_chunk(
        self,
        chunk: dict,
        default_chunk_class: type,
        base_generation_info: dict | None,
    ) -> ChatGenerationChunk | None:
        generation_chunk = super()._convert_chunk_to_generation_chunk(
            chunk,
            default_chunk_class,
            base_generation_info,
        )
        if generation_chunk is None:
            return None
        return cast(
            ChatGenerationChunk,
            normalize_chat_generation(
                generation_chunk,
                reasoning_content=_extract_reasoning_content(chunk),
            ),
        )


def create_opencode_zen_chat_model(
    *, route: ChatModelRoute, reasoning_effort: ReasoningEffort
) -> Any:
    kwargs: dict[str, Any] = {
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

    return ChatOpenCodeZen(**kwargs)


def _extract_reasoning_content(chunk: dict[str, Any]) -> str | None:
    choices = chunk.get("choices") or chunk.get("chunk", {}).get("choices", [])
    if not choices:
        return None

    choice = choices[0]
    if not isinstance(choice, dict):
        return None

    delta = choice.get("delta") or {}
    if not isinstance(delta, dict):
        return None

    reasoning_content = delta.get("reasoning_content")
    if isinstance(reasoning_content, str) and reasoning_content:
        return reasoning_content
    return None
