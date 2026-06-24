from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from app.models.category_opportunity_score.features import build_frame as build_category_frame
from app.models.demand_gap_detector.features import build_frame as build_gap_frame
from app.models.sales_momentum_forecast.features import build_frame as build_momentum_frame
from app.models.subway_commercial_trend_score.features import read_csv_auto

SERVICE_ROOT = Path(__file__).resolve().parents[3]
RESIDENT_SAMPLE = SERVICE_ROOT / ".sample" / "resident_population_hdong.sample.csv"
WORKER_SAMPLE = SERVICE_ROOT / ".sample" / "working_population_hdong.sample.csv"
LIVING_SAMPLE = SERVICE_ROOT / ".sample" / "living_population_hdong_domestic.sample.csv"
CONSUMPTION_SAMPLE = SERVICE_ROOT / ".sample" / "consumption_hdong.sample.csv"
APARTMENT_SAMPLE = SERVICE_ROOT / ".sample" / "apartment_hdong.sample.csv"
FACILITIES_SAMPLE = SERVICE_ROOT / ".sample" / "attraction_facilities_hdong.sample.csv"

CATEGORY_COST = {
    "CS100001": 140.0,
    "CS100003": 160.0,
    "CS100004": 190.0,
    "CS100005": 45.0,
    "CS100007": 120.0,
}


def _build_area_features() -> pd.DataFrame:
    resident = read_csv_auto(RESIDENT_SAMPLE)[
        ["행정동_코드", "행정동_코드_명", "총_상주인구_수"]
    ].copy()
    resident.columns = ["area_code", "area_name", "resident_population"]
    resident["area_code"] = resident["area_code"].astype(str)
    resident["resident_population"] = pd.to_numeric(
        resident["resident_population"],
        errors="coerce",
    ).fillna(0)
    resident = resident.groupby("area_code", as_index=False).agg(
        area_name=("area_name", "first"),
        resident_population=("resident_population", "mean"),
    )

    worker = read_csv_auto(WORKER_SAMPLE)[["행정동_코드", "총_직장_인구_수"]].copy()
    worker.columns = ["area_code", "worker_population"]
    worker["area_code"] = worker["area_code"].astype(str)
    worker["worker_population"] = pd.to_numeric(
        worker["worker_population"],
        errors="coerce",
    ).fillna(0)
    worker = worker.groupby("area_code", as_index=False).agg(
        worker_population=("worker_population", "mean")
    )

    living = read_csv_auto(LIVING_SAMPLE, index_col=False)[["행정동코드", "총생활인구수"]].copy()
    living.columns = ["area_code", "living_population"]
    living["area_code"] = living["area_code"].astype(str)
    living["living_population"] = pd.to_numeric(
        living["living_population"],
        errors="coerce",
    ).fillna(0)
    living = living.groupby("area_code", as_index=False).agg(
        living_population=("living_population", "mean")
    )

    consumption = read_csv_auto(CONSUMPTION_SAMPLE)[
        ["행정동_코드", "지출_총금액", "음식_지출_총금액"]
    ].copy()
    consumption.columns = ["area_code", "consumption_total", "food_consumption_total"]
    consumption["area_code"] = consumption["area_code"].astype(str)
    consumption["consumption_total"] = pd.to_numeric(
        consumption["consumption_total"],
        errors="coerce",
    ).fillna(0)
    consumption["food_consumption_total"] = pd.to_numeric(
        consumption["food_consumption_total"],
        errors="coerce",
    ).fillna(0)
    consumption = consumption.groupby("area_code", as_index=False).agg(
        consumption_total=("consumption_total", "mean"),
        food_consumption_total=("food_consumption_total", "mean"),
    )
    consumption["food_consumption_ratio"] = consumption["food_consumption_total"] / consumption[
        "consumption_total"
    ].replace(0, np.nan)

    apartment = read_csv_auto(APARTMENT_SAMPLE)[["행정동_코드", "아파트_평균_시가"]].copy()
    apartment.columns = ["area_code", "apartment_average_price"]
    apartment["area_code"] = apartment["area_code"].astype(str)
    apartment["apartment_average_price"] = pd.to_numeric(
        apartment["apartment_average_price"],
        errors="coerce",
    ).fillna(0)
    apartment = apartment.groupby("area_code", as_index=False).agg(
        apartment_average_price=("apartment_average_price", "mean")
    )

    facilities = read_csv_auto(FACILITIES_SAMPLE)[["행정동_코드", "집객시설_수", "지하철_역_수"]].copy()
    facilities.columns = ["area_code", "attraction_facility_count", "subway_station_count"]
    facilities["area_code"] = facilities["area_code"].astype(str)
    facilities["attraction_facility_count"] = pd.to_numeric(
        facilities["attraction_facility_count"],
        errors="coerce",
    ).fillna(0)
    facilities["subway_station_count"] = pd.to_numeric(
        facilities["subway_station_count"],
        errors="coerce",
    ).fillna(0)
    facilities = facilities.groupby("area_code", as_index=False).agg(
        attraction_facility_count=("attraction_facility_count", "mean"),
        subway_station_count=("subway_station_count", "mean"),
    )

    area_codes = sorted(
        set(resident["area_code"])
        | set(worker["area_code"])
        | set(living["area_code"])
        | set(consumption["area_code"])
        | set(apartment["area_code"])
        | set(facilities["area_code"])
    )
    area = pd.DataFrame({"area_code": area_codes})
    area = area.merge(resident, on="area_code", how="left")
    area = area.merge(worker, on="area_code", how="left")
    area = area.merge(living, on="area_code", how="left")
    area = area.merge(consumption, on="area_code", how="left")
    area = area.merge(apartment, on="area_code", how="left")
    area = area.merge(facilities, on="area_code", how="left")
    area = area.fillna(0)

    # 샘플 CSV는 생활인구만 있고 거주/직장 인구가 비어 있는 행정동이 있다.
    resident_missing = (area["resident_population"] <= 0) & (area["living_population"] > 0)
    worker_missing = (area["worker_population"] <= 0) & (area["living_population"] > 0)
    area.loc[resident_missing, "resident_population"] = area.loc[resident_missing, "living_population"] * 0.58
    area.loc[worker_missing, "worker_population"] = area.loc[worker_missing, "living_population"] * 0.42

    area["area_profile_type"] = np.select(
        [
            area["worker_population"] >= area["resident_population"] * 1.2,
            area["resident_population"] >= area["worker_population"] * 1.2,
        ],
        ["office", "residential"],
        default="mixed",
    )
    price_min = float(area["apartment_average_price"].min())
    price_max = float(area["apartment_average_price"].max())
    if price_max == price_min:
        area["apartment_average_price_normalized"] = 0.0
    else:
        area["apartment_average_price_normalized"] = (
            area["apartment_average_price"] - price_min
        ) / (price_max - price_min)
    return area.fillna(0)


