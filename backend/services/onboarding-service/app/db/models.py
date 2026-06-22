from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SurveyDefinitionRecord(Base):
    __tablename__ = "survey_definitions"
    __table_args__ = (
        UniqueConstraint("slug", "version", name="uq_survey_definitions_slug_version"),
        UniqueConstraint("survey_code", name="uq_survey_definitions_survey_code"),
        Index("ix_survey_definitions_is_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    survey_code: Mapped[str] = mapped_column(String(8), nullable=False)
    scoring_version: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    question_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    definition_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )


class SurveyResultRecord(Base):
    __tablename__ = "survey_results"
    __table_args__ = (
        UniqueConstraint("result_code", name="uq_survey_results_result_code"),
        Index("ix_survey_results_answers_hash", "answers_hash"),
        Index("ix_survey_results_area_profile_key", "area_profile_key"),
        Index("ix_survey_results_category_profile_key", "category_profile_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    result_code: Mapped[str] = mapped_column(String(32), nullable=False)
    survey_definition_id: Mapped[int] = mapped_column(ForeignKey("survey_definitions.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="guest")
    profile_name: Mapped[str] = mapped_column(String(128), nullable=False)
    answers_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    answers_hash: Mapped[str] = mapped_column(String(96), nullable=False)
    area_user_profile_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    category_user_profile_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    area_profile_key: Mapped[str] = mapped_column(String(96), nullable=False)
    category_profile_key: Mapped[str] = mapped_column(String(96), nullable=False)
    category_recommendations_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )


class CategoryPredictionCacheRecord(Base):
    __tablename__ = "category_prediction_cache"
    __table_args__ = (
        UniqueConstraint(
            "category_profile_key",
            "model_signature",
            "top_k",
            name="uq_category_prediction_cache_lookup",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_profile_key: Mapped[str] = mapped_column(String(96), nullable=False)
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


class AreaPredictionCacheRecord(Base):
    __tablename__ = "area_prediction_cache"
    __table_args__ = (
        UniqueConstraint(
            "area_profile_key",
            "selected_category_code",
            "model_signature",
            "top_k",
            name="uq_area_prediction_cache_lookup",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    area_profile_key: Mapped[str] = mapped_column(String(96), nullable=False)
    selected_category_code: Mapped[str] = mapped_column(String(32), nullable=False)
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


class UserDefaultProfileRecord(Base):
    __tablename__ = "user_default_profiles"
    __table_args__ = (
        UniqueConstraint("auth_user_uuid", name="uq_user_default_profiles_auth_user_uuid"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_user_uuid: Mapped[str] = mapped_column(String(64), nullable=False)
    survey_result_id: Mapped[int] = mapped_column(ForeignKey("survey_results.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )


class UserSavedResultRecord(Base):
    __tablename__ = "user_saved_results"
    __table_args__ = (
        UniqueConstraint(
            "auth_user_uuid",
            "survey_result_id",
            name="uq_user_saved_results_auth_user_uuid_survey_result_id",
        ),
        Index("ix_user_saved_results_auth_user_uuid", "auth_user_uuid"),
        Index("ix_user_saved_results_survey_result_id", "survey_result_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_user_uuid: Mapped[str] = mapped_column(String(64), nullable=False)
    survey_result_id: Mapped[int] = mapped_column(ForeignKey("survey_results.id"), nullable=False)
    saved_source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual_save")
    saved_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utc_now,
        onupdate=_utc_now,
    )
