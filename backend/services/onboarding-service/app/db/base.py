from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """서비스 전역 SQLAlchemy 선언 베이스."""
