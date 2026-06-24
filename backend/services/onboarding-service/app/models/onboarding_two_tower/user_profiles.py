from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

SERVICE_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_USER_PROFILES = SERVICE_ROOT / ".sample" / "user_tower_profiles.sample.jsonl"
USER_TOWER_FEATURE_SCALE = "zero_to_one_v1"

CATEGORY_OPTIONS: list[dict[str, str]] = [
    {"code": "CS100001", "label": "한식음식점"},
    {"code": "CS100003", "label": "일식음식점"},
    {"code": "CS100004", "label": "양식음식점"},
    {"code": "CS100005", "label": "제과점"},
    {"code": "CS100007", "label": "치킨전문점"},
]

CATEGORY_LABEL_BY_CODE = {option["code"]: option["label"] for option in CATEGORY_OPTIONS}

DEFAULT_USER_PROFILES: list[dict[str, Any]] = [
    {
        "user_id": "profile_urban_evening_growth",
        "profile_name": "역세권 저녁 매출 성장형",
        "preferred_category_code": "CS100004",
        "budget_level": 0.75,
        "stability_level": 0.25,
        "subway_dependency_level": 1.0,
        "weekend_preference_level": 0.75,
        "evening_preference_level": 1.0,
        "resident_focus_level": 0.25,
        "worker_focus_level": 1.0,
        "rent_sensitivity_level": 0.25,
        "competition_tolerance_level": 0.75,
    },
    {
        "user_id": "profile_safe_residential_bakery",
        "profile_name": "주거 밀착 안정형 제과",
        "preferred_category_code": "CS100005",
        "budget_level": 0.25,
        "stability_level": 1.0,
        "subway_dependency_level": 0.0,
        "weekend_preference_level": 0.5,
        "evening_preference_level": 0.25,
        "resident_focus_level": 1.0,
        "worker_focus_level": 0.0,
        "rent_sensitivity_level": 1.0,
        "competition_tolerance_level": 0.0,
    },
    {
        "user_id": "profile_mixed_family_korean",
        "profile_name": "가족형 한식 균형 운영",
        "preferred_category_code": "CS100001",
        "budget_level": 0.5,
        "stability_level": 0.75,
        "subway_dependency_level": 0.25,
        "weekend_preference_level": 0.75,
        "evening_preference_level": 0.5,
        "resident_focus_level": 1.0,
        "worker_focus_level": 0.25,
        "rent_sensitivity_level": 0.75,
        "competition_tolerance_level": 0.25,
    },
    {
        "user_id": "profile_lunch_office_japanese",
        "profile_name": "오피스 점심 일식형",
        "preferred_category_code": "CS100003",
        "budget_level": 0.5,
        "stability_level": 0.5,
        "subway_dependency_level": 1.0,
        "weekend_preference_level": 0.25,
        "evening_preference_level": 0.25,
        "resident_focus_level": 0.0,
        "worker_focus_level": 1.0,
        "rent_sensitivity_level": 0.5,
        "competition_tolerance_level": 0.5,
    },
    {
        "user_id": "profile_night_chicken_aggressive",
        "profile_name": "야간 외식 공격형",
        "preferred_category_code": "CS100007",
        "budget_level": 0.75,
        "stability_level": 0.0,
        "subway_dependency_level": 0.75,
        "weekend_preference_level": 1.0,
        "evening_preference_level": 1.0,
        "resident_focus_level": 0.5,
        "worker_focus_level": 0.75,
        "rent_sensitivity_level": 0.0,
        "competition_tolerance_level": 1.0,
    },
    {
        "user_id": "profile_small_safe_general",
        "profile_name": "소규모 안정형 일반 외식",
        "preferred_category_code": "CS100001",
        "budget_level": 0.0,
        "stability_level": 1.0,
        "subway_dependency_level": 0.0,
        "weekend_preference_level": 0.25,
        "evening_preference_level": 0.25,
        "resident_focus_level": 0.75,
        "worker_focus_level": 0.0,
        "rent_sensitivity_level": 1.0,
        "competition_tolerance_level": 0.0,
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
        "description": "0에 가까울수록 저비용 창업, 1에 가까울수록 고비용 업종까지 허용한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "stability_level",
        "label": "안정성 선호",
        "description": "0은 성장형, 1은 안정형에 가깝다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "subway_dependency_level",
        "label": "지하철 의존도",
        "description": "높을수록 역세권 유입 신호를 강하게 반영한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "weekend_preference_level",
        "label": "주말 매출 선호",
        "description": "높을수록 주말 비중이 큰 상권을 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "evening_preference_level",
        "label": "저녁 운영 선호",
        "description": "높을수록 저녁 매출 비중이 큰 후보를 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "resident_focus_level",
        "label": "거주민 집중도",
        "description": "높을수록 생활밀착형 거주 수요를 중시한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "worker_focus_level",
        "label": "직장인 집중도",
        "description": "높을수록 오피스 수요가 강한 후보를 선호한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "rent_sensitivity_level",
        "label": "임대료 민감도",
        "description": "높을수록 높은 비용 후보에 더 큰 페널티를 준다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
    {
        "name": "competition_tolerance_level",
        "label": "경쟁 허용도",
        "description": "높을수록 경쟁이 있는 상권도 감수한다.",
        "minimum": 0.0,
        "maximum": 1.0,
        "step": 0.01,
    },
]


def category_options() -> list[dict[str, str]]:
    return [option.copy() for option in CATEGORY_OPTIONS]


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


def budget_limit_from_score(score: float) -> float:
    anchors = [
        (0.0, 50.0),
        (0.25, 100.0),
        (0.5, 150.0),
        (0.75, 220.0),
        (1.0, 320.0),
    ]
    normalized_score = max(0.0, min(1.0, round(float(score), 2)))
    for index, (left_score, left_value) in enumerate(anchors[:-1]):
        right_score, right_value = anchors[index + 1]
        if normalized_score <= right_score:
            if right_score == left_score:
                return left_value
            ratio = (normalized_score - left_score) / (right_score - left_score)
            return left_value + ((right_value - left_value) * ratio)
    return anchors[-1][1]


def score_user_item(user: pd.Series, item: pd.Series) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if str(user["preferred_category_code"]) == str(item["service_category_code"]):
        score += 3.0
        reasons.append("preferred_category_match")

    budget_limit = budget_limit_from_score(float(user["budget_level"]))
    startup_cost = float(item["startup_cost_million_krw_proxy"])
    if startup_cost <= budget_limit:
        score += 1.8
        reasons.append("budget_fit")
    else:
        score -= 2.4
        reasons.append("budget_over")

    subway_weight = float(user["subway_dependency_level"])
    score += 1.8 * subway_weight * float(item["subway_commercial_trend_score"])
    if subway_weight >= 0.8:
        reasons.append("subway_match")

    weekend_weight = float(user["weekend_preference_level"])
    evening_weight = float(user["evening_preference_level"])
    score += 1.0 * weekend_weight * float(item["weekend_sales_ratio"])
    score += 1.2 * evening_weight * float(item["evening_sales_ratio"])

    resident_total = float(item["resident_population"])
    worker_total = float(item["worker_population"])
    population_total = max(resident_total + worker_total, 1.0)
    resident_share = resident_total / population_total
    worker_share = worker_total / population_total

    score += float(user["resident_focus_level"]) * 1.1 * resident_share
    score += float(user["worker_focus_level"]) * 1.1 * worker_share

    stability_weight = float(user["stability_level"])
    growth_weight = 1.0 - stability_weight
    score += 1.0 * stability_weight * (1.0 - float(item["sales_momentum_down_probability"]))
    score -= 0.8 * stability_weight * float(item["demand_gap_score"])
    score += 1.2 * growth_weight * float(item["sales_momentum_up_probability"])
    score += 0.7 * growth_weight * float(item["category_opportunity_score"])

    rent_weight = float(user["rent_sensitivity_level"])
    apartment_penalty = float(item["apartment_average_price_normalized"])
    score -= 0.8 * rent_weight * apartment_penalty
    if rent_weight >= 0.8 and startup_cost > budget_limit * 0.85:
        score -= 1.1
        reasons.append("rent_pressure")

    competition_weight = float(user["competition_tolerance_level"])
    score += 0.5 * competition_weight * float(item["category_opportunity_score"])
    score -= 0.4 * (1.0 - competition_weight) * float(item["demand_gap_score"])

    area_profile_type = str(item["area_profile_type"])
    if worker_share >= resident_share and float(user["worker_focus_level"]) >= 0.75 and area_profile_type == "office":
        score += 0.5
        reasons.append("office_profile_match")
    if resident_share > worker_share and float(user["resident_focus_level"]) >= 0.75 and area_profile_type == "residential":
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
