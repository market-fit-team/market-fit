"""forward-slope 예측 모델 런타임 추론. 저장된 부스터를 읽어 '곧 뜰 동네'를 고른다.

학습은 하지 않는다(forecast_train이 만든 아티팩트를 로딩만 한다). 세그먼트별 부스터로
최신 주(as-of) 후보를 점수화해 상위 N을 반환한다.
"""

from __future__ import annotations

import json

import numpy as np

from app.models.commercial_trend.forecast_features import (
    FORECAST_FEATURES,
    TREND_WEEKS,
    build_panels,
    enough_history_for_predict,
    latest_segment_features,
)
from app.models.commercial_trend.paths import forecast_meta_file, forecast_model_file

# 노출 점수 표시 범위. 0~100 전체를 쓰면 최하위가 0점이라 어색해 보기 좋게 좁힌다.
_SCORE_MIN = 50.0
_SCORE_MAX = 99.0


def load_forecast_meta() -> dict[str, object]:
    meta_path = forecast_meta_file()
    if not meta_path.exists():
        raise FileNotFoundError(f"forward-slope 모델 메타가 없다: {meta_path}")
    return json.loads(meta_path.read_text(encoding="utf-8"))


def require_forecast_artifacts() -> dict[str, object]:
    """배너/배치 예측 전에 학습 메타와 피처 스키마, 부스터 존재를 확인한다."""
    meta = load_forecast_meta()
    if meta.get("feature_names") != FORECAST_FEATURES:
        raise ValueError("forward-slope 메타의 피처 스키마가 현재 예측 코드와 다르다.")
    trained = [seg for seg, info in meta.get("segments", {}).items() if isinstance(info, dict) and info.get("trained")]
    if not trained:
        raise FileNotFoundError("학습된 forward-slope 부스터가 없다(forecast_train 먼저 실행).")
    missing = [seg for seg in trained if not forecast_model_file(seg).exists()]
    if missing:
        raise FileNotFoundError(f"forward-slope 부스터 파일이 없다: {missing}")
    return meta


def _percentile(values: np.ndarray) -> np.ndarray:
    """횡단면 백분위(0~1)로 변환한다. min-max와 달리 이상치에 강하다."""
    n = len(values)
    if n == 1:
        return np.full(1, 0.5)
    order = np.argsort(values)
    ranks = np.empty(n, dtype=float)
    ranks[order] = np.arange(n, dtype=float)
    return ranks / (n - 1)


def _forecast_one(segment: str, weekly, ratio) -> list[dict[str, object]]:
    """한 세그먼트: 저장된 부스터로 최신 주 후보를 점수화해 내림차순 랭킹을 만든다."""
    import lightgbm as lgb

    if not enough_history_for_predict(weekly, segment):
        return []
    latest = latest_segment_features(weekly, TREND_WEEKS[segment], ratio)
    if latest is None:
        return []
    areas, feats, current = latest

    model_path = forecast_model_file(segment)
    if not model_path.exists():
        return []
    booster = lgb.Booster(model_file=str(model_path))
    outlook = np.asarray(booster.predict(feats[FORECAST_FEATURES].to_numpy(float)), dtype=float)
    score = np.round(_SCORE_MIN + (_SCORE_MAX - _SCORE_MIN) * _percentile(outlook)).astype(int)

    ranked = sorted(
        (
            {
                "area_code": area,
                "outlook": float(outlook[idx]),  # 전방 8주 상승세 기대(원점수)
                "score": int(score[idx]),  # 표시용 백분위 점수
                "pred_growth": float(outlook[idx]),  # trend_score 컬럼 재사용(상승세 점수)
                "level": float(current[area]),  # 현재 상업시간대 규모
                "signals": {name: float(feats.loc[area, name]) for name in FORECAST_FEATURES},
            }
            for idx, area in enumerate(areas)
        ),
        key=lambda item: item["outlook"],
        reverse=True,
    )
    return ranked


def compute_forecast_rankings(data_mode: str = "db") -> dict[str, list[dict[str, object]]]:
    """세그먼트별 '곧 뜰 동네(다음 8주)' 예측 랭킹. 키=combined/male/female/youth.

    상업시간대 시계열 + 상권성 신호로 학습된 저장 모델을 로딩해 추론만 한다.
    """
    panels = build_panels(data_mode)
    return {segment: _forecast_one(segment, weekly, ratio) for segment, (weekly, ratio) in panels.items()}
