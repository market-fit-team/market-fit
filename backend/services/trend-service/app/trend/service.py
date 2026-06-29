from __future__ import annotations

from typing import cast

from app.core.config import settings
from app.models.commercial_trend.runtime import get_banner_sections
from app.trend.contracts import (
    TrendForecastBanner,
    TrendForecastCta,
    TrendForecastMetric,
    TrendForecastTheme,
)

# 주제당 노출할 상권 수
TOP_N = 3

# 노출 순서와 라벨. 각 세그먼트에 '곧 뜰(예측)'과 '요즘 뜨는(실측)'을 함께 담는다.
SEGMENT_THEMES = [
    ("combined", "전체"),
    ("male", "남성"),
    ("female", "여성"),
    ("youth", "20·30대"),
]


def _forecast_phrase(signals: dict[str, float]) -> str:
    """예측 카드의 짧은 전망 문구. forward-slope 모델 피처 신호로 갈라 적는다."""
    accel = signals.get("accel", 0.0)
    recent = signals.get("recent_vs_win", 0.0)
    vol = signals.get("vol", 0.0)
    if accel > 0:
        return "반등 시작"
    if recent < -0.01:
        return "저점 회복 흐름"
    if vol < 0.02:
        return "안정적 상승 전망"
    return "상승 전망"


def _forecast_description(signals: dict[str, float]) -> str:
    """예측 카드에 붙이는 짧은 근거 문구. 강한 신호 2개를 골라 자연어로 조합한다."""
    accel = signals.get("accel", 0.0)
    recent = signals.get("recent_vs_win", 0.0)
    vol = signals.get("vol", 0.0)
    excess = signals.get("excess_slope", 0.0)
    scale = signals.get("scale_pct", 0.0)
    vitality = signals.get("comm_night_ratio", 0.0)
    vitality_trend = signals.get("ratio_trend", 0.0)
    mom = signals.get("mom4", 0.0)

    clauses: list[tuple[float, str]] = []
    if accel > 0:
        clauses.append((3.0 + accel, "유입 흐름이 전보다 빠르게 좋아지는"))
    if recent < -0.01:
        clauses.append((2.8 + abs(recent), "잠잠했던 유입이 다시 살아나는"))
    if vol < 0.02:
        clauses.append((2.6 + (0.02 - vol), "흔들림이 작아 흐름이 안정적인"))
    if excess > 0:
        clauses.append((2.4 + excess, "서울 평균보다 흐름이 앞서는"))
    if vitality >= 1.05:
        clauses.append((2.2 + vitality / 10, "상업시간대 유입 비중이 강한"))
    if vitality_trend > 0:
        clauses.append((2.0 + vitality_trend, "상권성도 함께 개선되는"))
    if mom > 0:
        clauses.append((1.8 + mom, "전보다 유입 체력이 붙는"))
    if 0 < scale < 0.65:
        clauses.append((1.6 + (0.65 - scale), "현재 규모보다 변화 가능성이 돋보이는"))
    elif scale >= 0.8:
        clauses.append((1.6 + scale / 10, "기본 유입 규모도 뒷받침되는"))

    if not clauses:
        return "유입 증가 가능성을 높게 본 상권입니다."

    selected = [clause for _, clause in sorted(clauses, reverse=True)[:2]]
    if len(selected) == 1:
        return f"{selected[0]} 상권입니다."
    return f"{selected[0]} 상권으로, {selected[1]} 후보입니다."


def _popular_description(pick: dict[str, object], index: int) -> str:
    """인기 카드 설명. 점수는 숨기고 순위와 상권성만 말로 풀어 쓴다."""
    vitality = float(pick.get("vitality", 0.0))
    if index == 0 and vitality >= 1.15:
        return "상업시간대 유입이 가장 두드러지고, 상권 성격도 강하게 나타납니다."
    if index == 0:
        return "상업시간대 생활인구가 가장 크게 잡힌 상권입니다."
    if vitality >= 1.15:
        return "야간보다 상업시간대 유입이 뚜렷한 상권입니다."
    if index == 1:
        return "상업시간대 유입이 꾸준히 높은 상위권 상권입니다."
    return "생활인구 규모가 안정적으로 상위권에 머무는 상권입니다."


def _predicted_metrics(picks: list[dict[str, object]]) -> list[TrendForecastMetric]:
    """검증된 forward-slope 모델의 '곧 뜰 동네' 상위 N.

    미래 예측이라 현재 절대값(생활인구 등)은 보여주지 않는다. 모델은 절대 인원이 아니라
    상대적 상승 가능성을 예측하므로, 전망 문구와 짧은 설명만 노출한다.
    """
    metrics: list[TrendForecastMetric] = []
    for pick in picks[:TOP_N]:
        signals = cast(dict[str, float], pick.get("signals", {}))
        phrase = _forecast_phrase(signals)
        metrics.append(
            TrendForecastMetric(
                label=str(pick["area_name"]),
                value=phrase,
                description=_forecast_description(signals),
            )
        )
    return metrics


def _popular_metrics(picks: list[dict[str, object]]) -> list[TrendForecastMetric]:
    """상업시간대 실측 규모 상위 '지금 인기 상권'. 순위만 노출(이름의 정렬 순서 = 순위).

    level은 '최근 4주 낮시간대 평균 생활인구(추정·존재)'라 실시간도 유동인구도 아니어서 그대로
    노출하면 오해를 부른다. 그래서 절대 인원·비율은 보여주지 않고, 순위(리스트 순서)만 남긴다.
    """
    return [
        TrendForecastMetric(
            label=str(pick["area_name"]),
            value="",
            description=_popular_description(pick, index),
        )
        for index, pick in enumerate(picks[:TOP_N])
    ]


def build_banner(data_mode: str | None = None) -> TrendForecastBanner:
    """주제별 배너 DTO. 전체·남성·여성·20·30대 각각 예측(곧 뜰)+인기(요즘 뜨는)."""
    mode = data_mode or settings.data_mode
    sections = get_banner_sections(mode)
    forecast = sections["forecast"]
    popular = sections["popular"]

    themes: list[TrendForecastTheme] = []
    for key, label in SEGMENT_THEMES:
        predicted = _predicted_metrics(forecast.get(key, []))
        pop = _popular_metrics(popular.get(key, []))
        if predicted or pop:
            themes.append(TrendForecastTheme(key=key, label=label, predicted=predicted, popular=pop))

    predicted_combined = themes[0].predicted if themes else []
    if predicted_combined:
        title = f"앞으로 주목할 동네, {predicted_combined[0].label}"
    else:
        title = "뚜렷한 반등 상권이 아직 보이지 않습니다."

    return TrendForecastBanner(
        eyebrow="AI 트렌드 예측",
        title=title,
        description="AI가 고른 '곧 뜰 동네'와, 요즘 실제로 사람이 몰리는 동네를 함께 보여줍니다.",
        primary_cta=TrendForecastCta(label="상권 지도에서 검증하기", href="/map"),
        secondary_cta=TrendForecastCta(label="성향 분석 먼저 하기", href="/onboarding"),
        metrics=predicted_combined,
        themes=themes,
    )
