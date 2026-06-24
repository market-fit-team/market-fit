"""피처 계산·백분위 검증."""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.models.commercial_trend.features import (
    FEATURE_NAMES,
    WINDOW_DAYS,
    compute_window_features,
    latest_features_from_daily,
)
from app.models.commercial_trend.predict import _percentile


def _window(values: list[float]) -> pd.Series:
    index = pd.date_range("2026-04-01", periods=len(values), freq="D")
    return pd.Series(values, index=index)


def test_compute_window_features_상승추세_기울기_양수() -> None:
    feats = compute_window_features(_window([float(i) for i in range(1, WINDOW_DAYS + 1)]))
    assert set(feats) == set(FEATURE_NAMES)
    assert feats["slope_28"] > 0  # 단조 증가면 추세 기울기 양수
    assert feats["recent_vs_prior"] > 0  # 최근 7일이 28일 평균보다 큼


def test_달력피처_예측창_주말공휴일_수() -> None:
    # as-of 2026-05-03 → 예측 창 5/4~5/10: 어린이날(5/5) 1일, 주말(5/9·5/10) 2일
    window = pd.Series(
        [1.0] * WINDOW_DAYS, index=pd.date_range(end="2026-05-03", periods=WINDOW_DAYS, freq="D")
    )
    feats = compute_window_features(window)
    assert feats["forecast_holiday_count"] == 1.0
    assert feats["forecast_weekend_count"] == 2.0


def test_percentile_경계와_정렬() -> None:
    pct = _percentile(np.array([0.1, 0.9, 0.3, 0.5]))
    assert pct[1] == 1.0  # 최댓값 → 1.0
    assert pct[0] == 0.0  # 최솟값 → 0.0
    assert pct.tolist() == [0.0, 1.0, 1 / 3, 2 / 3]


def test_percentile_단일값() -> None:
    assert _percentile(np.array([0.5])).tolist() == [0.5]


def test_latest_features_윈도우_미만_제외() -> None:
    dates = pd.date_range("2026-04-01", periods=WINDOW_DAYS, freq="D")
    long_area = pd.DataFrame({"area_code": "A", "date": dates, "population": np.arange(1.0, WINDOW_DAYS + 1)})
    short_area = pd.DataFrame({"area_code": "B", "date": dates[:10], "population": np.arange(1.0, 11)})
    frame = latest_features_from_daily(pd.concat([long_area, short_area]), {"A": "가동", "B": "나동"})

    # 28일 미만(B)은 제외되고, 피처 컬럼이 모두 있어야 한다.
    assert frame["area_code"].tolist() == ["A"]
    assert frame.loc[0, "area_name"] == "가동"
    assert all(name in frame.columns for name in FEATURE_NAMES)
