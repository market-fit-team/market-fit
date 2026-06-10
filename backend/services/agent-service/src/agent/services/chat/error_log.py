import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


CHAT_ERROR_LOG_PATH = Path(__file__).resolve().parents[3] / ".logs" / "chat-errors.jsonl"


def record_chat_error(error: Exception, *, context: dict[str, Any] | None = None) -> None:
    """Chat 오류를 로컬 JSONL 파일에 기록합니다.

    나중에 DB 저장으로 바꾸기 쉽도록 파일 기록 세부사항은 이 함수 안에만 둡니다.
    """

    try:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "error_type": error.__class__.__name__,
            "message": _redact_secret_text(str(error)),
            "context": _redact_secrets(context or {}),
        }
        CHAT_ERROR_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CHAT_ERROR_LOG_PATH.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False, sort_keys=True) + "\n")
    except Exception:
        return


def _redact_secrets(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): "<redacted>" if _looks_secret_key(str(key)) else _redact_secrets(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_secrets(item) for item in value]
    if isinstance(value, tuple):
        return [_redact_secrets(item) for item in value]
    if isinstance(value, str):
        return _redact_secret_text(value)
    return value


def _looks_secret_key(key: str) -> bool:
    lowered = key.lower()
    return any(token in lowered for token in ("api_key", "apikey", "secret", "token", "password", "authorization"))


def _redact_secret_text(text: str) -> str:
    text = re.sub(r"sk-[A-Za-z0-9_-]+", "<redacted>", text)
    text = re.sub(r"AIza[0-9A-Za-z_-]+", "<redacted>", text)
    return text
