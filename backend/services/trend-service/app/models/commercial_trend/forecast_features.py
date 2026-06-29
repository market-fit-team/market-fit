"""검증된 '곧 뜰 동네' 예측(forward-slope) 모델의 공통 피처·표본 로직.

학습(forecast_train)과 추론(forecast_predict)이 함께 쓴다. 모델/누수 설계 근거:
- 정직 라벨: 전방 N주 기울기의 '서울평균 초과' 성분 z점수에서 변동성 z점수를 뺀 값.
  (YoY 라벨은 '관측 가능한 작년치' 역산이라 폐기했다. 이 라벨은 미래에만 의존한다.)
- 트레일링 피처는 모두 결정 시점 t까지의 과거만 참조한다(누수 없음).
- Q40: 평소 '주말 포함' 생활인구 하위 40% 동은 후보에서 제외(변두리 스파이크 차단).
- 모델 성격은 '역추세'다: 최근 막 오른 동네가 아니라, 잠잠하지만 다음 N주 오를 동네를 고른다.
  → 배너 문구는 '지금 뜨는'이 아니라 '곧 뜰(다음 N주)'로 표기해야 정직하다.

검증(워크포워드, 재현: `python -m app.models.commercial_trend.backtest`): 네 세그먼트(검증 58~62주) 모두
무작위·전기 트레일링기울기 기준을 퍼뮤테이션(5000회) p≈0.0002로 둘 다 이긴다. 트레일링 기준의 전방 rank IC는
음수라 '역추세'가 코드로 확인된다(모델 IC ≈0.40~0.49).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.models.commercial_trend.time_of_day import load_commercial_dailies, load_night_dailies

# 세그먼트별 지속성(기울기) 윈도우[주]. youth는 표본이 적고 계절성이 커 길게 본다.
TREND_WEEKS: dict[str, int] = {"combined": 8, "male": 8, "female": 8, "youth": 12}
# 전방 예측 지평[주]. 4주는 노이즈가 커 평균회귀에 묻혔고, 8주에서 신호가 안정됐다.
FORWARD_WEEKS = 8
# 규모 필터: 평소 생활인구 하위 비율 제외.
SCALE_FILTER_Q = 0.40
# 변동성 패널티 가중치(라벨 구성).
VOL_PENALTY = 1.0
# 노출 후보 수.
TOP_N = 3
# 결정주가 후보로 인정받는 최소 적격 동 수(횡단면 z가 의미 있으려면 충분해야 한다).
MIN_ELIGIBLE = 50

FORECAST_FEATURES = [
    "slope_trend",  # 트레일링 N주 정규화 기울기(상업시간대)
    "slope_4",  # 최근 4주 기울기
    "accel",  # 단기-장기 기울기 차
    "wow",  # 직전주 대비
    "mom4",  # 최근 4주 vs 직전 4주
    "recent_vs_win",  # 최근주 vs 윈도우 평균
    "vol",  # 주간 증감 변동성
    "excess_slope",  # 기울기 - 서울 평균 기울기(횡단면)
    "log_level",  # 규모(로그)
    "scale_pct",  # 규모 횡단면 백분위
    "comm_night_ratio",  # 상권성(상업/야간) — 검증에서 예측 기여 확인
    "ratio_trend",  # 상권성 추세
]


def _weekly(daily: pd.DataFrame) -> pd.DataFrame:
    """일별 [area_code,date,population] -> 주별 [week x area_code] (주평균)."""
    frame = daily.copy()
    frame["week"] = frame["date"].dt.to_period("W-SUN").dt.start_time
    return frame.groupby(["week", "area_code"])["population"].mean().unstack("area_code").sort_index()


def _slope_norm(values: np.ndarray) -> float:
    """평균 대비 정규화 OLS 기울기(주당 성장률)."""
    if len(values) < 2:
        return 0.0
    mean = values.mean()
    if mean == 0:
        return 0.0
    return float(np.polyfit(np.arange(len(values), dtype=float), values, 1)[0]) / mean


def _vol(values: np.ndarray) -> float:
    """주간 증감률(pct change)의 표준편차."""
    if len(values) < 2:
        return 0.0
    pct = np.diff(values) / np.where(values[:-1] == 0, np.nan, values[:-1])
    pct = pct[~np.isnan(pct)]
    return float(np.std(pct)) if len(pct) else 0.0


def _zscore(series: pd.Series) -> pd.Series:
    sd = series.std(ddof=0)
    if sd == 0 or np.isnan(sd):
        return pd.Series(0.0, index=series.index)
    return (series - series.mean()) / sd


def _eligible(weekly: pd.DataFrame, i: int, n_trend: int, *, need_forward: bool) -> list[str]:
    """결정주 i에서 윈도우·(필요시)전방 결측이 없고 규모 하위 Q를 통과한 동들."""
    current, previous = weekly.iloc[i], weekly.iloc[i - 1]
    window = weekly.iloc[i - n_trend + 1 : i + 1]
    valid = [a for a in window.dropna(axis=1).columns if not (np.isnan(current[a]) or np.isnan(previous[a]))]
    if need_forward:
        forward = weekly.iloc[i + 1 : i + 1 + FORWARD_WEEKS]
        valid = [a for a in valid if not forward[a].isna().any()]
    if len(valid) < MIN_ELIGIBLE:
        return []
    usual = window.mean(axis=0)[valid]
    return list(usual[usual >= usual.quantile(SCALE_FILTER_Q)].index)


def _features(weekly: pd.DataFrame, i: int, n_trend: int, areas: list[str], ratio: pd.DataFrame) -> pd.DataFrame:
    """결정주 i 기준 트레일링 피처(모두 t까지의 과거만). ratio=상권성(상업/야간) 주별 패널."""
    window = weekly.iloc[i - n_trend + 1 : i + 1]
    slopes = pd.Series({a: _slope_norm(window[a].to_numpy()) for a in areas})
    seoul_slope = slopes.mean()
    ratio_window = ratio.iloc[i - n_trend + 1 : i + 1]
    rows: dict[str, dict[str, float]] = {}
    for area in areas:
        col = window[area].to_numpy(dtype=float)
        mean = col.mean() or 1.0
        slope4 = _slope_norm(col[-4:])
        last4 = col[-4:].mean()
        prev4 = col[-8:-4].mean() if len(col) >= 8 else (col[:-4].mean() if len(col) > 4 else last4)
        ratio_col = ratio_window[area].to_numpy(dtype=float)
        ratio_col = ratio_col[~np.isnan(ratio_col)]
        rows[area] = {
            "slope_trend": slopes[area],
            "slope_4": slope4,
            "accel": slope4 - slopes[area],
            "wow": float(col[-1] / col[-2] - 1.0) if col[-2] else 0.0,
            "mom4": float(last4 / prev4 - 1.0) if prev4 else 0.0,
            "recent_vs_win": float(col[-1] / mean - 1.0),
            "vol": _vol(col),
            "excess_slope": slopes[area] - seoul_slope,
            "log_level": float(np.log1p(mean)),
            "comm_night_ratio": float(ratio.iloc[i][area]) if not np.isnan(ratio.iloc[i][area]) else 0.0,
            "ratio_trend": _slope_norm(ratio_col),
        }
    frame = pd.DataFrame(rows).T
    frame["scale_pct"] = window.mean(axis=0)[areas].rank(pct=True)
    return frame[FORECAST_FEATURES].fillna(0.0)


def _forward_label(weekly: pd.DataFrame, i: int, areas: list[str]) -> pd.Series:
    """전방 FORWARD_WEEKS주 상승세(서울 초과 기울기 z - 변동성 z). 학습 타깃."""
    forward = weekly.iloc[i + 1 : i + 1 + FORWARD_WEEKS]
    slopes = pd.Series({a: _slope_norm(forward[a].to_numpy()) for a in areas})
    vols = pd.Series({a: _vol(forward[a].to_numpy()) for a in areas})
    return _zscore(slopes - slopes.mean()) - VOL_PENALTY * _zscore(vols)


def build_panels(data_mode: str = "db") -> dict[str, tuple[pd.DataFrame, pd.DataFrame]]:
    """세그먼트별 (상업시간대 주별 패널, 상권성 비율 패널)을 만든다.

    ratio = 상업시간대/야간(상권성). 비율 패널은 weekly와 같은 인덱스/컬럼으로 정렬한다.
    """
    commercial = load_commercial_dailies(data_mode)
    night = load_night_dailies(data_mode)
    panels: dict[str, tuple[pd.DataFrame, pd.DataFrame]] = {}
    for segment in commercial:
        weekly = _weekly(commercial[segment])
        weekly_night = _weekly(night[segment]).reindex(index=weekly.index, columns=weekly.columns)
        ratio = (weekly / weekly_night).replace([np.inf, -np.inf], np.nan)
        panels[segment] = (weekly, ratio)
    return panels


def enough_history(weekly: pd.DataFrame, segment: str) -> bool:
    """학습에 필요한 최소 주 수(트레일링 윈도우 + 전방 라벨 지평 + 1)를 만족하는지."""
    return len(weekly) >= TREND_WEEKS[segment] + FORWARD_WEEKS + 1


def enough_history_for_predict(weekly: pd.DataFrame, segment: str) -> bool:
    """예측에 필요한 최소 주 수. 추론은 전방 라벨이 필요 없어 트레일링 윈도우만 본다.

    덕분에 콜드스타트 요구가 (윈도우+전방+1)에서 (윈도우+1)로 줄어, 최근 데이터만으로도 예측이 뜬다.
    """
    return len(weekly) >= TREND_WEEKS[segment] + 1


def build_segment_samples(
    weekly: pd.DataFrame, n_trend: int, ratio: pd.DataFrame
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """전방 라벨이 존재하는 모든 결정주(확장 윈도우)의 (X, y, 결정주 인덱스)를 만든다.

    week_index는 시간순 홀드아웃 분할에 쓴다(같은 결정주의 횡단면 표본을 함께 묶기 위함).
    """
    last = len(weekly) - 1
    rows: list[np.ndarray] = []
    labels: list[np.ndarray] = []
    weeks: list[np.ndarray] = []
    for i in range(n_trend - 1, last - FORWARD_WEEKS + 1):
        areas = _eligible(weekly, i, n_trend, need_forward=True)
        if len(areas) < TOP_N:
            continue
        feats = _features(weekly, i, n_trend, areas, ratio)[FORECAST_FEATURES].to_numpy(float)
        rows.append(feats)
        labels.append(_forward_label(weekly, i, areas).to_numpy(float))
        weeks.append(np.full(len(areas), i, dtype=int))
    if not rows:
        empty = np.empty((0, len(FORECAST_FEATURES)))
        return empty, np.empty(0), np.empty(0, dtype=int)
    return np.vstack(rows), np.concatenate(labels), np.concatenate(weeks)


def latest_segment_features(
    weekly: pd.DataFrame, n_trend: int, ratio: pd.DataFrame
) -> tuple[list[str], pd.DataFrame, pd.Series] | None:
    """최신 주(as-of) 기준 후보 동·피처·현재 규모. 후보가 모자라면 None."""
    last = len(weekly) - 1
    areas = _eligible(weekly, last, n_trend, need_forward=False)
    if len(areas) < TOP_N:
        return None
    feats = _features(weekly, last, n_trend, areas, ratio)
    current = weekly.iloc[last]  # 최신 주 상업시간대 생활인구(현재 규모 표시용)
    return areas, feats, current
