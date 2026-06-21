from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

SERVICE_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_DIR = SERVICE_ROOT / ".sample"
RAW_DIR = SERVICE_ROOT / ".raw"
EXTERNAL_DIR = SERVICE_ROOT / "data" / "external"
SUBWAY_SAMPLE = SAMPLE_DIR / "subway_station_hourly_ridership.sample.csv"
SALES_SAMPLE = SAMPLE_DIR / "estimated_sales_hdong_2025.sample.csv"
STATION_AREA_WEIGHTS = EXTERNAL_DIR / "station_area_weights.csv"

BOARDING_SUFFIX = "승차인원"
ALIGHTING_SUFFIX = "하차인원"


def _hour_start(column_name: str) -> int | None:
    if "시-" not in column_name:
        return None
    return int(column_name.split("시-", 1)[0])


def _numeric(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    values = df[columns].copy()
    for column in columns:
        values[column] = pd.to_numeric(values[column], errors="coerce").fillna(0)
    return values


def read_csv_auto(path: Path, **kwargs: object) -> pd.DataFrame:
    for encoding in ("utf-8-sig", "cp949", "utf-8"):
        try:
            return pd.read_csv(path, encoding=encoding, **kwargs)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, **kwargs)


def find_csv_by_columns(data_dir: Path, required_columns: set[str]) -> Path:
    for path in sorted(data_dir.glob("*.csv")):
        try:
            header = read_csv_auto(path, nrows=0)
        except Exception:
            continue
        if required_columns.issubset(set(header.columns)):
            return path
    raise FileNotFoundError(f"Cannot find CSV with columns {sorted(required_columns)} in {data_dir}")


