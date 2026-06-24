from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.models.category_profile.features import build_category_profiles
from app.models.onboarding_category_tower.contracts import CategoryUserProfilePayload

USER_TOWER_FEATURE_SCALE = "zero_to_one_v1"
SYNTHETIC_VARIANTS_PER_CATEGORY = 6

USER_NUMERIC_FIELDS = [
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
]

USER_CONTROL_SPECS = [
    {
        "name": "stability_level",
        "label": "안정성 선호",
        "description": "높을수록 평균 영업기간이 길고 이탈률이 낮은 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "competition_tolerance_level",
        "label": "경쟁 허용도",
        "description": "높을수록 경쟁 밀도가 높은 업종도 감수한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "weekend_preference_level",
        "label": "주말형 선호",
        "description": "높을수록 주말 비중이 큰 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "lunch_preference_level",
        "label": "점심형 선호",
        "description": "높을수록 점심 매출 중심 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "evening_preference_level",
        "label": "저녁형 선호",
        "description": "높을수록 저녁 매출 비중이 큰 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "late_night_preference_level",
        "label": "심야형 선호",
        "description": "높을수록 심야 매출 비중이 큰 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "female_preference_level",
        "label": "여성 고객 선호",
        "description": "0은 남성 중심, 1은 여성 중심 고객 구성을 뜻한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "avg_ticket_preference",
        "label": "객단가 선호",
        "description": "높을수록 건당 매출이 큰 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "traffic_volume_preference",
        "label": "회전율 선호",
        "description": "높을수록 방문 건수가 많은 회전형 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "franchise_affinity_level",
        "label": "프랜차이즈 친화도",
        "description": "높을수록 프랜차이즈 비중이 높은 업종을 허용한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "labor_intensity_tolerance",
        "label": "인력 집약 감수도",
        "description": "높을수록 인력과 운영 밀도가 높은 업종을 감당할 수 있다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "space_efficiency_preference",
        "label": "면적 효율 선호",
        "description": "높을수록 면적당 매출 효율이 높은 업종을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
]

_DEFAULT_SAMPLE_CODES = [
    "CS100001",
    "CS100003",
    "CS100005",
    "CS100010",
    "CS200006",
    "CS300001",
]


def build_user_prototype(category_row: pd.Series) -> dict[str, Any]:
    age_10 = float(category_row["age_10_ratio"])
    age_20 = float(category_row["age_20_ratio"])
    age_30 = float(category_row["age_30_ratio"])
    age_40 = float(category_row["age_40_ratio"])
    age_50_plus = float(category_row["age_50_plus_ratio"])
    age_total = max(age_10 + age_20 + age_30 + age_40 + age_50_plus, 1e-9)

    payload = {
        "user_id": f"category_proto_{str(category_row['service_category_code']).lower()}",
        "profile_name": f"{category_row['service_category_name']} 기준 프로토타입",
        "target_category_code": str(category_row["service_category_code"]),
        "stability_level": float(category_row["stability_prior_score"]),
        "competition_tolerance_level": float(category_row["competition_pressure_score"]),
        "weekend_preference_level": float(category_row["weekend_sales_ratio"]),
        "lunch_preference_level": float(category_row["lunch_sales_ratio"]),
        "evening_preference_level": float(category_row["evening_sales_ratio"]),
        "late_night_preference_level": float(category_row["late_night_sales_ratio"]),
        "target_age_10_level": age_10 / age_total,
        "target_age_20_level": age_20 / age_total,
        "target_age_30_level": age_30 / age_total,
        "target_age_40_level": age_40 / age_total,
        "target_age_50_plus_level": age_50_plus / age_total,
        "female_preference_level": float(category_row["female_sales_ratio"]),
        "avg_ticket_preference": float(category_row["avg_ticket_score"]),
        "traffic_volume_preference": float(category_row["sales_count_score"]),
        "franchise_affinity_level": float(category_row["franchise_ratio"]),
        "labor_intensity_tolerance": float(category_row["labor_intensity_score"]),
        "space_efficiency_preference": float(category_row["space_efficiency_score"]),
    }
    return CategoryUserProfilePayload.model_validate(payload).model_dump()


def sample_user_profiles(data_mode: str = "sample") -> list[dict[str, Any]]:
    categories = build_category_profiles(data_mode=data_mode, trainable_only=True)
    if categories.empty:
        return []
    picked_codes = [code for code in _DEFAULT_SAMPLE_CODES if code in set(categories["service_category_code"])]
    if not picked_codes:
        picked_codes = categories["service_category_code"].head(6).tolist()

    rows: list[dict[str, Any]] = []
    for code in picked_codes:
        matched = categories[categories["service_category_code"] == code]
        if matched.empty:
            continue
        payload = build_user_prototype(matched.iloc[0])
        payload["profile_name"] = f"{matched.iloc[0]['service_category_name']} 선호 프로필"
        rows.append(payload)
    return rows


def _normalize_age_distribution(profile: dict[str, Any]) -> dict[str, Any]:
    age_fields = [
        "target_age_10_level",
        "target_age_20_level",
        "target_age_30_level",
        "target_age_40_level",
        "target_age_50_plus_level",
    ]
    total = sum(float(profile[name]) for name in age_fields)
    if total <= 0:
        for name in age_fields:
            profile[name] = round(1 / len(age_fields), 2)
        return profile
    for name in age_fields:
        profile[name] = round(float(profile[name]) / total, 2)
    return profile


def generate_synthetic_user_profiles(
    data_mode: str = "sample",
    variants_per_category: int = SYNTHETIC_VARIANTS_PER_CATEGORY,
    seed: int = 42,
) -> pd.DataFrame:
    categories = build_category_profiles(data_mode=data_mode, trainable_only=True)
    rng = np.random.default_rng(seed)
    rows: list[dict[str, Any]] = []

    for _, category in categories.iterrows():
        base = build_user_prototype(category)
        for variant_index in range(variants_per_category):
            profile = dict(base)
            profile["user_id"] = f"{str(category['service_category_code']).lower()}_{variant_index:02d}"
            profile["profile_name"] = f"{category['service_category_name']} 유사 사용자 {variant_index + 1}"
            profile["variant_index"] = variant_index
            for field_name in USER_NUMERIC_FIELDS:
                noise_scale = 0.06
                if field_name in {
                    "weekend_preference_level",
                    "lunch_preference_level",
                    "evening_preference_level",
                    "late_night_preference_level",
                }:
                    noise_scale = 0.08
                if field_name in {
                    "avg_ticket_preference",
                    "traffic_volume_preference",
                    "franchise_affinity_level",
                    "labor_intensity_tolerance",
                    "space_efficiency_preference",
                }:
                    noise_scale = 0.1
                jittered = float(base[field_name]) + float(rng.normal(0.0, noise_scale))
                profile[field_name] = round(float(np.clip(jittered, 0, 1)), 2)

            profile = _normalize_age_distribution(profile)
            rows.append(CategoryUserProfilePayload.model_validate(profile).model_dump() | {"variant_index": variant_index})

    return pd.DataFrame(rows)