def build_item_features(data_mode: str = "sample") -> pd.DataFrame:
    category = build_category_frame(data_mode)
    momentum = build_momentum_frame(data_mode)[
        ["quarter_code", "area_code", "service_category_code", "trend_label"]
    ].copy()
    gap = build_gap_frame(data_mode)[
        ["quarter_code", "area_code", "service_category_code", "gap_score", "high_gap"]
    ].copy()

    items = category.merge(
        momentum,
        on=["quarter_code", "area_code", "service_category_code"],
        how="left",
    ).merge(
        gap,
        on=["quarter_code", "area_code", "service_category_code"],
        how="left",
    )
    items = items.merge(_build_area_features(), on=["area_code"], how="left", suffixes=("", "_area"))
    if "area_name_area" in items.columns:
        items["area_name"] = items["area_name"].fillna(items["area_name_area"])
    items["item_id"] = items["area_code"].astype(str) + ":" + items["service_category_code"].astype(str)
    items["sales_momentum_up_probability"] = np.where(items["trend_label"] == 2, 0.72, 0.18)
    items["sales_momentum_down_probability"] = np.where(items["trend_label"] == 0, 0.72, 0.14)
    items["subway_commercial_trend_score"] = items["target_score"]
    items["category_opportunity_score"] = items["opportunity_score"]
    items["demand_gap_score"] = items["gap_score"]
    items["startup_cost_million_krw_proxy"] = items["service_category_code"].map(CATEGORY_COST).fillna(120.0)
    items["subway_coverage_level"] = np.select(
        [
            (items["subway_station_count"] >= 2) & (items["subway_commercial_trend_score"] >= 0.55),
            items["subway_station_count"] >= 1,
        ],
        ["high", "medium"],
        default="low",
    )
    numeric_columns = [
        "sales_amount",
        "sales_count",
        "sales_per_count",
        "weekend_sales_ratio",
        "evening_sales_ratio",
        "subway_commercial_trend_score",
        "sales_momentum_up_probability",
        "sales_momentum_down_probability",
        "category_opportunity_score",
        "demand_gap_score",
        "startup_cost_million_krw_proxy",
        "lunch_alighting_ratio",
        "evening_alighting_ratio",
        "resident_population",
        "worker_population",
        "living_population",
        "consumption_total",
        "food_consumption_ratio",
        "apartment_average_price",
        "apartment_average_price_normalized",
        "attraction_facility_count",
        "subway_station_count",
    ]
    catalog = (
        items.sort_values("quarter_code")
        .groupby("item_id", as_index=False)
        .agg(
            {
                "quarter_code": "max",
                "area_code": "first",
                "area_name": "first",
                "service_category_code": "first",
                "service_category_name": "first",
                "subway_coverage_level": "first",
                "area_profile_type": "first",
                **{column: "mean" for column in numeric_columns},
            }
        )
    )
    for column in [
        "item_id",
        "area_code",
        "area_name",
        "service_category_code",
        "service_category_name",
        "subway_coverage_level",
        "area_profile_type",
    ]:
        catalog[column] = catalog[column].fillna("unknown").astype(str)
    for column in numeric_columns:
        catalog[column] = pd.to_numeric(catalog[column], errors="coerce").fillna(0)
    return catalog
