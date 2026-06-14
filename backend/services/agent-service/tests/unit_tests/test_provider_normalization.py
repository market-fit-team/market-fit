from __future__ import annotations

from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk
from pydantic import SecretStr

from agent.services.chat.providers.normalized import (
    ChatOpenRouter,
    normalize_ai_message,
    normalize_chat_generation,
)


def test_normalize_message_converts_google_gemma_tool_call_shape() -> None:
    message = AIMessage(
        content=[
            {
                "type": "thinking",
                "thinking": "The user wants the result of 19 * 3.",
            }
        ],
        additional_kwargs={
            "function_call": {
                "name": "multiply",
                "arguments": "{\"a\": 19, \"b\": 3}",
            },
            "__gemini_function_call_thought_signatures__": {"2xt8nraq": "sig"},
        },
        response_metadata={
            "finish_reason": "STOP",
            "model_name": "gemma-4-31b-it",
            "model_provider": "google_genai",
        },
        tool_calls=[
            {
                "name": "multiply",
                "args": {"a": 19, "b": 3},
                "id": "2xt8nraq",
                "type": "tool_call",
            }
        ],
        invalid_tool_calls=[],
    )

    normalized = normalize_ai_message(message)

    assert normalized.content == ""
    assert normalized.tool_calls == message.tool_calls
    assert normalized.additional_kwargs == {
        "reasoning_content": "The user wants the result of 19 * 3."
    }
    assert normalized.response_metadata["finish_reason"] == "STOP"
    assert "model_provider" not in normalized.response_metadata
    assert normalized.content_blocks[0] == {
        "type": "reasoning",
        "reasoning": "The user wants the result of 19 * 3.",
    }


def test_chat_openai_reasoning_adapter_keeps_openrouter_reasoning() -> None:
    model = ChatOpenRouter(
        model="openai/gpt-oss-120b",
        api_key=SecretStr("test"),
        base_url="https://openrouter.ai/api/v1",
    )
    result = model._create_chat_result(
        {
            "model": "openai/gpt-oss-120b",
            "choices": [
                {
                    "finish_reason": "tool_calls",
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "reasoning": "Use multiply with a=19 and b=3.",
                        "tool_calls": [
                            {
                                "type": "function",
                                "id": "call_1",
                                "function": {
                                    "name": "multiply",
                                    "arguments": "{\"a\": 19, \"b\": 3}",
                                },
                            }
                        ],
                    },
                }
            ],
            "usage": {
                "prompt_tokens": 1,
                "completion_tokens": 1,
                "total_tokens": 2,
                "completion_tokens_details": {"reasoning_tokens": 1},
            },
        }
    )

    message = result.generations[0].message

    assert isinstance(message, AIMessage)
    assert message.content == ""
    assert message.additional_kwargs["reasoning_content"] == "Use multiply with a=19 and b=3."
    assert "model_provider" not in message.response_metadata
    assert message.content_blocks[0] == {
        "type": "reasoning",
        "reasoning": "Use multiply with a=19 and b=3.",
    }
    assert message.tool_calls == [
        {
            "name": "multiply",
            "args": {"a": 19, "b": 3},
            "id": "call_1",
            "type": "tool_call",
        }
    ]
    assert message.usage_metadata == {
        "input_tokens": 1,
        "output_tokens": 1,
        "total_tokens": 2,
        "input_token_details": {},
        "output_token_details": {"reasoning": 1},
    }


def test_normalize_chat_generation_updates_message_before_stream_event() -> None:
    generation = ChatGeneration(
        message=AIMessage(
            content=[
                {
                    "type": "thinking",
                    "thinking": "I should call the multiply tool.",
                }
            ],
            additional_kwargs={
                "function_call": {
                    "name": "multiply",
                    "arguments": "{\"a\": 19, \"b\": 3}",
                }
            },
            tool_calls=[
                {
                    "name": "multiply",
                    "args": {"a": 19, "b": 3},
                    "id": "call_1",
                    "type": "tool_call",
                }
            ],
            invalid_tool_calls=[],
        )
    )

    normalized = normalize_chat_generation(generation)

    assert normalized.message.content == ""
    assert normalized.message.additional_kwargs == {
        "reasoning_content": "I should call the multiply tool."
    }


def test_normalize_chat_generation_keeps_reasoning_visible_in_chunk_content_blocks() -> None:
    generation = ChatGenerationChunk(
        message=AIMessageChunk(
            content="",
            additional_kwargs={"reasoning_content": "I should call the multiply tool."},
            response_metadata={"model_provider": "openai"},
        )
    )

    normalized = normalize_chat_generation(generation)

    assert normalized.message.additional_kwargs == {
        "reasoning_content": "I should call the multiply tool."
    }
    assert "model_provider" not in normalized.message.response_metadata
    assert normalized.message.content_blocks == [
        {
            "type": "reasoning",
            "reasoning": "I should call the multiply tool.",
        }
    ]