def quarter_code_from_month(month: pd.Series) -> pd.Series:
    month_text = month.astype(str).str.replace('"', "", regex=False).str.strip()
    year = month_text.str.slice(0, 4).astype(int)
    month_number = month_text.str.slice(4, 6).astype(int)
    quarter = ((month_number - 1) // 3) + 1
    return year * 10 + quarter


def load_subway_features(path: Path = SUBWAY_SAMPLE) -> pd.DataFrame:
    subway = read_csv_auto(path)
    boarding_columns = [column for column in subway.columns if column.endswith(BOARDING_SUFFIX)]
    alighting_columns = [column for column in subway.columns if column.endswith(ALIGHTING_SUFFIX)]

    boarding = _numeric(subway, boarding_columns)
    alighting = _numeric(subway, alighting_columns)

    lunch_columns = [column for column in alighting_columns if (_hour_start(column) or 0) in {11, 12, 13}]
    evening_columns = [column for column in alighting_columns if (_hour_start(column) or 0) in {17, 18, 19, 20}]
    commute_columns = [column for column in alighting_columns if (_hour_start(column) or 0) in {7, 8, 9}]
    night_columns = [column for column in alighting_columns if (_hour_start(column) or 0) in {21, 22, 23}]

    features = pd.DataFrame(
        {
            "month": subway["사용월"].astype(str),
            "line_name": subway["호선명"].astype(str),
            "station_name": subway["지하철역"].astype(str),
            "boarding_total": boarding.sum(axis=1),
            "alighting_total": alighting.sum(axis=1),
            "lunch_alighting": alighting[lunch_columns].sum(axis=1),
            "evening_alighting": alighting[evening_columns].sum(axis=1),
            "commute_alighting": alighting[commute_columns].sum(axis=1),
            "night_alighting": alighting[night_columns].sum(axis=1),
        }
    )
    features["alighting_boarding_ratio"] = features["alighting_total"] / features["boarding_total"].replace(0, np.nan)
    features["lunch_alighting_ratio"] = features["lunch_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["evening_alighting_ratio"] = features["evening_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["commute_alighting_ratio"] = features["commute_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["night_alighting_ratio"] = features["night_alighting"] / features["alighting_total"].replace(0, np.nan)
    return features.fillna(0)


def load_quarterly_subway_features(data_dir: Path = RAW_DIR) -> pd.DataFrame:
    path = find_csv_by_columns(data_dir, {"사용월", "호선명", "지하철역"})
    station_features = load_subway_features(path)
    station_features["quarter_code"] = quarter_code_from_month(station_features["month"])

    value_columns = [
        "boarding_total",
        "alighting_total",
        "lunch_alighting",
        "evening_alighting",
        "commute_alighting",
        "night_alighting",
    ]
    if STATION_AREA_WEIGHTS.exists():
        weights = read_csv_auto(STATION_AREA_WEIGHTS)
        required = {"station_name", "line_name", "area_code", "weight"}
        missing = required - set(weights.columns)
        if missing:
            raise ValueError(f"{STATION_AREA_WEIGHTS} is missing columns: {sorted(missing)}")
        merged = station_features.merge(weights, on=["station_name", "line_name"], how="inner")
        for column in value_columns:
            merged[column] = merged[column] * merged["weight"]
        group_keys = ["quarter_code", "area_code"]
        grouped = merged.groupby(group_keys, as_index=False)[value_columns].sum()
        grouped["join_strategy"] = "station_area_weights"
        return _add_subway_ratios(grouped)

    grouped = station_features.groupby("quarter_code", as_index=False)[value_columns].sum()
    grouped["join_strategy"] = "citywide_quarter_signal"
    return _add_subway_ratios(grouped)


def _add_subway_ratios(features: pd.DataFrame) -> pd.DataFrame:
    features["alighting_boarding_ratio"] = features["alighting_total"] / features["boarding_total"].replace(0, np.nan)
    features["lunch_alighting_ratio"] = features["lunch_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["evening_alighting_ratio"] = features["evening_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["commute_alighting_ratio"] = features["commute_alighting"] / features["alighting_total"].replace(0, np.nan)
    features["night_alighting_ratio"] = features["night_alighting"] / features["alighting_total"].replace(0, np.nan)
    return features.fillna(0)


def load_sales_features(path: Path = SALES_SAMPLE) -> pd.DataFrame:
    sales = read_csv_auto(path)
    amount = pd.to_numeric(sales["당월_매출_금액"], errors="coerce").fillna(0)
    count = pd.to_numeric(sales["당월_매출_건수"], errors="coerce").fillna(0)
    weekday = pd.to_numeric(sales["주중_매출_금액"], errors="coerce").fillna(0)
    weekend = pd.to_numeric(sales["주말_매출_금액"], errors="coerce").fillna(0)
    evening = pd.to_numeric(sales["시간대_17~21_매출_금액"], errors="coerce").fillna(0)

    features = pd.DataFrame(
        {
            "quarter_code": sales["기준_년분기_코드"].astype(int),
            "area_code": sales["행정동_코드"].astype(str),
            "area_name": sales["행정동_코드_명"].astype(str),
            "service_category_code": sales["서비스_업종_코드"].astype(str),
            "service_category_name": sales["서비스_업종_코드_명"].astype(str),
            "sales_amount": amount,
            "sales_count": count,
            "sales_per_count": amount / count.replace(0, np.nan),
            "weekend_sales_ratio": weekend / (weekday + weekend).replace(0, np.nan),
            "evening_sales_ratio": evening / amount.replace(0, np.nan),
        }
    )
    return features.fillna(0)


def load_quarterly_sales_features(data_dir: Path = RAW_DIR) -> pd.DataFrame:
    path = find_csv_by_columns(data_dir, {"기준_년분기_코드", "행정동_코드", "서비스_업종_코드", "당월_매출_금액"})
    sales = load_sales_features(path)
    grouped = (
        sales.groupby(
            ["quarter_code", "area_code", "area_name", "service_category_code", "service_category_name"],
            as_index=False,
        )
        .agg(
            sales_amount=("sales_amount", "sum"),
            sales_count=("sales_count", "sum"),
            weekend_sales_ratio=("weekend_sales_ratio", "mean"),
            evening_sales_ratio=("evening_sales_ratio", "mean"),
        )
        .sort_values(["area_code", "service_category_code", "quarter_code"])
    )
    grouped["sales_per_count"] = grouped["sales_amount"] / grouped["sales_count"].replace(0, np.nan)
    grouped["next_sales_amount"] = grouped.groupby(["area_code", "service_category_code"])["sales_amount"].shift(-1)
    grouped = grouped.dropna(subset=["next_sales_amount"]).copy()
    grouped["target_growth"] = np.log1p(grouped["next_sales_amount"]) - np.log1p(grouped["sales_amount"])
    grouped["target_score"] = _minmax(grouped["target_growth"])
    return grouped.fillna(0)


def build_sample_training_frame() -> pd.DataFrame:
    subway = load_subway_features()
    sales = load_sales_features()
    rows = subway.merge(sales, how="cross")

    # Sample-only substitute for station-area spatial weight.
    # Real training replaces this with EPSG:5181 station/area spatial join weights.
    rows["station_area_weight"] = 1 / (1 + rows.groupby("service_category_code").cumcount())
    rows["weighted_alighting_total"] = rows["alighting_total"] * rows["station_area_weight"]
    rows["weighted_lunch_alighting"] = rows["lunch_alighting"] * rows["station_area_weight"]
    rows["weighted_evening_alighting"] = rows["evening_alighting"] * rows["station_area_weight"]

    demand_signal = (
        0.42 * _minmax(rows["weighted_alighting_total"])
        + 0.24 * _minmax(rows["weighted_evening_alighting"])
        + 0.14 * _minmax(rows["weighted_lunch_alighting"])
        + 0.10 * _minmax(rows["weekend_sales_ratio"])
        + 0.10 * _minmax(np.log1p(rows["sales_amount"]))
    )
    rows["target_score"] = demand_signal.clip(0, 1)
    return rows


def build_raw_training_frame() -> pd.DataFrame:
    sales = load_quarterly_sales_features()
    subway = load_quarterly_subway_features()
    if "area_code" in subway.columns:
        rows = sales.merge(subway, on=["quarter_code", "area_code"], how="inner")
        rows["station_area_weight"] = 1.0
    else:
        rows = sales.merge(subway, on="quarter_code", how="inner")
        rows["station_area_weight"] = 0.0
    rows["weighted_alighting_total"] = rows["alighting_total"] * np.where(rows["station_area_weight"] > 0, rows["station_area_weight"], 1.0)
    rows["weighted_lunch_alighting"] = rows["lunch_alighting"] * np.where(rows["station_area_weight"] > 0, rows["station_area_weight"], 1.0)
    rows["weighted_evening_alighting"] = rows["evening_alighting"] * np.where(rows["station_area_weight"] > 0, rows["station_area_weight"], 1.0)
    return rows.fillna(0)


def build_training_frame(data_mode: str = "sample") -> pd.DataFrame:
    if data_mode == "sample":
        return build_sample_training_frame()
    if data_mode == "raw":
        return build_raw_training_frame()
    raise ValueError("data_mode must be 'sample' or 'raw'")


def _minmax(values: pd.Series) -> pd.Series:
    minimum = values.min()
    maximum = values.max()
    if maximum == minimum:
        return pd.Series(0.0, index=values.index)
    return (values - minimum) / (maximum - minimum)
