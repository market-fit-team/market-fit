from __future__ import annotations

import numpy as np
import pandas as pd

from app.models.common_tabular import base_frame


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
    "alighting_boarding_ratio",
    "lunch_alighting_ratio",
    "evening_alighting_ratio",
    "commute_alighting_ratio",
    "night_alighting_ratio",
]
TARGET = "trend_label"


def build_frame(data_mode: str) -> pd.DataFrame:
    frame = base_frame(data_mode)
    if data_mode == "raw" and "target_growth" in frame.columns:
        lower = frame["target_growth"].quantile(0.3)
        upper = frame["target_growth"].quantile(0.7)
        frame[TARGET] = np.select(
            [frame["target_growth"] <= lower, frame["target_growth"] >= upper],
            [0, 2],
            default=1,
        )
    else:
        pseudo = (
            0.45 * frame["target_score"]
            + 0.25 * frame["evening_alighting_ratio"]
            + 0.20 * frame["weekend_sales_ratio"]
            + 0.10 * frame["lunch_alighting_ratio"]
        )
        lower = pseudo.quantile(0.3)
        upper = pseudo.quantile(0.7)
        frame[TARGET] = np.select([pseudo <= lower, pseudo >= upper], [0, 2], default=1)
    return frame

