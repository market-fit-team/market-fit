"""LangGraph stream/state 이벤트로 나가기 전에 provider 메시지 shape를 맞춘다.

모델 전체를 감싸지 않는다. provider subclass가 LangChain 변환 hook에서만 이 helper를
호출한다. 그래야 streaming chunk와 최종 응답이 모두 `gpt-oss:120b -> ollama` 기준
shape를 쓴다.

맞추는 필드:
- 추론 텍스트: `additional_kwargs.reasoning_content`
- 표준 block: `AIMessage.content_blocks`의 reasoning block
- tool call 응답 content: 빈 문자열
- 파싱된 tool call: `AIMessage.tool_calls`

확인한 provider shape:
- Google Gemma: `content=[{"type": "thinking"}]` thinking block
- Google Gemma: `tool_calls`와 중복되는 `additional_kwargs.function_call`
- OpenRouter gpt-oss/deepseek/gemma: raw `message.reasoning` 또는
  `delta.reasoning`

주의:
- LangChain은 `response_metadata.model_provider`가 있으면 provider translator를 먼저 탄다.
- `google_genai`, `openai` translator는 `additional_kwargs.reasoning_content`를 보지 않는다.
- 그래서 이 adapter를 지난 메시지는 `model_provider`를 제거해 Ollama와 같은
  best-effort `content_blocks` 경로를 타게 한다.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, cast

from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_openai import ChatOpenAI


class ChatOpenRouter(ChatOpenAI):
    def _generate(self, *args: Any, **kwargs: Any) -> ChatResult:
        return normalize_chat_result(super()._generate(*args, **kwargs))

    async def _agenerate(self, *args: Any, **kwargs: Any) -> ChatResult:
        return normalize_chat_result(await super()._agenerate(*args, **kwargs))

    def _create_chat_result(
        self,
        response: Any,
        generation_info: dict | None = None,
    ) -> ChatResult:
        result = super()._create_chat_result(response, generation_info=generation_info)
        response_dict = response if isinstance(response, dict) else response.model_dump()
        choices = response_dict.get("choices")
        if not isinstance(choices, list):
            return result

        generations = list(result.generations)
        for index, (generation, choice) in enumerate(
            zip(generations, choices, strict=False)
        ):
            raw_message = choice.get("message") if isinstance(choice, Mapping) else None
            generations[index] = normalize_chat_generation(
                generation,
                reasoning_content=_extract_reasoning(raw_message),
            )
        return result.model_copy(update={"generations": generations})

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
                reasoning_content=_extract_reasoning(_first_delta(chunk)),
            ),
        )


def normalize_chat_generation(
    generation: ChatGeneration | ChatGenerationChunk,
    *,
    reasoning_content: str | None = None,
) -> ChatGeneration | ChatGenerationChunk:
    message = normalize_ai_message(generation.message, reasoning_content=reasoning_content)
    if message is generation.message:
        return generation
    return generation.model_copy(update={"message": message})


def normalize_chat_result(result: ChatResult) -> ChatResult:
    return result.model_copy(
        update={
            "generations": [
                normalize_chat_generation(generation)
                for generation in result.generations
            ]
        }
    )


def normalize_ai_message(
    message: Any,
    *,
    reasoning_content: str | None = None,
) -> Any:
    if not isinstance(message, AIMessage):
        return message

    additional_kwargs = dict(message.additional_kwargs)
    reasoning = reasoning_content or _extract_reasoning_from_message(message, additional_kwargs)
    if reasoning:
        additional_kwargs["reasoning_content"] = reasoning

    if message.tool_calls:
        additional_kwargs.pop("function_call", None)
        additional_kwargs.pop("__gemini_function_call_thought_signatures__", None)

    content = _normalize_content(message)
    response_metadata = _normalize_response_metadata(message)
    if (
        content == message.content
        and additional_kwargs == message.additional_kwargs
        and response_metadata == message.response_metadata
    ):
        return message

    return message.model_copy(
        update={
            "content": content,
            "additional_kwargs": additional_kwargs,
            "response_metadata": response_metadata,
        }
    )


def _normalize_content(message: AIMessage) -> str:
    if isinstance(message.content, str):
        return message.content
    if message.content is None:
        return ""
    if not isinstance(message.content, list):
        return str(message.content)
    if message.tool_calls or _thinking_text(message.content):
        return ""

    text_parts = [
        block.get("text")
        for block in message.content
        if isinstance(block, dict) and block.get("type") == "text"
    ]
    return "".join(text for text in text_parts if isinstance(text, str))


def _extract_reasoning_from_message(
    message: AIMessage | AIMessageChunk,
    additional_kwargs: Mapping[str, Any],
) -> str | None:
    existing = additional_kwargs.get("reasoning_content")
    if isinstance(existing, str) and existing:
        return existing

    reasoning = additional_kwargs.get("reasoning")
    if isinstance(reasoning, str) and reasoning:
        return reasoning

    return _thinking_text(message.content)


def _normalize_response_metadata(message: AIMessage | AIMessageChunk) -> dict[str, Any]:
    response_metadata = dict(message.response_metadata)
    response_metadata.pop("model_provider", None)
    return response_metadata


def _thinking_text(content: Any) -> str | None:
    if not isinstance(content, list):
        return None

    parts = [
        block.get("thinking")
        for block in content
        if isinstance(block, dict) and block.get("type") == "thinking"
    ]
    text_parts = [part for part in parts if isinstance(part, str) and part]
    return "\n".join(text_parts) if text_parts else None


def _extract_reasoning(raw_message: Mapping[str, Any] | None) -> str | None:
    if raw_message is None:
        return None

    reasoning = raw_message.get("reasoning")
    if isinstance(reasoning, str) and reasoning:
        return reasoning

    details = raw_message.get("reasoning_details")
    if not isinstance(details, list):
        return None

    parts = [detail.get("text") for detail in details if isinstance(detail, Mapping)]
    text_parts = [part for part in parts if isinstance(part, str) and part]
    return "\n".join(text_parts) if text_parts else None


def _first_delta(chunk: Mapping[str, Any]) -> Mapping[str, Any] | None:
    choices = chunk.get("choices") or chunk.get("chunk", {}).get("choices", [])
    if not choices:
        return None

    choice = choices[0]
    if not isinstance(choice, Mapping):
        return None

    delta = choice.get("delta")
    return cast("Mapping[str, Any] | None", delta if isinstance(delta, Mapping) else None)
