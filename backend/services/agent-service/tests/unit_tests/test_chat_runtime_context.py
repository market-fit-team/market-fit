import pytest

from agent.services.chat.context import resolve_chat_model_context


def test_resolve_chat_model_context_rejects_missing_context() -> None:
    """graph 실행 중 runtime context 누락을 기본값으로 보정하지 않는다."""

    with pytest.raises(ValueError, match="model is required"):
        resolve_chat_model_context(None)


def test_resolve_chat_model_context_rejects_missing_reasoning_effort() -> None:
    """모델만 있어도 reasoning_effort를 런타임에서 추정하지 않는다."""

    with pytest.raises(ValueError, match="unsupported reasoning effort"):
        resolve_chat_model_context({"model": "deepseek-v4-flash"})


def test_resolve_chat_model_context_keeps_explicit_effort() -> None:
    """완전한 runtime context는 모델 호출용 context로 통과한다."""

    result = resolve_chat_model_context(
        {
            "model": "gpt-oss:120b",
            "reasoning_effort": "low",
            "allowed_tools": ["add"],
            "interrupt_on": {},
        }
    )

    assert result == {
        "model": "gpt-oss:120b",
        "reasoning_effort": "low",
    }
