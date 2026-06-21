from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

SERVICE_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_USER_PROFILES = SERVICE_ROOT / ".sample" / "user_tower_profiles.sample.jsonl"

DEFAULT_USER_PROFILES: list[dict[str, Any]] = [
    {
        "user_id": "profile_urban_evening_growth",
        "profile_name": "역세권 저녁 매출 성장형",
        "preferred_category_code": "CS100004",
        "budget_level": 4,
        "stability_level": 2,
        "subway_dependency_level": 5,
        "weekend_preference_level": 4,
        "evening_preference_level": 5,
        "resident_focus_level": 2,
        "worker_focus_level": 5,
        "rent_sensitivity_level": 2,
        "competition_tolerance_level": 4,
    },
    {
        "user_id": "profile_safe_residential_bakery",
        "profile_name": "주거 밀착 안정형 제과",
        "preferred_category_code": "CS100005",
        "budget_level": 2,
        "stability_level": 5,
        "subway_dependency_level": 1,
        "weekend_preference_level": 3,
        "evening_preference_level": 2,
        "resident_focus_level": 5,
        "worker_focus_level": 1,
        "rent_sensitivity_level": 5,
        "competition_tolerance_level": 1,
    },
    {
        "user_id": "profile_mixed_family_korean",
        "profile_name": "가족형 한식 균형 운영",
        "preferred_category_code": "CS100001",
        "budget_level": 3,
        "stability_level": 4,
        "subway_dependency_level": 2,
        "weekend_preference_level": 4,
        "evening_preference_level": 3,
        "resident_focus_level": 5,
        "worker_focus_level": 2,
        "rent_sensitivity_level": 4,
        "competition_tolerance_level": 2,
    },
    {
        "user_id": "profile_lunch_office_japanese",
        "profile_name": "오피스 점심 일식형",
        "preferred_category_code": "CS100003",
        "budget_level": 3,
        "stability_level": 3,
        "subway_dependency_level": 5,
        "weekend_preference_level": 2,
        "evening_preference_level": 2,
        "resident_focus_level": 1,
        "worker_focus_level": 5,
        "rent_sensitivity_level": 3,
        "competition_tolerance_level": 3,
    },
    {
        "user_id": "profile_night_chicken_aggressive",
        "profile_name": "야간 외식 공격형",
        "preferred_category_code": "CS100007",
        "budget_level": 4,
        "stability_level": 1,
        "subway_dependency_level": 4,
        "weekend_preference_level": 5,
        "evening_preference_level": 5,
        "resident_focus_level": 3,
        "worker_focus_level": 4,
        "rent_sensitivity_level": 1,
        "competition_tolerance_level": 5,
    },
    {
        "user_id": "profile_small_safe_general",
        "profile_name": "소규모 안정형 일반 외식",
        "preferred_category_code": "CS100001",
        "budget_level": 1,
        "stability_level": 5,
        "subway_dependency_level": 1,
        "weekend_preference_level": 2,
        "evening_preference_level": 2,
        "resident_focus_level": 4,
        "worker_focus_level": 1,
        "rent_sensitivity_level": 5,
        "competition_tolerance_level": 1,
    },
]

USER_NUMERIC_FIELDS = [
    "budget_level",
    "stability_level",
    "subway_dependency_level",
    "weekend_preference_level",
    "evening_preference_level",
    "resident_focus_level",
    "worker_focus_level",
    "rent_sensitivity_level",
    "competition_tolerance_level",
]

USER_CONTROL_SPECS = [
    {
        "name": "budget_level",
        "label": "예산 허용치",
        "description": "초기 투자 허용 범위를 높이면 고비용 업종이 더 쉽게 올라온다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "stability_level",
        "label": "안정성 선호",
        "description": "높을수록 급격한 성장보다 안정적인 후보를 선호한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "subway_dependency_level",
        "label": "지하철 의존도",
        "description": "높을수록 역세권 유입 신호를 강하게 반영한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "weekend_preference_level",
        "label": "주말 매출 선호",
        "description": "높을수록 주말 비중이 큰 상권을 선호한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "evening_preference_level",
        "label": "저녁 운영 선호",
        "description": "높을수록 저녁 매출 비중이 큰 후보를 선호한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "resident_focus_level",
        "label": "거주민 집중도",
        "description": "높을수록 생활밀착형 거주 수요를 중시한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "worker_focus_level",
        "label": "직장인 집중도",
        "description": "높을수록 오피스 수요가 강한 후보를 선호한다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "rent_sensitivity_level",
        "label": "임대료 민감도",
        "description": "높을수록 높은 비용 후보에 더 큰 페널티를 준다.",
        "minimum": 1,
        "maximum": 5,
    },
    {
        "name": "competition_tolerance_level",
        "label": "경쟁 허용도",
        "description": "높을수록 경쟁이 있는 상권도 감수한다.",
        "minimum": 1,
        "maximum": 5,
    },
]


