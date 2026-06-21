from __future__ import annotations

import numpy as np
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
    "commute_alighting",
    "night_alighting",
    "lunch_alighting_ratio",
    "evening_alighting_ratio",
    "night_alighting_ratio",
]
TARGET = "high_gap"


def build_frame(data_mode: str) -> pd.DataFrame:
    frame = base_frame(data_mode)
    demand_signal = (
        0.45 * minmax(frame["target_score"])
        + 0.25 * minmax(frame["evening_alighting"])
        + 0.20 * minmax(frame["lunch_alighting"])
        + 0.10 * minmax(frame["night_alighting"])
    )
    if data_mode == "raw" and "target_growth" in frame.columns:
        sales_response = minmax(frame["target_growth"])
    else:
        sales_response = minmax(frame["sales_amount"])
    gap = demand_signal - sales_response
    threshold = gap.quantile(0.8)
    frame[TARGET] = np.where(gap >= threshold, 1, 0)
    frame["gap_score"] = minmax(gap)
    return frame

