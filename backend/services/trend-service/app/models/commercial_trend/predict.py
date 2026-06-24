from __future__ import annotations

import json

import lightgbm as lgb
import numpy as np
import pandas as pd

from app.models.commercial_trend.features import (
    FEATURE_NAMES,
    META_FILE,
    MODEL_FILE,
    THEME_CODES,
    latest_features_from_daily,
)

# 트렌드 점수 표시 범위. 0~100 전체를 쓰면 최하위가 0점이라 어색해서 보기 좋게 좁힌다.
SCORE_MIN = 50.0
SCORE_MAX = 99.0


def load_model() -> lgb.Booster:
    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"학습 부스터가 없다: {MODEL_FILE}")
    return lgb.Booster(model_file=str(MODEL_FILE))


def load_meta() -> dict[str, object]:
    if not META_FILE.exists():
        raise FileNotFoundError(f"모델 메타가 없다: {META_FILE}")
    return json.loads(META_FILE.read_text(encoding="utf-8"))


def _percentile(values: np.ndarray) -> np.ndarray:
    """횡단면 백분위(0~1)로 변환한다. min-max와 달리 이상치에 강하다."""
    n = len(values)
    if n == 1:
        return np.full(1, 0.5)
    order = np.argsort(values)
    ranks = np.empty(n, dtype=float)
    ranks[order] = np.arange(n, dtype=float)
    return ranks / (n - 1)


def predict_from_features(frame: pd.DataFrame, theme: str) -> list[dict[str, object]]:
    """최신 피처 프레임 + 주제 코드로 예측·점수를 만든다(통합 모델)."""
    if frame.empty:
        return []

    booster = load_model()
    features = frame[FEATURE_NAMES].to_numpy(dtype=float)
    theme_column = np.full((len(frame), 1), float(THEME_CODES[theme]))
    matrix = np.hstack([features, theme_column])  # 마지막 열 = theme_code

    pred_log = np.asarray(booster.predict(matrix), dtype=float)
    pred_growth = np.expm1(pred_log)  # log-uplift -> 증감률 복원

    percentile = _percentile(pred_growth)
    scores = np.round(SCORE_MIN + (SCORE_MAX - SCORE_MIN) * percentile).astype(int)

    results: list[dict[str, object]] = []
    for i, row in frame.reset_index(drop=True).iterrows():
        results.append(
            {
                "area_code": str(row["area_code"]),
                "area_name": str(row["area_name"]),
                "score": int(scores[i]),
                "pred_growth": float(pred_growth[i]),
                "signals": {name: float(row[name]) for name in FEATURE_NAMES},
            }
        )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results


def predict_trend_scores_for(
    daily: pd.DataFrame, names: dict[str, str], theme: str
) -> list[dict[str, object]]:
    """주어진 일별 시계열(주제/세그먼트)로 예측한다."""
    return predict_from_features(latest_features_from_daily(daily, names), theme)

