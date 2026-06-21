from __future__ import annotations

from string import digits, ascii_uppercase
from typing import Any

from app.models.onboarding_two_tower.user_profiles import CATEGORY_OPTIONS, USER_NUMERIC_FIELDS
from app.two_tower.contracts import UserProfilePayload

BASE36_ALPHABET = digits + ascii_uppercase
PROFILE_CODE_PREFIX = "r"
PROFILE_CODE_VERSION = 2
SHARED_PROFILE_NAME = "공유 코드 프로필"
LEGACY_PROFILE_CODE_VERSION = 1
LEGACY_SCORE_LEVELS = 5
PROFILE_SCORE_BUCKETS = 101
PROFILE_GROUP_SIZE = 3
LEGACY_GROUP_WIDTH = 2
PROFILE_GROUP_WIDTH = 4

_CATEGORY_INDEX_BY_CODE = {option["code"]: index for index, option in enumerate(CATEGORY_OPTIONS)}


class InvalidProfileCodeError(ValueError):
    """프로필 공유 코드 형식이 잘못됐을 때 사용한다."""


def _int_to_base36(value: int, width: int = 1) -> str:
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


def _base36_to_int(value: str) -> int:
    try:
        return int(value, 36)
    except ValueError as error:
        raise InvalidProfileCodeError("base36 문자열을 해석하지 못했다.") from error


def _encode_score_group(scores: list[float]) -> str:
    value = 0
    for score in scores:
        quantized = int(round(float(score) * 100))
        if quantized < 0 or quantized >= PROFILE_SCORE_BUCKETS:
            raise InvalidProfileCodeError("점수는 0에서 1 사이여야 한다.")
        value = (value * PROFILE_SCORE_BUCKETS) + quantized
    return _int_to_base36(value, width=PROFILE_GROUP_WIDTH)


def _decode_score_group(chunk: str) -> list[float]:
    value = _base36_to_int(chunk)
    if value < 0 or value >= PROFILE_SCORE_BUCKETS**PROFILE_GROUP_SIZE:
        raise InvalidProfileCodeError("점수 그룹 범위를 벗어난 코드다.")
    decoded = [0.0, 0.0, 0.0]
    current = value
    for index in range(PROFILE_GROUP_SIZE - 1, -1, -1):
        current, remainder = divmod(current, PROFILE_SCORE_BUCKETS)
        decoded[index] = round(remainder / 100.0, 2)
    return decoded


def _decode_legacy_score_group(chunk: str) -> list[float]:
    value = _base36_to_int(chunk)
    if value < 0 or value >= LEGACY_SCORE_LEVELS**PROFILE_GROUP_SIZE:
        raise InvalidProfileCodeError("레거시 점수 그룹 범위를 벗어난 코드다.")
    decoded = [0.0, 0.0, 0.0]
    current = value
    for index in range(PROFILE_GROUP_SIZE - 1, -1, -1):
        current, remainder = divmod(current, LEGACY_SCORE_LEVELS)
        decoded[index] = round(remainder / (LEGACY_SCORE_LEVELS - 1), 2)
    return decoded


def build_share_path(profile_code: str) -> str:
    return f"/example/two-tower/{profile_code}"


def encode_profile_code(profile: UserProfilePayload | dict[str, Any]) -> str:
    payload = UserProfilePayload.model_validate(profile).model_dump()
    category_index = _CATEGORY_INDEX_BY_CODE.get(payload["preferred_category_code"])
    if category_index is None:
        raise InvalidProfileCodeError("등록되지 않은 업종 코드는 공유 코드로 변환할 수 없다.")

    chunks = []
    for offset in range(0, len(USER_NUMERIC_FIELDS), PROFILE_GROUP_SIZE):
        # 0~1 실수 점수는 0.01 단위로 양자화한 뒤 3개씩 묶어 4글자 base36로 줄인다.
        field_names = USER_NUMERIC_FIELDS[offset : offset + PROFILE_GROUP_SIZE]
        chunks.append(_encode_score_group([float(payload[name]) for name in field_names]))

    return (
        f"{PROFILE_CODE_PREFIX}"
        f"{_int_to_base36(PROFILE_CODE_VERSION)}"
        f"{_int_to_base36(category_index)}"
        f"{''.join(chunks)}"
    )


def decode_profile_code(profile_code: str) -> dict[str, Any]:
    normalized = profile_code.strip().upper()
    if len(normalized) < 3 or not normalized.startswith(PROFILE_CODE_PREFIX.upper()):
        raise InvalidProfileCodeError("공유 코드 길이 또는 접두사가 올바르지 않다.")

    version = _base36_to_int(normalized[1])
    category_index = _base36_to_int(normalized[2])
    if category_index >= len(CATEGORY_OPTIONS):
        raise InvalidProfileCodeError("업종 인덱스가 범위를 벗어났다.")

    decoded_scores: list[float] = []
    if version == LEGACY_PROFILE_CODE_VERSION:
        if len(normalized) != 9:
            raise InvalidProfileCodeError("레거시 공유 코드 길이가 올바르지 않다.")
        for start in range(3, 9, LEGACY_GROUP_WIDTH):
            decoded_scores.extend(_decode_legacy_score_group(normalized[start : start + LEGACY_GROUP_WIDTH]))
    elif version == PROFILE_CODE_VERSION:
        if len(normalized) != 15:
            raise InvalidProfileCodeError("공유 코드 길이가 올바르지 않다.")
        for start in range(3, 15, PROFILE_GROUP_WIDTH):
            decoded_scores.extend(_decode_score_group(normalized[start : start + PROFILE_GROUP_WIDTH]))
    else:
        raise InvalidProfileCodeError("지원하지 않는 공유 코드 버전이다.")

    category_code = CATEGORY_OPTIONS[category_index]["code"]
    payload: dict[str, Any] = {
        "user_id": f"shared_{normalized.lower()}",
        "profile_name": SHARED_PROFILE_NAME,
        "preferred_category_code": category_code,
    }
    for field_name, value in zip(USER_NUMERIC_FIELDS, decoded_scores, strict=True):
        payload[field_name] = value
    return UserProfilePayload.model_validate(payload).model_dump()
