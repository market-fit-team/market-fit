from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, DateTime, Float, Index, Integer, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserTowerProfileRecord(Base):
    __tablename__ = "user_tower_profiles"
    __table_args__ = (
        UniqueConstraint("auth_user_uuid", name="uq_user_tower_profiles_auth_user_uuid"),
        Index("ix_user_tower_profiles_profile_code", "profile_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_user_uuid: Mapped[str] = mapped_column(String(64), nullable=False)
    profile_code: Mapped[str] = mapped_column(String(32), nullable=False)
    schema_version: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    profile_name: Mapped[str] = mapped_column(String(128), nullable=False)
    preferred_category_code: Mapped[str] = mapped_column(String(32), nullable=False)
    budget_level: Mapped[float] = mapped_column(Float, nullable=False)
    stability_level: Mapped[float] = mapped_column(Float, nullable=False)
    subway_dependency_level: Mapped[float] = mapped_column(Float, nullable=False)
    weekend_preference_level: Mapped[float] = mapped_column(Float, nullable=False)
    evening_preference_level: Mapped[float] = mapped_column(Float, nullable=False)
    resident_focus_level: Mapped[float] = mapped_column(Float, nullable=False)
    worker_focus_level: Mapped[float] = mapped_column(Float, nullable=False)
    rent_sensitivity_level: Mapped[float] = mapped_column(Float, nullable=False)
    competition_tolerance_level: Mapped[float] = mapped_column(Float, nullable=False)
    raw_answers: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )


class UserTowerPredictionCacheRecord(Base):
    __tablename__ = "user_tower_prediction_cache"
    __table_args__ = (
        UniqueConstraint(
            "profile_code",
            "model_signature",
            "top_k",
            name="uq_user_tower_prediction_cache_lookup",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_code: Mapped[str] = mapped_column(String(32), nullable=False)
    model_signature: Mapped[str] = mapped_column(String(128), nullable=False)
    top_k: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    prediction_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )
