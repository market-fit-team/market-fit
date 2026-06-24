from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd

from app.models.subway_commercial_trend_score.features import find_csv_by_columns, read_csv_auto

SERVICE_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_DIR = SERVICE_ROOT / ".sample"
RAW_DIR = SERVICE_ROOT / ".raw"

SALES_SAMPLE = SAMPLE_DIR / "estimated_sales_hdong_2025.sample.csv"
STORE_SAMPLE = SAMPLE_DIR / "store_hdong_2025.sample.csv"
ACTIVITY_SAMPLE = SAMPLE_DIR / "small_business_activity_by_sector.sample.csv"

CATEGORY_PROFILE_STRING_FEATURES = [
    "service_category_code",
    "service_category_name",
    "category_group",
]

CATEGORY_PROFILE_NUMERIC_FEATURES = [
    "stability_prior_score",
    "competition_pressure_score",
    "weekend_sales_ratio",
    "lunch_sales_ratio",
    "evening_sales_ratio",
    "late_night_sales_ratio",
    "age_10_ratio",
    "age_20_ratio",
    "age_30_ratio",
    "age_40_ratio",
    "age_50_plus_ratio",
    "female_sales_ratio",
    "avg_ticket_score",
    "sales_count_score",
    "franchise_ratio",
    "labor_intensity_score",
    "space_efficiency_score",
]


def _minmax(values: pd.Series) -> pd.Series:
    minimum = float(values.min())
    maximum = float(values.max())
    if maximum == minimum:
        return pd.Series(0.0, index=values.index, dtype="float64")
    return (values - minimum) / (maximum - minimum)


def _safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    return numerator / denominator.replace(0, np.nan)


def _resolve_sales_path(data_mode: str) -> Path:
    if data_mode == "sample":
        return SALES_SAMPLE
    if data_mode == "raw":
        return find_csv_by_columns(
            RAW_DIR,
            {"기준_년분기_코드", "행정동_코드", "서비스_업종_코드", "당월_매출_금액"},
        )
    raise ValueError("data_mode must be 'sample' or 'raw'")


def _resolve_store_path(data_mode: str) -> Path:
    if data_mode == "sample":
        return STORE_SAMPLE
    if data_mode == "raw":
        return find_csv_by_columns(
            RAW_DIR,
            {"기준_년분기_코드", "행정동_코드", "서비스_업종_코드", "점포_수"},
        )
    raise ValueError("data_mode must be 'sample' or 'raw'")


def _resolve_activity_path(data_mode: str) -> Path:
    if data_mode == "sample":
        return ACTIVITY_SAMPLE
    if data_mode != "raw":
        raise ValueError("data_mode must be 'sample' or 'raw'")

    expected_header = [
        "운영점포수 (개)",
        "종사자수 (명)",
        "평균영업기간 (년)",
        "면적당매출액 (백만원/3.3㎡)",
        "면적당종사자수 (명/3.3㎡)",
    ]
    for path in sorted(RAW_DIR.glob("*.csv")):
        for encoding in ("utf-8-sig", "cp949", "euc-kr", "utf-8"):
            try:
                with path.open(encoding=encoding, newline="") as handle:
                    rows = list(csv.reader(handle))
            except UnicodeDecodeError:
                continue
            if len(rows) < 2:
                continue
            if rows[1][2:7] == expected_header:
                return path
    raise FileNotFoundError("영세자영업 경영활동 현황(업종별) 원본 CSV를 찾지 못했다.")


def load_sales_category_features(path: Path) -> pd.DataFrame:
    sales = read_csv_auto(path)
    amount = pd.to_numeric(sales["당월_매출_금액"], errors="coerce").fillna(0)
    count = pd.to_numeric(sales["당월_매출_건수"], errors="coerce").fillna(0)
    weekday = pd.to_numeric(sales["주중_매출_금액"], errors="coerce").fillna(0)
    weekend = pd.to_numeric(sales["주말_매출_금액"], errors="coerce").fillna(0)
    lunch = pd.to_numeric(sales["시간대_11~14_매출_금액"], errors="coerce").fillna(0)
    afternoon = pd.to_numeric(sales["시간대_14~17_매출_금액"], errors="coerce").fillna(0)
    evening = pd.to_numeric(sales["시간대_17~21_매출_금액"], errors="coerce").fillna(0)
    late_night = (
        pd.to_numeric(sales["시간대_21~24_매출_금액"], errors="coerce").fillna(0)
        + pd.to_numeric(sales["시간대_00~06_매출_금액"], errors="coerce").fillna(0)
    )
    male = pd.to_numeric(sales["남성_매출_금액"], errors="coerce").fillna(0)
    female = pd.to_numeric(sales["여성_매출_금액"], errors="coerce").fillna(0)
    age_10 = pd.to_numeric(sales["연령대_10_매출_금액"], errors="coerce").fillna(0)
    age_20 = pd.to_numeric(sales["연령대_20_매출_금액"], errors="coerce").fillna(0)
    age_30 = pd.to_numeric(sales["연령대_30_매출_금액"], errors="coerce").fillna(0)
    age_40 = pd.to_numeric(sales["연령대_40_매출_금액"], errors="coerce").fillna(0)
    age_50 = pd.to_numeric(sales["연령대_50_매출_금액"], errors="coerce").fillna(0)
    age_60_plus = pd.to_numeric(sales["연령대_60_이상_매출_금액"], errors="coerce").fillna(0)

    frame = pd.DataFrame(
        {
            "quarter_code": sales["기준_년분기_코드"].astype(str),
            "service_category_code": sales["서비스_업종_코드"].astype(str),
            "service_category_name": sales["서비스_업종_코드_명"].astype(str),
            "sales_amount": amount,
            "sales_count": count,
            "weekday_sales_amount": weekday,
            "weekend_sales_amount": weekend,
            "lunch_sales_amount": lunch,
            "afternoon_sales_amount": afternoon,
            "evening_sales_amount": evening,
            "late_night_sales_amount": late_night,
            "male_sales_amount": male,
            "female_sales_amount": female,
            "age_10_sales_amount": age_10,
            "age_20_sales_amount": age_20,
            "age_30_sales_amount": age_30,
            "age_40_sales_amount": age_40,
            "age_50_sales_amount": age_50,
            "age_60_plus_sales_amount": age_60_plus,
        }
    )
    grouped = frame.groupby(["service_category_code", "service_category_name"], as_index=False).agg(
        quarter_count=("quarter_code", "nunique"),
        sales_amount=("sales_amount", "sum"),
        sales_count=("sales_count", "sum"),
        weekday_sales_amount=("weekday_sales_amount", "sum"),
        weekend_sales_amount=("weekend_sales_amount", "sum"),
        lunch_sales_amount=("lunch_sales_amount", "sum"),
        afternoon_sales_amount=("afternoon_sales_amount", "sum"),
        evening_sales_amount=("evening_sales_amount", "sum"),
        late_night_sales_amount=("late_night_sales_amount", "sum"),
        male_sales_amount=("male_sales_amount", "sum"),
        female_sales_amount=("female_sales_amount", "sum"),
        age_10_sales_amount=("age_10_sales_amount", "sum"),
        age_20_sales_amount=("age_20_sales_amount", "sum"),
        age_30_sales_amount=("age_30_sales_amount", "sum"),
        age_40_sales_amount=("age_40_sales_amount", "sum"),
        age_50_sales_amount=("age_50_sales_amount", "sum"),
        age_60_plus_sales_amount=("age_60_plus_sales_amount", "sum"),
    )
    grouped["sales_amount_log"] = np.log1p(grouped["sales_amount"])
    grouped["sales_count_log"] = np.log1p(grouped["sales_count"])
    grouped["avg_ticket"] = _safe_ratio(grouped["sales_amount"], grouped["sales_count"]).fillna(0)
    grouped["avg_ticket_log"] = np.log1p(grouped["avg_ticket"])
    grouped["weekday_sales_ratio"] = _safe_ratio(
        grouped["weekday_sales_amount"],
        grouped["weekday_sales_amount"] + grouped["weekend_sales_amount"],
    ).fillna(0)
    grouped["weekend_sales_ratio"] = _safe_ratio(
        grouped["weekend_sales_amount"],
        grouped["weekday_sales_amount"] + grouped["weekend_sales_amount"],
    ).fillna(0)
    grouped["lunch_sales_ratio"] = _safe_ratio(grouped["lunch_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["afternoon_sales_ratio"] = _safe_ratio(
        grouped["afternoon_sales_amount"],
        grouped["sales_amount"],
    ).fillna(0)
    grouped["evening_sales_ratio"] = _safe_ratio(
        grouped["evening_sales_amount"],
        grouped["sales_amount"],
    ).fillna(0)
    grouped["late_night_sales_ratio"] = _safe_ratio(
        grouped["late_night_sales_amount"],
        grouped["sales_amount"],
    ).fillna(0)
    grouped["male_sales_ratio"] = _safe_ratio(grouped["male_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["female_sales_ratio"] = _safe_ratio(
        grouped["female_sales_amount"],
        grouped["sales_amount"],
    ).fillna(0)
    grouped["age_10_ratio"] = _safe_ratio(grouped["age_10_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["age_20_ratio"] = _safe_ratio(grouped["age_20_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["age_30_ratio"] = _safe_ratio(grouped["age_30_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["age_40_ratio"] = _safe_ratio(grouped["age_40_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["age_50_ratio"] = _safe_ratio(grouped["age_50_sales_amount"], grouped["sales_amount"]).fillna(0)
    grouped["age_60_plus_ratio"] = _safe_ratio(
        grouped["age_60_plus_sales_amount"],
        grouped["sales_amount"],
    ).fillna(0)
    grouped["age_50_plus_ratio"] = (grouped["age_50_ratio"] + grouped["age_60_plus_ratio"]).clip(0, 1)
    grouped["sales_observed_flag"] = 1.0
    return grouped


def load_store_category_features(path: Path) -> pd.DataFrame:
    stores = read_csv_auto(path)
    store_count = pd.to_numeric(stores["점포_수"], errors="coerce").fillna(0)
    similar_store_count = pd.to_numeric(stores["유사_업종_점포_수"], errors="coerce").fillna(0)
    opening_store_count = pd.to_numeric(stores["개업_점포_수"], errors="coerce").fillna(0)
    closing_store_count = pd.to_numeric(stores["폐업_점포_수"], errors="coerce").fillna(0)
    franchise_store_count = pd.to_numeric(stores["프랜차이즈_점포_수"], errors="coerce").fillna(0)

    frame = pd.DataFrame(
        {
            "quarter_code": stores["기준_년분기_코드"].astype(str),
            "service_category_code": stores["서비스_업종_코드"].astype(str),
            "service_category_name": stores["서비스_업종_코드_명"].astype(str),
            "store_count": store_count,
            "similar_store_count": similar_store_count,
            "opening_store_count": opening_store_count,
            "closing_store_count": closing_store_count,
            "franchise_store_count": franchise_store_count,
        }
    )
    grouped = frame.groupby(["service_category_code", "service_category_name"], as_index=False).agg(
        quarter_count=("quarter_code", "nunique"),
        store_count_total=("store_count", "sum"),
        similar_store_count_total=("similar_store_count", "sum"),
        opening_store_count_total=("opening_store_count", "sum"),
        closing_store_count_total=("closing_store_count", "sum"),
        franchise_store_count_total=("franchise_store_count", "sum"),
    )
    grouped["store_count_citywide"] = _safe_ratio(
        grouped["store_count_total"],
        grouped["quarter_count"],
    ).fillna(0)
    grouped["similar_store_count_citywide"] = _safe_ratio(
        grouped["similar_store_count_total"],
        grouped["quarter_count"],
    ).fillna(0)
    grouped["similar_store_density"] = _safe_ratio(
        grouped["similar_store_count_total"],
        grouped["store_count_total"],
    ).fillna(0)
    grouped["franchise_ratio"] = _safe_ratio(
        grouped["franchise_store_count_total"],
        grouped["store_count_total"],
    ).fillna(0)
    grouped["opening_rate"] = _safe_ratio(
        grouped["opening_store_count_total"],
        grouped["store_count_total"],
    ).fillna(0)
    grouped["closing_rate"] = _safe_ratio(
        grouped["closing_store_count_total"],
        grouped["store_count_total"],
    ).fillna(0)
    grouped["net_opening_rate"] = grouped["opening_rate"] - grouped["closing_rate"]
    grouped["churn_rate"] = grouped["opening_rate"] + grouped["closing_rate"]
    grouped["store_count_log"] = np.log1p(grouped["store_count_citywide"])
    grouped["store_observed_flag"] = 1.0
    return grouped


def load_activity_category_features(path: Path) -> pd.DataFrame:
    raw = read_csv_auto(path, header=None)
    frame = raw.iloc[2:].copy()
    frame.columns = [
        "category_group",
        "service_category_name",
        "activity_store_count",
        "activity_employee_count",
        "avg_business_years",
        "sales_per_area",
        "employees_per_area",
    ]
    frame = frame[(frame["service_category_name"] != "소계") & (frame["category_group"] != "서울시")].copy()
    for column in [
        "activity_store_count",
        "activity_employee_count",
        "avg_business_years",
        "sales_per_area",
        "employees_per_area",
    ]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    frame["employees_per_store"] = _safe_ratio(
        frame["activity_employee_count"],
        frame["activity_store_count"],
    ).fillna(0)
    frame["activity_observed_flag"] = 1.0
    return frame.reset_index(drop=True)


def build_category_profiles(data_mode: str = "sample", trainable_only: bool = False) -> pd.DataFrame:
    sales = load_sales_category_features(_resolve_sales_path(data_mode))
    stores = load_store_category_features(_resolve_store_path(data_mode))
    activity = load_activity_category_features(_resolve_activity_path(data_mode))

    category = stores.merge(
        sales,
        on=["service_category_code", "service_category_name"],
        how="left",
        suffixes=("_store", "_sales"),
    ).merge(
        activity,
        on="service_category_name",
        how="left",
    )

    category["category_group"] = category["category_group"].fillna("unknown").astype(str)
    for flag_column in [
        "sales_observed_flag",
        "store_observed_flag",
        "activity_observed_flag",
    ]:
        category[flag_column] = pd.to_numeric(category[flag_column], errors="coerce").fillna(0)

    numeric_fill_columns = [
        "sales_amount_log",
        "sales_count_log",
        "avg_ticket",
        "avg_ticket_log",
        "weekday_sales_ratio",
        "weekend_sales_ratio",
        "lunch_sales_ratio",
        "afternoon_sales_ratio",
        "evening_sales_ratio",
        "late_night_sales_ratio",
        "male_sales_ratio",
        "female_sales_ratio",
        "age_10_ratio",
        "age_20_ratio",
        "age_30_ratio",
        "age_40_ratio",
        "age_50_ratio",
        "age_60_plus_ratio",
        "age_50_plus_ratio",
        "store_count_citywide",
        "similar_store_count_citywide",
        "similar_store_density",
        "franchise_ratio",
        "opening_rate",
        "closing_rate",
        "net_opening_rate",
        "churn_rate",
        "store_count_log",
        "activity_store_count",
        "activity_employee_count",
        "avg_business_years",
        "sales_per_area",
        "employees_per_area",
        "employees_per_store",
    ]
    for column in numeric_fill_columns:
        category[column] = pd.to_numeric(category[column], errors="coerce").fillna(0)

    category["sales_amount_score"] = _minmax(category["sales_amount_log"]).fillna(0)
    category["sales_count_score"] = _minmax(category["sales_count_log"]).fillna(0)
    category["avg_ticket_score"] = _minmax(category["avg_ticket_log"]).fillna(0)
    category["store_count_score"] = _minmax(category["store_count_log"]).fillna(0)
    category["avg_business_years_score"] = _minmax(category["avg_business_years"]).fillna(0)
    category["space_efficiency_score"] = _minmax(category["sales_per_area"]).fillna(0)
    category["employees_per_area_score"] = _minmax(category["employees_per_area"]).fillna(0)
    category["employees_per_store_score"] = _minmax(category["employees_per_store"]).fillna(0)

    category["stability_prior_score"] = _minmax(
        0.6 * category["avg_business_years_score"]
        + 0.25 * (1.0 - category["closing_rate"].clip(0, 1))
        + 0.15 * (1.0 - category["churn_rate"].clip(0, 1))
    ).fillna(0)
    category["competition_pressure_score"] = _minmax(
        0.45 * category["similar_store_density"]
        + 0.35 * category["franchise_ratio"]
        + 0.20 * category["store_count_score"]
    ).fillna(0)
    category["labor_intensity_score"] = _minmax(
        0.65 * category["employees_per_area_score"] + 0.35 * category["employees_per_store_score"]
    ).fillna(0)

    category["sales_observed_flag"] = category["sales_observed_flag"].clip(0, 1)
    category["store_observed_flag"] = category["store_observed_flag"].clip(0, 1)
    category["activity_observed_flag"] = category["activity_observed_flag"].clip(0, 1)
    category["is_trainable"] = (
        (category["sales_observed_flag"] > 0)
        & (category["store_observed_flag"] > 0)
        & (category["activity_observed_flag"] > 0)
    ).astype(int)

    for column in CATEGORY_PROFILE_STRING_FEATURES:
        category[column] = category[column].fillna("unknown").astype(str)

    if trainable_only:
        category = category[category["is_trainable"] == 1].copy()

    return category.sort_values(["service_category_code"]).reset_index(drop=True)


def category_options(data_mode: str = "sample", trainable_only: bool = True) -> list[dict[str, str]]:
    frame = build_category_profiles(data_mode=data_mode, trainable_only=trainable_only)
    return [
        {
            "code": row["service_category_code"],
            "label": row["service_category_name"],
            "group": row["category_group"],
        }
        for row in frame[
            [
                "service_category_code",
                "service_category_name",
                "category_group",
            ]
        ].to_dict(orient="records")
    ]
