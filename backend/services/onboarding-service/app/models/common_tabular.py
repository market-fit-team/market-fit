from __future__ import annotations

import pandas as pd

from app.models.subway_commercial_trend_score.features import (
    build_raw_training_frame,
    build_sample_training_frame,
)


def minmax(values: pd.Series) -> pd.Series:
    minimum = values.min()
    maximum = values.max()
    if maximum == minimum:
        return pd.Series(0.0, index=values.index)
    return (values - minimum) / (maximum - minimum)


def base_frame(data_mode: str) -> pd.DataFrame:
    if data_mode == "sample":
        return build_sample_training_frame().copy()
    if data_mode == "raw":
        return build_raw_training_frame().copy()
    raise ValueError("data_mode must be 'sample' or 'raw'")
