from __future__ import annotations

from functools import lru_cache
from typing import Any

import jwt
from jwt import InvalidTokenError, PyJWKClient
from langgraph_sdk import Auth

from agent.core.config import settings


auth = Auth()


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(settings.jwks_url)


def _unauthorized(detail: str) -> None:
    raise Auth.exceptions.HTTPException(status_code=401, detail=detail)


@auth.authenticate
async def get_current_user(authorization: str | None) -> Auth.types.MinimalUserDict:
    """Verify the Better Auth RS256 JWT passed by the Next.js BFF.

    Browser requests should go through /api/proxy/agent. The proxy discards any
    client-provided Authorization header and replaces it with a JWT from
    /api/auth/token, so this function only trusts that BFF-issued Bearer token.
    """

    if not authorization:
        _unauthorized("Missing Authorization header")

    try:
        scheme, token = authorization.split(" ", 1)
    except ValueError:
        _unauthorized("Invalid Authorization header")

    if scheme.lower() != "bearer" or not token.strip():
        _unauthorized("Authorization header must be Bearer token")

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token).key
        payload: dict[str, Any] = jwt.decode(
            token,
            signing_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["sub", "iss", "aud", "exp"]},
        )
    except InvalidTokenError as error:
        _unauthorized(f"Invalid JWT: {error}")

    subject = str(payload.get("sub") or "")
    if not subject:
        _unauthorized("JWT sub is required")

    return {
        "identity": subject,
    }
