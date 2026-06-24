from __future__ import annotations

import pytest

from agent.security.auth import JwtAuthError, _extract_auth_user_uuid


def test_extract_auth_user_uuid_uses_user_profile_uuid() -> None:
    """에이전트 서비스 owner 식별자는 OIDC sub가 아니라 user_profile.uuid를 사용한다."""

    payload = {
        "sub": "hashed-provider-subject",
        "user_profile": {"uuid": "00000000-0000-0000-0000-000000000001"},
    }

    assert _extract_auth_user_uuid(payload) == "00000000-0000-0000-0000-000000000001"


def test_extract_auth_user_uuid_rejects_missing_user_profile_uuid() -> None:
    """서비스 간 사용자 FK 계약에 필요한 uuid claim이 없으면 인증 실패로 다룬다."""

    with pytest.raises(JwtAuthError):
        _extract_auth_user_uuid({"sub": "hashed-provider-subject"})
