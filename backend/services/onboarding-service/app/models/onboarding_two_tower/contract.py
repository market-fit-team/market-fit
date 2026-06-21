from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class UserProfilePayload(BaseModel):
    user_id: str = Field(default="ad_hoc_user", description="프로필 식별자")
    profile_name: str = Field(default="사용자 조정 프로필", description="프론트에 표시할 프로필 이름")
    preferred_category_code: str = Field(default="CS100001", description="선호 업종 코드")
    budget_level: int = Field(default=3, ge=1, le=5, description="예산 허용치")
    stability_level: int = Field(default=3, ge=1, le=5, description="안정성 선호도")
    subway_dependency_level: int = Field(default=3, ge=1, le=5, description="지하철 의존도")
    weekend_preference_level: int = Field(default=3, ge=1, le=5, description="주말 매출 선호도")
    evening_preference_level: int = Field(default=3, ge=1, le=5, description="저녁 운영 선호도")
    resident_focus_level: int = Field(default=3, ge=1, le=5, description="거주민 수요 집중도")
    worker_focus_level: int = Field(default=3, ge=1, le=5, description="직장인 수요 집중도")
    rent_sensitivity_level: int = Field(default=3, ge=1, le=5, description="임대료 민감도")
    competition_tolerance_level: int = Field(default=3, ge=1, le=5, description="경쟁 허용도")


class TrainRequest(BaseModel):
    epochs: int = Field(default=16, ge=1, le=80, description="학습 epoch 수")


class PredictRequest(BaseModel):
    top_k: int = Field(default=5, ge=1, le=10, description="반환할 추천 개수")
    user_profile: UserProfilePayload


class FeatureControl(BaseModel):
    name: str
    label: str
    description: str
    minimum: int = Field(default=1)
    maximum: int = Field(default=5)


class CategoryOption(BaseModel):
    code: str
    label: str


class RecommendationItem(BaseModel):
    rank: int
    score: float
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


class EvaluationResponse(BaseModel):
    model_id: str
    trained_at: str
    epochs: int
    rows: int
    user_count: int
    item_count: int
    embedding_dim: int
    final_loss: float
    hit_rate_at_3: float
    mrr: float
    artifact_paths: dict[str, str]
    user_string_features: list[str]
    user_numeric_features: list[str]
    item_string_features: list[str]
    item_numeric_features: list[str]

    model_config = {
        "json_schema_extra": {
            "example": {
                "model_id": "onboarding_two_tower",
                "trained_at": "2026-06-21T06:17:40.253934+00:00",
                "epochs": 2,
                "rows": 14,
                "user_count": 6,
                "item_count": 5,
                "embedding_dim": 32,
                "final_loss": 11.0756,
                "hit_rate_at_3": 1.0,
                "mrr": 1.0,
                "artifact_paths": {
                    "user_tower": ".artifacts/onboarding_two_tower/user_tower.weights.h5",
                    "item_tower": ".artifacts/onboarding_two_tower/item_tower.weights.h5",
                    "item_embeddings": ".artifacts/onboarding_two_tower/item_embeddings.csv",
                },
                "user_string_features": ["user_id", "preferred_category_code"],
                "user_numeric_features": ["budget_level", "stability_level"],
                "item_string_features": ["item_id", "area_code"],
                "item_numeric_features": ["sales_amount", "weekend_sales_ratio"],
            }
        }
    }


class CatalogResponse(BaseModel):
    model_id: str
    feature_controls: list[FeatureControl]
    category_options: list[CategoryOption]
    sample_profiles: list[UserProfilePayload]
    item_preview: list[dict[str, Any]]
    evaluation: EvaluationResponse


class PredictResponse(BaseModel):
    trained_at: str
    top_k: int
    user_profile: UserProfilePayload
    recommendations: list[RecommendationItem]

    model_config = {
        "json_schema_extra": {
            "example": {
                "trained_at": "2026-06-21T06:17:40.253934+00:00",
                "top_k": 5,
                "user_profile": {
                    "user_id": "demo-user",
                    "profile_name": "수동 조정",
                    "preferred_category_code": "CS100005",
                    "budget_level": 2,
                    "stability_level": 5,
                    "subway_dependency_level": 2,
                    "weekend_preference_level": 3,
                    "evening_preference_level": 2,
                    "resident_focus_level": 5,
                    "worker_focus_level": 1,
                    "rent_sensitivity_level": 5,
                    "competition_tolerance_level": 1,
                },
                "recommendations": [
                    {
                        "rank": 1,
                        "score": -0.400037,
                        "item_id": "11110515:CS100005",
                        "area_name": "청운효자동",
                        "service_category_name": "제과점",
                        "area_profile_type": "residential",
                        "sales_amount": 451701842.0,
                        "weekend_sales_ratio": 0.379,
                        "evening_sales_ratio": 0.2625,
                        "resident_population": 8417,
                        "worker_population": 6095,
                        "subway_commercial_trend_score": 0.4338,
                        "category_opportunity_score": 0.4231,
                        "demand_gap_score": 0.6209,
                    }
                ],
            }
        }
    }
