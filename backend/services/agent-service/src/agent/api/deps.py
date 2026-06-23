from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError, PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from agent.db.session import get_db_session
from agent.security.auth import JwtAuthError, _decode_token

bearer_auth = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="bearerAuth",
    description="authentik access token을 Authorization: Bearer <token> 헤더로 전달합니다.",
    auto_error=False,
)


@dataclass(frozen=True, slots=True)
class ApiUser:
    identity: str
    access_token: str
    claims: dict[str, Any]


async def get_api_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_auth)],
) -> ApiUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보가 필요합니다.",
        )
    try:
        payload = await _decode_token(credentials.credentials)
    except (JwtAuthError, InvalidTokenError, PyJWTError, httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 정보입니다.",
        ) from exc
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 정보입니다.",
        )
    return ApiUser(identity=subject, access_token=credentials.credentials, claims=payload)


CurrentApiUser = Annotated[ApiUser, Depends(get_api_user)]
DbSession = Annotated[AsyncSession, Depends(get_db_session)]