def ensure_sample_user_profiles(path: Path = SAMPLE_USER_PROFILES) -> Path:
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = "\n".join(json.dumps(row, ensure_ascii=False) for row in DEFAULT_USER_PROFILES)
    path.write_text(payload + "\n", encoding="utf-8")
    return path


def load_user_profiles(path: Path = SAMPLE_USER_PROFILES) -> pd.DataFrame:
    source = ensure_sample_user_profiles(path)
    rows: list[dict[str, Any]] = []
    for line in source.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return pd.DataFrame(rows)


def budget_limit_from_level(level: int) -> float:
    return {
        1: 50.0,
        2: 100.0,
        3: 150.0,
        4: 220.0,
        5: 320.0,
    }.get(int(level), 150.0)


def score_user_item(user: pd.Series, item: pd.Series) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if str(user["preferred_category_code"]) == str(item["service_category_code"]):
        score += 3.0
        reasons.append("preferred_category_match")

    budget_limit = budget_limit_from_level(int(user["budget_level"]))
    startup_cost = float(item["startup_cost_million_krw_proxy"])
    if startup_cost <= budget_limit:
        score += 1.8
        reasons.append("budget_fit")
    else:
        score -= 2.4
        reasons.append("budget_over")

    subway_weight = float(user["subway_dependency_level"]) / 5.0
    score += 1.8 * subway_weight * float(item["subway_commercial_trend_score"])
    if subway_weight >= 0.8:
        reasons.append("subway_match")

    weekend_weight = float(user["weekend_preference_level"]) / 5.0
    evening_weight = float(user["evening_preference_level"]) / 5.0
    score += 1.0 * weekend_weight * float(item["weekend_sales_ratio"])
    score += 1.2 * evening_weight * float(item["evening_sales_ratio"])

    resident_total = float(item["resident_population"])
    worker_total = float(item["worker_population"])
    population_total = max(resident_total + worker_total, 1.0)
    resident_share = resident_total / population_total
    worker_share = worker_total / population_total

    score += (float(user["resident_focus_level"]) / 5.0) * 1.1 * resident_share
    score += (float(user["worker_focus_level"]) / 5.0) * 1.1 * worker_share

    stability_weight = float(user["stability_level"]) / 5.0
    growth_weight = 1.0 - stability_weight
    score += 1.0 * stability_weight * (1.0 - float(item["sales_momentum_down_probability"]))
    score -= 0.8 * stability_weight * float(item["demand_gap_score"])
    score += 1.2 * growth_weight * float(item["sales_momentum_up_probability"])
    score += 0.7 * growth_weight * float(item["category_opportunity_score"])

    rent_weight = float(user["rent_sensitivity_level"]) / 5.0
    apartment_penalty = float(item["apartment_average_price_normalized"])
    score -= 0.8 * rent_weight * apartment_penalty
    if rent_weight >= 0.8 and startup_cost > budget_limit * 0.85:
        score -= 1.1
        reasons.append("rent_pressure")

    competition_weight = float(user["competition_tolerance_level"]) / 5.0
    score += 0.5 * competition_weight * float(item["category_opportunity_score"])
    score -= 0.4 * (1.0 - competition_weight) * float(item["demand_gap_score"])

    area_profile_type = str(item["area_profile_type"])
    if worker_share >= resident_share and float(user["worker_focus_level"]) >= 4 and area_profile_type == "office":
        score += 0.5
        reasons.append("office_profile_match")
    if resident_share > worker_share and float(user["resident_focus_level"]) >= 4 and area_profile_type == "residential":
        score += 0.5
        reasons.append("residential_profile_match")

    return score, reasons


def build_user_item_labels(users: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for _, user in users.iterrows():
        scored: list[dict[str, Any]] = []
        for _, item in items.iterrows():
            score, reasons = score_user_item(user, item)
            scored.append(
                {
                    "user_id": user["user_id"],
                    "profile_name": user["profile_name"],
                    "item_id": item["item_id"],
                    "area_code": item["area_code"],
                    "area_name": item["area_name"],
                    "service_category_code": item["service_category_code"],
                    "service_category_name": item["service_category_name"],
                    "match_score": round(float(score), 6),
                    "reasons": "|".join(reasons),
                }
            )
        scored_frame = pd.DataFrame(scored).sort_values("match_score", ascending=False).reset_index(drop=True)
        scored_frame["label"] = 0
        valid_positive = ~scored_frame["reasons"].str.contains("budget_over", regex=False)
        positive_index = scored_frame[valid_positive].head(3).index
        scored_frame.loc[positive_index, "label"] = 1
        rows.extend(scored_frame.to_dict("records"))
    return pd.DataFrame(rows)
