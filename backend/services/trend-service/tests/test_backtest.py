"""백테스트 헬퍼(순위상관·Top-K·퍼뮤테이션 p값) 검증. lightgbm 없이 도는 순수 로직만 본다."""

from __future__ import annotations

import numpy as np
import pytest

from app.models.commercial_trend.backtest import (
    FORECAST_FEATURES,
    FORWARD_WEEKS,
    _feature_label_screen,
    _mean_week_ic,
    _paired_perm_p,
    _precision_at_k,
    _sign_flip_p,
    _spearman,
    _time_split_weeks,
)


def test_spearman_완전일치와_정반대() -> None:
    a = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    assert _spearman(a, a) == pytest.approx(1.0)
    assert _spearman(a, a[::-1]) == pytest.approx(-1.0)


def test_spearman_표본부족이나_상수면_0() -> None:
    assert _spearman(np.array([1.0, 2.0]), np.array([1.0, 2.0])) == 0.0  # 표본<3
    assert _spearman(np.ones(5), np.arange(5.0)) == 0.0  # 분산 0


def test_precision_at_k_완전일치와_정반대() -> None:
    y = np.array([5.0, 4.0, 3.0, 2.0, 1.0])
    perfect = np.array([0.5, 0.4, 0.3, 0.2, 0.1])  # y와 동일 순위
    worst = np.array([0.1, 0.2, 0.3, 0.4, 0.5])  # 정반대 순위
    assert _precision_at_k(perfect, y, k=3) == 1.0
    assert _precision_at_k(worst, y, k=3) < 1.0


def test_sign_flip_p_강한신호는_유의하고_0근처는_아니다() -> None:
    rng = np.random.default_rng(0)
    strong = np.full(40, 0.3)  # 모든 검증주에서 양(+) IC → 무작위 대비 매우 유의
    assert _sign_flip_p(strong, n_perm=5000, rng=rng) < 0.05
    noise = rng.normal(0.0, 0.1, size=40)  # 평균 ≈ 0 → 유의하지 않음
    assert _sign_flip_p(noise, n_perm=5000, rng=rng) > 0.05


def test_paired_perm_p_모델이_기준을_이기면_유의() -> None:
    rng = np.random.default_rng(0)
    model = np.full(40, 0.2)
    baseline = np.full(40, -0.1)  # 역추세: 트레일링 기준은 음(-)
    assert _paired_perm_p(model, baseline, n_perm=5000, rng=rng) < 0.05


def test_sign_flip_p_add_one_하한() -> None:
    rng = np.random.default_rng(0)
    # 관측이 모든 퍼뮤테이션을 압도해도 p는 1/(1+n_perm) 이상(0이 되지 않음).
    p = _sign_flip_p(np.full(50, 1.0), n_perm=1000, rng=rng)
    assert p >= 1.0 / (1.0 + 1000)


def test_feature_label_screen_누수피처를_잡는다() -> None:
    rng = np.random.default_rng(0)
    n = 300
    y = rng.normal(size=n)
    x = rng.normal(size=(n, len(FORECAST_FEATURES)))
    x[:, 0] = y  # 0번 피처를 라벨과 동일하게(완전 누수)
    screen = _feature_label_screen(x, y)
    assert set(screen) == set(FORECAST_FEATURES)
    assert screen[FORECAST_FEATURES[0]] == pytest.approx(1.0)  # 누수 피처는 |corr|≈1
    assert screen[FORECAST_FEATURES[1]] < 0.5  # 무관 피처는 낮음


def test_time_split_weeks_purge갭을_둔다() -> None:
    # 결정주 0..39, 각 주 1표본. 마지막 20%(8주)가 검증, 학습 끝과 검증 사이 purge 8주.
    weeks = np.arange(40)
    train_mask, valid_mask = _time_split_weeks(weeks)
    assert valid_mask.sum() == 8  # 마지막 20%
    first_valid = weeks[valid_mask].min()
    assert weeks[train_mask].max() < first_valid - FORWARD_WEEKS  # purge 갭 확보
    assert not (train_mask & valid_mask).any()  # 겹치지 않음


def test_mean_week_ic_주별_횡단면_평균() -> None:
    # 두 결정주, 각 주에서 예측 순위가 라벨과 완전 일치 → 주별 IC=1, 평균=1
    weeks = np.array([0, 0, 0, 1, 1, 1])
    pred = np.array([0.1, 0.2, 0.3, 0.9, 0.8, 0.7])
    y = np.array([1.0, 2.0, 3.0, 3.0, 2.0, 1.0])
    assert _mean_week_ic(weeks, pred, y) == pytest.approx(1.0)
