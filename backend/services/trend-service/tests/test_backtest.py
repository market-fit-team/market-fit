"""백테스트 헬퍼(순위·시간분할·Top-K) 검증."""

from __future__ import annotations

import numpy as np

from app.models.commercial_trend.backtest import _precision_at_k, _ranks, _time_split


def test_ranks_오름차순_순위() -> None:
    assert _ranks(np.array([10.0, 30.0, 20.0])).tolist() == [0.0, 2.0, 1.0]


def test_time_split_과거학습_최근테스트() -> None:
    features = np.arange(10).reshape(10, 1).astype(float)
    target = np.zeros(10)
    dates = np.array([np.datetime64("2026-04-01") + np.timedelta64(i, "D") for i in range(10)])
    x_train, _, x_test, _, d_test = _time_split(features, target, dates, test_fraction=0.2)

    # 마지막 2일이 테스트, 테스트 최소일자가 학습 최대일자보다 뒤여야 한다.
    assert len(x_test) == 2 and len(x_train) == 8
    assert d_test.min() > dates[:8].max()


def test_precision_at_k_완전일치와_불일치() -> None:
    # 한 as-of일에 5개 후보. 예측 순위가 실제 상위와 같으면 P@3=1.0
    date = np.datetime64("2026-05-01")
    dates = np.array([date] * 5)
    y = np.array([5.0, 4.0, 3.0, 2.0, 1.0])
    perfect = np.array([0.5, 0.4, 0.3, 0.2, 0.1])  # y와 동일 순위
    worst = np.array([0.1, 0.2, 0.3, 0.4, 0.5])  # 정반대 순위
    assert _precision_at_k(dates, y, perfect, k=3) == 1.0
    assert _precision_at_k(dates, y, worst, k=3) < 1.0
