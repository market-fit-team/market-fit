from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import jwt
from jwt import PyJWK
from jwt.exceptions import InvalidTokenError, PyJWTError
from langgraph_sdk import Auth

from agent.core.config import settings

auth = Auth()

JWKS_CACHE_TTL_SECONDS = 300

_jwks_cache: dict[str, Any] | None = None
_jwks_cache_expires_at = 0.0
_jwks_lock = asyncio.Lock()


class JwtAuthError(Exception):
    """JWT 인증 실패를 내부적으로 구분하기 위한 예외."""


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise JwtAuthError("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise JwtAuthError("Invalid Authorization header")

    return token


async def _fetch_jwks(*, force_refresh: bool = False) -> dict[str, Any]:
    """authentik JWKS를 async로 가져오고 짧게 cache한다."""

    global _jwks_cache, _jwks_cache_expires_at

    now = time.monotonic()

    if not force_refresh and _jwks_cache is not None and now < _jwks_cache_expires_at:
        return _jwks_cache

    async with _jwks_lock:
        # 다른 요청이 lock 대기 중 JWKS를 이미 갱신했을 수 있으므로 한 번 더 확인한다.
        now = time.monotonic()
        if not force_refresh and _jwks_cache is not None and now < _jwks_cache_expires_at:
            return _jwks_cache

        # LangGraph custom auth는 ASGI request path 안에서 실행된다.
        # sync urllib/socket 기반 PyJWKClient를 쓰면 LangGraph dev가 blocking call로 잡아 500을 낼 수 있다.
        # 관련 LangGraph auth 문서:
        # https://docs.langchain.com/langsmith/auth
        #
        # HTTPX 공식 문서도 async web framework 안의 outgoing HTTP request는 AsyncClient 사용을 권장한다.
        # https://www.python-httpx.org/async/
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(5.0),
            headers={"accept": "application/json"},
        ) as client:
            response = await client.get(settings.jwks_url)
            response.raise_for_status()
            jwks = response.json()

        if not isinstance(jwks, dict) or not isinstance(jwks.get("keys"), list):
            raise JwtAuthError("Invalid JWKS response")

        _jwks_cache = jwks
        _jwks_cache_expires_at = now + JWKS_CACHE_TTL_SECONDS

        return jwks


def _find_jwk_by_kid(jwks: dict[str, Any], kid: str | None) -> dict[str, Any]:
    if not kid:
        raise JwtAuthError("JWT header does not contain kid")

    for jwk in jwks.get("keys", []):
        if isinstance(jwk, dict) and jwk.get("kid") == kid:
            return jwk

    raise JwtAuthError("No matching JWK for kid")


async def _get_signing_key(token: str) -> Any:
    # kid를 고르기 위해 header만 먼저 읽는다.
    # 이 단계에서는 payload를 신뢰하지 않고, 최종 신뢰는 jwt.decode 검증 후에만 한다.
    # PyJWT header 읽기 / JWK / decode API 문서:
    # https://pyjwt.readthedocs.io/en/latest/usage.html
    # https://pyjwt.readthedocs.io/en/stable/api.html
    header = jwt.get_unverified_header(token)

    kid = header.get("kid")
    alg = header.get("alg")

    # alg는 토큰 header에서 동적으로 선택하지 않는다.
    # 서버 allowlist인 JWT_ALGORITHM과 일치하는지만 확인한다.
    # PyJWT도 algorithms 값을 attacker-controlled token에서 계산하지 말라고 경고한다.
    # https://pyjwt.readthedocs.io/en/stable/api.html
    if alg != settings.jwt_algorithm:
        raise JwtAuthError(f"Unsupported JWT alg: {alg}")

    jwks = await _fetch_jwks()

    try:
        jwk_dict = _find_jwk_by_kid(jwks, kid)
    except JwtAuthError:
        # authentik key rotation 직후일 수 있으므로 kid miss 때만 한 번 강제 refresh한다.
        jwks = await _fetch_jwks(force_refresh=True)
        jwk_dict = _find_jwk_by_kid(jwks, kid)

    # async로 받아온 JWK dict를 PyJWT의 key object로 변환한다.
    # PyJWK.from_dict API 문서:
    # https://pyjwt.readthedocs.io/en/stable/api.html
    return PyJWK.from_dict(jwk_dict, algorithm=settings.jwt_algorithm).key


async def _decode_token(token: str) -> dict[str, Any]:
    signing_key = await _get_signing_key(token)

    # issuer/audience/algorithm을 모두 고정 검증한다.
    # 현재 프로젝트의 authentik JWT 계약과 맞아야 한다.
    # PyJWT decode API 문서:
    # https://pyjwt.readthedocs.io/en/stable/api.html
    payload = jwt.decode(
        token,
        signing_key,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
        options={"require": ["sub", "iss", "aud", "exp"]},
    )

    if not isinstance(payload, dict):
        raise JwtAuthError("Invalid JWT payload")

    return payload


@auth.authenticate
async def get_current_user(authorization: str | None) -> dict[str, Any]:
    try:
        token = _extract_bearer_token(authorization)
        payload = await _decode_token(token)
    except (JwtAuthError, InvalidTokenError, PyJWTError, httpx.HTTPError, ValueError) as exc:
        # LangGraph custom auth에서는 인증 실패를 500으로 터뜨리지 말고 HTTP error로 변환한다.
        # LangGraph custom auth 문서:
        # https://docs.langchain.com/langsmith/auth
        raise Auth.exceptions.HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        ) from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise Auth.exceptions.HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        )

    # LangGraph는 identity를 user context의 기준으로 사용한다.
    # email/name/claims는 graph configurable 또는 audit/debug 용도로 활용 가능하다.
    # LangGraph auth/user context 문서:
    # https://docs.langchain.com/langsmith/auth
    return {
        "identity": subject,
        "is_authenticated": True,
        "access_token": token,
        "email": payload.get("email"),
        "name": payload.get("name"),
        "claims": payload,
    }


@auth.on
async def owner_only(ctx: Auth.types.AuthContext, value: dict[str, Any]) -> dict[str, str]:
    """Agent Server의 모든 영속 리소스를 인증 사용자 소유로 잠급니다."""

    metadata = value.setdefault("metadata", {})
    metadata["owner"] = ctx.user.identity
    return {"owner": ctx.user.identity}
