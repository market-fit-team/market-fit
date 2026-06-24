from __future__ import annotations

import time
from datetime import datetime, timezone

from app.models.commercial_trend.features import MODEL_FILE
from app.models.commercial_trend.predict import load_meta
from app.models.commercial_trend.train import train

# 주제별 추론 결과 캐시. 배너는 자주 안 바뀌어도 되므로 일정 시간 재사용한다.
_CACHE_TTL_SECONDS = 60 * 60
_theme_cache: dict[str, object] = {"at": 0.0, "rankings": None}


def ensure_model(data_mode: str = "sample") -> None:
    """부스터가 없으면 학습한다. 서비스 부팅 시 호출한다."""
    if not MODEL_FILE.exists():
        train(data_mode)


def _compute_theme_rankings(data_mode: str) -> dict[str, list[dict[str, object]]]:
    """CSV 한 번 읽어 전체/남성/여성/20·30대/저녁 세그먼트별 예측 랭킹을 만든다."""
    ensure_model(data_mode)
    from app.models.commercial_trend.features import load_hdong_names, load_segment_dailies
    from app.models.commercial_trend.predict import predict_trend_scores_for

    names = load_hdong_names(data_mode)
    dailies = load_segment_dailies(data_mode)
    return {segment: predict_trend_scores_for(daily, names, segment) for segment, daily in dailies.items()}


def refresh_theme_rankings(data_mode: str = "sample") -> dict[str, list[dict[str, object]]]:
    """주제별 예측을 다시 계산한다. db 모드면 trend_score에 저장한다(배치/최초 채움용)."""
    rankings = _compute_theme_rankings(data_mode)
    if data_mode == "db":
        from app.models.commercial_trend.features import latest_source_stat_date
        from app.trend.repository import save_theme_scores

        save_theme_scores(rankings, datetime.now(timezone.utc), latest_source_stat_date(data_mode))
    _theme_cache["rankings"] = rankings
    _theme_cache["at"] = time.time()
    return rankings


def get_theme_rankings(data_mode: str = "sample", use_cache: bool = True) -> dict[str, list[dict[str, object]]]:
    """주제별 예측 랭킹. db 모드는 배치가 저장한 최신 결과를 읽고, 비적재 모드는 즉석 계산한다."""
    now = time.time()
    if use_cache and _theme_cache["rankings"] is not None and now - float(_theme_cache["at"]) < _CACHE_TTL_SECONDS:
        return _theme_cache["rankings"]  # type: ignore[return-value]

    if data_mode == "db":
        from app.trend.repository import load_latest_theme_scores

        rankings = load_latest_theme_scores()
        if not rankings:  # 최초 부팅 등 비어 있으면 계산+저장
            rankings = refresh_theme_rankings(data_mode)
    else:
        rankings = _compute_theme_rankings(data_mode)

    _theme_cache["rankings"] = rankings
    _theme_cache["at"] = now
    return rankings


def evaluation_payload() -> dict[str, object]:
    """헬스체크용 모델 적재 상태."""
    if not MODEL_FILE.exists():
        return {"model_id": "commercial-trend-lgbm", "loaded": False}
    meta = load_meta()
    return {
        "model_id": meta.get("model_id"),
        "loaded": True,
        "n_samples": meta.get("n_samples"),
        "validation": meta.get("validation"),
        "trained_at": meta.get("trained_at"),
    }
