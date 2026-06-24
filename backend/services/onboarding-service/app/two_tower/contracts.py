from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

USER_TOWER_SCORE_FIELDS = (
    "budget_level",
    "stability_level",
    "subway_dependency_level",
    "weekend_preference_level",
    "evening_preference_level",
    "resident_focus_level",
    "worker_focus_level",
    "rent_sensitivity_level",
    "competition_tolerance_level",
)


class AreaUserProfilePayload(BaseModel):
    user_id: str = Field(default="area_user", description="상권 추천용 유저 식별자")
    profile_name: str = Field(default="상권 추천 프로필", description="표시용 프로필 이름")
    budget_level: float = Field(default=0.5, ge=0, le=1, description="예산 허용치")
    stability_level: float = Field(default=0.5, ge=0, le=1, description="안정성 선호도")
    subway_dependency_level: float = Field(default=0.5, ge=0, le=1, description="지하철 의존도")
    weekend_preference_level: float = Field(default=0.5, ge=0, le=1, description="주말 매출 선호도")
    evening_preference_level: float = Field(default=0.5, ge=0, le=1, description="저녁 운영 선호도")
    resident_focus_level: float = Field(default=0.5, ge=0, le=1, description="거주민 수요 집중도")
    worker_focus_level: float = Field(default=0.5, ge=0, le=1, description="직장인 수요 집중도")
    rent_sensitivity_level: float = Field(default=0.5, ge=0, le=1, description="임대료 민감도")
    competition_tolerance_level: float = Field(default=0.5, ge=0, le=1, description="경쟁 허용도")

    @field_validator(*USER_TOWER_SCORE_FIELDS, mode="after")
    @classmethod
    def round_score(cls, value: float) -> float:
        """공유 코드와 캐시 키가 흔들리지 않도록 0.01 단위로 맞춘다."""

        return round(float(value), 2)


class UserProfilePayload(AreaUserProfilePayload):
    preferred_category_code: str = Field(default="CS100001", description="확정된 업종 코드")


class RecommendationItem(BaseModel):
    rank: int
    score: float = Field(ge=0, le=1, description="후보 집합과 무관하게 0~1 범위로 보정한 상권 추천 점수")
    item_id: str
    area_name: str
    service_category_name: str
    area_profile_type: str
    sales_amount: float
    weekend_sales_ratio: float
    evening_sales_ratio: float
    resident_population: int
    worker_population: int
    subway_commercial_trend_score: float
    category_opportunity_score: float
    demand_gap_score: float


class PredictResponse(BaseModel):
    trained_at: str
    model_signature: str
    top_k: int
    user_profile: UserProfilePayload
    recommendations: list[RecommendationItem]
