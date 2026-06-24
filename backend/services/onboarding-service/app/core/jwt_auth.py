from __future__ import annotations

import base64
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

SHA256_DIGEST_INFO_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")
_JWKS_CACHE_SECONDS = 300
_jwks_cache: dict[str, Any] | None = None
_jwks_cached_at: float = 0.0


class JwtVerificationError(ValueError):
    """JWT 검증에 실패했을 때 공통으로 사용한다."""


@dataclass(slots=True)
class AuthUserContext:
    auth_user_uuid: str
    jwt_payload: dict[str, Any]


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _decode_json_segment(segment: str) -> dict[str, Any]:
    try:
        return json.loads(_base64url_decode(segment).decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise JwtVerificationError("JWT JSON 세그먼트를 해석하지 못했다.") from error


async def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_cached_at
    now = time.time()
    # 인증 서버에 매 요청마다 왕복하지 않도록 짧은 TTL 캐시를 둔다.
    if _jwks_cache is not None and now - _jwks_cached_at < _JWKS_CACHE_SECONDS:
        return _jwks_cache

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(settings.jwks_url)
        response.raise_for_status()
        payload = response.json()

    if not isinstance(payload, dict) or not isinstance(payload.get("keys"), list):
        raise JwtVerificationError("JWKS 응답 형식이 올바르지 않다.")

    _jwks_cache = payload
    _jwks_cached_at = now
    return payload


def _get_kid(header: dict[str, Any]) -> str | None:
    kid = header.get("kid")
    return kid if isinstance(kid, str) and kid else None


def _select_jwk(jwks: dict[str, Any], header: dict[str, Any]) -> dict[str, Any]:
    kid = _get_kid(header)
    keys = [key for key in jwks.get("keys", []) if isinstance(key, dict)]
    if kid is not None:
        for key in keys:
            if key.get("kid") == kid:
                return key
        raise JwtVerificationError("JWT kid에 해당하는 JWK를 찾지 못했다.")
    if len(keys) == 1:
        return keys[0]
    raise JwtVerificationError("JWKS에서 사용할 JWK를 결정하지 못했다.")


def _verify_rs256_signature(signing_input: bytes, signature: bytes, jwk: dict[str, Any]) -> None:
    # 추가 crypto 의존성을 들이지 않기 위해 RS256 PKCS#1 v1.5 검증을 직접 수행한다.
    try:
        modulus = int.from_bytes(_base64url_decode(str(jwk["n"])), "big")
        exponent = int.from_bytes(_base64url_decode(str(jwk["e"])), "big")
    except (KeyError, ValueError) as error:
        raise JwtVerificationError("RSA JWK 파라미터를 해석하지 못했다.") from error

    key_length = (modulus.bit_length() + 7) // 8
    if len(signature) != key_length:
        raise JwtVerificationError("JWT 서명 길이가 RSA 키 길이와 다르다.")

    signature_int = int.from_bytes(signature, "big")
    em = pow(signature_int, exponent, modulus).to_bytes(key_length, "big")
    digest = hashlib.sha256(signing_input).digest()
    expected = SHA256_DIGEST_INFO_PREFIX + digest

    if not em.startswith(b"\x00\x01"):
        raise JwtVerificationError("RSA PKCS#1 서명 패딩이 올바르지 않다.")
    try:
        separator_index = em.index(b"\x00", 2)
    except ValueError as error:
        raise JwtVerificationError("RSA PKCS#1 서명 구분자를 찾지 못했다.") from error

    padding = em[2:separator_index]
    if len(padding) < 8 or any(byte != 0xFF for byte in padding):
        raise JwtVerificationError("RSA PKCS#1 서명 패딩 길이 또는 값이 올바르지 않다.")

    if em[separator_index + 1 :] != expected:
        raise JwtVerificationError("JWT RS256 서명이 일치하지 않는다.")


def _validate_registered_claims(payload: dict[str, Any]) -> None:
    now = int(time.time())

    issuer = payload.get("iss")
    if issuer != settings.jwt_issuer:
        raise JwtVerificationError("JWT issuer가 예상 값과 다르다.")

    audience = payload.get("aud")
    if isinstance(audience, str):
        audience_values = [audience]
    elif isinstance(audience, list):
        audience_values = [value for value in audience if isinstance(value, str)]
    else:
        audience_values = []
    if settings.jwt_audience not in audience_values:
        raise JwtVerificationError("JWT audience가 예상 값과 다르다.")

    exp = payload.get("exp")
    if not isinstance(exp, (int, float)) or int(exp) <= now:
        raise JwtVerificationError("JWT가 만료되었거나 exp claim이 없다.")

    nbf = payload.get("nbf")
    if nbf is not None and (not isinstance(nbf, (int, float)) or int(nbf) > now):
        raise JwtVerificationError("JWT가 아직 유효 시작 시각 전이다.")


def _extract_auth_user_uuid(payload: dict[str, Any]) -> str:
    user_profile = payload.get("user_profile")
    if not isinstance(user_profile, dict):
        raise JwtVerificationError("JWT user_profile claim이 없다.")

    auth_user_uuid = user_profile.get("uuid")
    if not isinstance(auth_user_uuid, str) or not auth_user_uuid:
        raise JwtVerificationError("JWT user_profile.uuid가 없다.")
    return auth_user_uuid


async def verify_bearer_token(token: str) -> AuthUserContext:
    parts = token.split(".")
    if len(parts) != 3:
        raise JwtVerificationError("JWT 형식이 올바르지 않다.")

    header = _decode_json_segment(parts[0])
    payload = _decode_json_segment(parts[1])
    signature = _base64url_decode(parts[2])

    algorithm = header.get("alg")
    if algorithm != settings.jwt_algorithm:
        raise JwtVerificationError("지원하지 않는 JWT alg다.")

    jwks = await _get_jwks()
    jwk = _select_jwk(jwks, header)
    _verify_rs256_signature(f"{parts[0]}.{parts[1]}".encode("utf-8"), signature, jwk)
    _validate_registered_claims(payload)

    return AuthUserContext(
        auth_user_uuid=_extract_auth_user_uuid(payload),
        jwt_payload=payload,
    )


def clear_jwks_cache() -> None:
    global _jwks_cache, _jwks_cached_at
    _jwks_cache = None
    _jwks_cached_at = 0.0
