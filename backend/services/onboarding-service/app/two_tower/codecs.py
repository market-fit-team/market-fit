from __future__ import annotations

import secrets
from string import ascii_lowercase, digits

BASE36_ALPHABET = digits + ascii_lowercase
RESULT_CODE_PREFIX = "r"
RESULT_CODE_BODY_WIDTH = 15
RESULT_CODE_LENGTH = len(RESULT_CODE_PREFIX) + RESULT_CODE_BODY_WIDTH


class InvalidResultCodeError(ValueError):
    """결과 코드 형식이 잘못됐을 때 사용한다."""


def _int_to_base36(value: int, *, width: int) -> str:
    if value < 0:
        raise ValueError("base36 변환 대상은 0 이상이어야 한다.")

    encoded = ""
    current = value
    if current == 0:
        encoded = "0"
    while current > 0:
        current, remainder = divmod(current, 36)
        encoded = BASE36_ALPHABET[remainder] + encoded
    return encoded.rjust(width, "0")


def generate_result_code() -> str:
    random_value = secrets.randbelow(36**RESULT_CODE_BODY_WIDTH)
    return f"{RESULT_CODE_PREFIX}{_int_to_base36(random_value, width=RESULT_CODE_BODY_WIDTH)}"


def normalize_result_code(result_code: str) -> str:
    normalized = result_code.strip().lower()
    if len(normalized) != RESULT_CODE_LENGTH or not normalized.startswith(RESULT_CODE_PREFIX):
        raise InvalidResultCodeError("결과 코드 길이 또는 접두사가 올바르지 않다.")

    body = normalized[len(RESULT_CODE_PREFIX) :]
    if not body or any(char not in BASE36_ALPHABET for char in body):
        raise InvalidResultCodeError("결과 코드 본문은 소문자 base36이어야 한다.")
    return normalized


def build_share_path(result_code: str) -> str:
    return f"/onboarding/result/{normalize_result_code(result_code)}"
