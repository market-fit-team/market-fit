from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

CATEGORY_USER_SCORE_FIELDS = (
    "stability_level",
    "competition_tolerance_level",
    "weekend_preference_level",
    "lunch_preference_level",
    "evening_preference_level",
    "late_night_preference_level",
    "target_age_10_level",
    "target_age_20_level",
    "target_age_30_level",
    "target_age_40_level",
    "target_age_50_plus_level",
    "female_preference_level",
    "avg_ticket_preference",
    "traffic_volume_preference",
    "franchise_affinity_level",
    "labor_intensity_tolerance",
    "space_efficiency_preference",
)


class CategoryUserProfilePayload(BaseModel):
    user_id: str = Field(default="category_user", description="업종 추천용 유저 식별자")
    profile_name: str = Field(default="업종 추천 프로필", description="표시용 프로필 이름")
    target_category_code: str | None = Field(default=None, description="샘플 학습용 정답 업종 코드")
    stability_level: float = Field(default=0.5, ge=0, le=1, description="안정형 업종 선호도")
    competition_tolerance_level: float = Field(default=0.5, ge=0, le=1, description="경쟁 감수도")
    weekend_preference_level: float = Field(default=0.5, ge=0, le=1, description="주말형 업종 선호도")
    lunch_preference_level: float = Field(default=0.5, ge=0, le=1, description="점심형 업종 선호도")
    evening_preference_level: float = Field(default=0.5, ge=0, le=1, description="저녁형 업종 선호도")
    late_night_preference_level: float = Field(default=0.5, ge=0, le=1, description="심야형 업종 선호도")
    target_age_10_level: float = Field(default=0.0, ge=0, le=1, description="10대 고객 선호 비중")
    target_age_20_level: float = Field(default=0.0, ge=0, le=1, description="20대 고객 선호 비중")
    target_age_30_level: float = Field(default=0.0, ge=0, le=1, description="30대 고객 선호 비중")
    target_age_40_level: float = Field(default=0.0, ge=0, le=1, description="40대 고객 선호 비중")
    target_age_50_plus_level: float = Field(default=0.0, ge=0, le=1, description="50대 이상 고객 선호 비중")
    female_preference_level: float = Field(default=0.5, ge=0, le=1, description="여성 고객 선호도")
    avg_ticket_preference: float = Field(default=0.5, ge=0, le=1, description="고객단가 선호도")
    traffic_volume_preference: float = Field(default=0.5, ge=0, le=1, description="회전율 선호도")
    franchise_affinity_level: float = Field(default=0.5, ge=0, le=1, description="프랜차이즈 친화도")
    labor_intensity_tolerance: float = Field(default=0.5, ge=0, le=1, description="인력 집약도 감수도")
    space_efficiency_preference: float = Field(default=0.5, ge=0, le=1, description="면적 효율형 업종 선호도")

    @field_validator(*CATEGORY_USER_SCORE_FIELDS, mode="after")
    @classmethod
    def round_score(cls, value: float) -> float:
        """저장과 캐시 키가 흔들리지 않도록 0.01 단위로 맞춘다."""

        return round(float(value), 2)


class CategoryRecommendation(BaseModel):
    rank: int
    score: float = Field(ge=0, le=1, description="후보 집합과 무관하게 0~1 범위로 보정한 업종 추천 점수")
    service_category_code: str
    service_category_name: str
    category_group: str
    stability_prior_score: float = Field(ge=0, le=1)
    competition_pressure_score: float = Field(ge=0, le=1)
    weekend_sales_ratio: float = Field(ge=0, le=1)
    evening_sales_ratio: float = Field(ge=0, le=1)
    late_night_sales_ratio: float = Field(ge=0, le=1)
    female_sales_ratio: float = Field(ge=0, le=1)
    franchise_ratio: float = Field(ge=0, le=1)


class CategoryPredictResponse(BaseModel):
    trained_at: str
    model_id: str
    top_k: int
    user_profile: CategoryUserProfilePayload
    recommendations: list[CategoryRecommendation]
