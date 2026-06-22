from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.jwt_auth import AuthUserContext, JwtVerificationError, verify_bearer_token
from app.db.session import get_db_session

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_auth_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUserContext:
    if credentials is None or credentials.scheme != "Bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer 토큰이 필요하다.",
        )

    try:
        return await verify_bearer_token(credentials.credentials)
    except JwtVerificationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error


async def get_optional_auth_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUserContext | None:
    if credentials is None:
        return None
    if credentials.scheme != "Bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer 토큰 형식이 올바르지 않다.",
        )

    try:
        return await verify_bearer_token(credentials.credentials)
    except JwtVerificationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error


__all__ = ["get_current_auth_user", "get_optional_auth_user", "get_db_session"]
