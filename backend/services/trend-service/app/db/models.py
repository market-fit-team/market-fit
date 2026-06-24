from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HdongArea(Base):
    """행정동 코드 -> 이름 매핑. 배너 라벨에 쓴다."""

    __tablename__ = "hdong_area"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class TrendScore(Base):
    """배치가 계산한 행정동별 트렌드 예측 결과. run_at(배치 회차) 단위로 이력을 남긴다.

    배치가 쓰고 API는 최신 run_at만 조회한다(쓰기/읽기 분리).
    """

    __tablename__ = "trend_score"

    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    theme: Mapped[str] = mapped_column(String(20), primary_key=True)  # all/male/female/youth/evening
    area_code: Mapped[str] = mapped_column(String(20), primary_key=True)
    area_name: Mapped[str] = mapped_column(String(100), nullable=False)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False)  # 예측 기준 최신 데이터 일자
    pred_growth: Mapped[float] = mapped_column(Float, nullable=False)  # 예측 향후 7일 증감률
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0~100 백분위 점수
    rank: Mapped[int] = mapped_column(Integer, nullable=False)  # 점수 내림차순 순위
    signals: Mapped[dict] = mapped_column(JSONB, nullable=False)  # 피처값(설명 문구 재생성용)
