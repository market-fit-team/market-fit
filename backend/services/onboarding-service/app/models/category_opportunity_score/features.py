from __future__ import annotations

import pandas as pd

from app.models.common_tabular import base_frame, minmax


FEATURES = [
    "sales_amount",
    "sales_count",
    "sales_per_count",
    "weekend_sales_ratio",
    "evening_sales_ratio",
    "target_score",
    "alighting_total",
    "lunch_alighting",
    "evening_alighting",
    "night_alighting",
    "lunch_alighting_ratio",
    "evening_alighting_ratio",
    "night_alighting_ratio",
]
TARGET = "opportunity_score"


def build_frame(data_mode: str) -> pd.DataFrame:
    frame = base_frame(data_mode)
    if data_mode == "raw" and "target_growth" in frame.columns:
        area_avg = frame.groupby(["quarter_code", "area_code"])["target_growth"].transform("mean")
        city_category_avg = frame.groupby(["quarter_code", "service_category_code"])["target_growth"].transform("mean")
        frame[TARGET] = minmax((frame["target_growth"] - area_avg) + 0.5 * (frame["target_growth"] - city_category_avg))
    else:
        frame[TARGET] = minmax(
            0.36 * frame["target_score"]
            + 0.22 * frame["weekend_sales_ratio"]
            + 0.22 * frame["evening_alighting_ratio"]
            + 0.20 * frame["lunch_alighting_ratio"]
        )
    return frame

