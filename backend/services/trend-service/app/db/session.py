from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """엔진을 지연 생성한다. sample 모드에선 호출되지 않아 DB 연결이 없어도 된다."""
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(settings.database_url, echo=settings.database_echo, future=True)
        _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)
    return _engine


def session_scope() -> Session:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal()


def prepare_database() -> None:
    """테이블을 만들고, 비어 있으면 .raw 행정동 이름 CSV를 한 번 적재한다(부트스트랩)."""
    from app.trend.ingest import ingest_bootstrap_into_db
    from app.trend.repository import is_hdong_area_empty

    Base.metadata.create_all(get_engine())
    if settings.auto_ingest_sample_on_empty and is_hdong_area_empty():
        ingest_bootstrap_into_db()


def dispose_database() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None
