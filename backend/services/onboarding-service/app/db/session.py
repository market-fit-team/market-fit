from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db import models as _models

_ENGINE: AsyncEngine | None = None
_SESSION_FACTORY: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _ENGINE
    if _ENGINE is None:
        connect_args: dict[str, object] = {}
        if settings.database_url.startswith("sqlite+aiosqlite"):
            connect_args["check_same_thread"] = False
        _ENGINE = create_async_engine(
            settings.database_url,
            echo=settings.database_echo,
            pool_pre_ping=not settings.database_url.startswith("sqlite"),
            connect_args=connect_args,
        )
    return _ENGINE


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _SESSION_FACTORY = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
        )
    return _SESSION_FACTORY


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session


async def prepare_database() -> None:
    if not settings.auto_create_schema:
        return
    async with get_engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with get_session_factory()() as session:
        from app.surveys.service import seed_active_survey_definition

        await seed_active_survey_definition(session)
        await session.commit()


async def dispose_database() -> None:
    global _ENGINE, _SESSION_FACTORY
    if _ENGINE is not None:
        await _ENGINE.dispose()
    _ENGINE = None
    _SESSION_FACTORY = None
