from __future__ import annotations

from pathlib import Path

import holidays
import numpy as np
import pandas as pd

# 한국 공휴일(음력 환산 포함: 설날·추석·부처님오신날, 대체공휴일). 외부 API 없이 내부 생성.
_KR_HOLIDAYS = holidays.SouthKorea()

# app/models/commercial_trend/features.py -> parents[3] == 서비스 루트
SERVICE_ROOT = Path(__file__).resolve().parents[3]
SAMPLE_DIR = SERVICE_ROOT / ".sample"
RAW_DIR = SERVICE_ROOT / ".raw"
ARTIFACTS_DIR = SERVICE_ROOT / ".artifacts"
# LightGBM 부스터(텍스트 포맷)와 메타데이터(JSON)를 분리 저장한다.
MODEL_FILE = ARTIFACTS_DIR / "commercial_trend.lgb"
META_FILE = ARTIFACTS_DIR / "commercial_trend.meta.json"

# 월별 생활인구 원본 파일 패턴(예: LOCAL_PEOPLE_DONG_202604.csv). 폴더 내 모든 달치를 읽는다.
LIVING_GLOB = "LOCAL_PEOPLE_DONG_*.csv"
# 구버전 단일 샘플 파일(폴백용)
LIVING_FILE = "living_population_hdong_domestic.sample.csv"
HDONG_NAME_FILE = "hdong_code_name.sample.csv"
# 생활인구 원본 컬럼 위치(고정 스키마): 0=기준일ID, 2=행정동코드, 3=총생활인구수.
# 헤더가 줄 끝 구분자 탓에 한 칸 밀릴 수 있어, 이름 대신 위치로 읽어 어긋남을 피한다.
_LIVING_USECOLS = [0, 2, 3]

# 피처 윈도우(최근 N일)와 예측 지평(향후 N일)
WINDOW_DAYS = 28
HORIZON_DAYS = 7

# 모두 생활인구 단일 시계열에서 파생한 피처. 실데이터/다변량(매출·검색량 등)이 들어오면
# compute_window_features에 키를 추가하고 이 목록에 이름만 더하면 파이프라인 전체가 따라온다.
FEATURE_NAMES = [
    "slope_28",  # 28일 추세 기울기(평균 대비)
    "slope_7",  # 최근 7일 추세 기울기(단기)
    "trend_accel",  # 단기-장기 기울기 차(가속/감속)
    "wow_change",  # 최근 7일 대 직전 7일
    "mom_change",  # 최근 14일 대 직전 14일
    "recent_vs_prior",  # 최근 7일 대 28일 평균
    "volatility",  # 변동성(표준편차/평균)
    "weekend_ratio",  # 주말/평일 유입 비율
    "forecast_weekend_count",  # 예측 창(다음 7일)의 주말 수
    "forecast_holiday_count",  # 예측 창(다음 7일)의 공휴일 수
]


def read_csv_auto(path: Path, **kwargs: object) -> pd.DataFrame:
    """상권분석 원본은 cp949/euc-kr로 내려오기도 해서 인코딩을 차례로 시도한다."""
    for encoding in ("utf-8-sig", "utf-8", "cp949"):
        try:
            return pd.read_csv(path, encoding=encoding, **kwargs)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, **kwargs)


def _data_dir(data_mode: str) -> Path:
    if data_mode == "sample":
        return SAMPLE_DIR
    if data_mode == "raw":
        return RAW_DIR
    raise ValueError("data_mode must be 'sample' or 'raw'")


def load_hdong_names_csv(path: Path) -> dict[str, str]:
    """행정동 코드 -> 이름 매핑(CSV). 배너 라벨에 사용한다."""
    if not path.exists():
        return {}
    frame = read_csv_auto(path, dtype=str)
    return dict(zip(frame["행정동코드"].astype(str), frame["행정동명"].astype(str)))


def _living_files(data_dir: Path) -> list[Path]:
    """data_dir 안의 월별 생활인구 파일 목록. 없으면 구버전 단일 파일로 폴백."""
    files = sorted(data_dir.glob(LIVING_GLOB))
    if files:
        return files
    legacy = data_dir / LIVING_FILE
    return [legacy] if legacy.exists() else []


def load_daily_population_csv(data_dir: Path) -> pd.DataFrame:
    """data_dir의 월별 생활인구 CSV를 모두 읽어 (행정동, 일자) 일 단위 시계열로 합친다.

    원본은 시간대별 24행이라 (행정동, 일자)로 합산하고, 여러 달치를 이어 붙여 연속
    시계열을 만든다(학습 윈도우 확보). 컬럼은 위치 기준으로 읽어 헤더 밀림을 피한다.
    반환: columns=[area_code, date, population], date 오름차순 정렬.
    """
    files = _living_files(data_dir)
    if not files:
        raise FileNotFoundError(f"생활인구 CSV가 없다: {data_dir}/{LIVING_GLOB}")

    parts: list[pd.DataFrame] = []
    for path in files:
        raw = read_csv_auto(path, header=None, skiprows=1, usecols=_LIVING_USECOLS, dtype=str)
        raw.columns = ["date", "area_code", "population"]
        parts.append(raw)

    merged = pd.concat(parts, ignore_index=True)
    frame = pd.DataFrame(
        {
            "area_code": merged["area_code"].astype(str),
            "date": pd.to_datetime(merged["date"].astype(str), format="%Y%m%d"),
            "population": pd.to_numeric(merged["population"], errors="coerce").fillna(0.0),
        }
    )
    daily = (
        frame.groupby(["area_code", "date"], as_index=False)["population"].sum().sort_values(["area_code", "date"])
    )
    return daily


def load_hdong_names(data_mode: str = "sample") -> dict[str, str]:
    """행정동 코드 -> 이름 매핑. data_mode에 따라 CSV 또는 DB에서 읽는다."""
    if data_mode == "db":
        from app.trend.repository import load_hdong_names_db

        return load_hdong_names_db()
    return load_hdong_names_csv(_data_dir(data_mode) / HDONG_NAME_FILE)


def load_daily_population(data_mode: str = "sample") -> pd.DataFrame:
    """행정동별 일자별 총생활인구 시계열. data_mode에 따라 CSV 또는 DB에서 읽는다."""
    if data_mode == "db":
        from app.trend.repository import load_daily_population_db

        return load_daily_population_db()
    return load_daily_population_csv(_data_dir(data_mode))


def _series_for_area(daily: pd.DataFrame, area_code: str) -> pd.Series:
    rows = daily[daily["area_code"] == area_code]
    return pd.Series(rows["population"].to_numpy(), index=pd.DatetimeIndex(rows["date"]))


def _slope(values: np.ndarray, mean: float) -> float:
    """평균 대비 선형 추세 기울기. 표본이 2개 미만이면 0."""
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values), dtype=float)
    return float(np.polyfit(x, values, 1)[0]) / mean


def _forecast_calendar(asof: pd.Timestamp) -> tuple[int, int]:
    """as-of 다음날부터 HORIZON_DAYS일(예측 창)의 (주말 수, 공휴일 수)."""
    weekend = 0
    holiday = 0
    for offset in range(1, HORIZON_DAYS + 1):
        day = asof + pd.Timedelta(days=offset)
        if day.weekday() >= 5:
            weekend += 1
        if day.date() in _KR_HOLIDAYS:
            holiday += 1
    return weekend, holiday


def compute_window_features(window: pd.Series) -> dict[str, float]:
    """최근 WINDOW_DAYS 구간의 시계열에서 트렌드 피처를 뽑는다."""
    values = window.to_numpy(dtype=float)
    mean = float(values.mean()) or 1.0

    forecast_weekend_count, forecast_holiday_count = _forecast_calendar(window.index[-1])

    slope_28 = _slope(values, mean)
    slope_7 = _slope(values[-7:], mean)

    last7 = values[-7:]
    prev7 = values[-14:-7]
    last14 = values[-14:]
    prev14 = values[-28:-14]

    wow_change = float(last7.mean() / (prev7.mean() or 1.0) - 1.0)
    mom_change = float(last14.mean() / (prev14.mean() or 1.0) - 1.0)
    recent_vs_prior = float(last7.mean() / mean - 1.0)
    volatility = float(values.std() / mean)

    weekday = window.index.weekday
    weekend_vals = values[weekday >= 5]
    weekday_vals = values[weekday < 5]
    if len(weekend_vals) and len(weekday_vals):
        weekend_ratio = float(weekend_vals.mean() / (weekday_vals.mean() or 1.0) - 1.0)
    else:
        weekend_ratio = 0.0

    return {
        "slope_28": slope_28,
        "slope_7": slope_7,
        "trend_accel": slope_7 - slope_28,
        "wow_change": wow_change,
        "mom_change": mom_change,
        "recent_vs_prior": recent_vs_prior,
        "volatility": volatility,
        "weekend_ratio": weekend_ratio,
        "forecast_weekend_count": float(forecast_weekend_count),
        "forecast_holiday_count": float(forecast_holiday_count),
    }


def build_training_samples(
    data_mode: str = "sample",
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """과거 시계열을 슬라이딩하며 (피처 윈도우 -> 향후 증감) 지도학습 샘플을 만든다.

    반환: (features, labels, asof_dates)
    asof_dates는 각 표본의 기준 시점(윈도우 마지막 날)이며, 시간순 검증 분할에 쓴다.
    """
    daily = load_daily_population(data_mode)
    feature_rows: list[list[float]] = []
    labels: list[float] = []
    asof_dates: list[np.datetime64] = []

    for area_code in daily["area_code"].unique():
        series = _series_for_area(daily, area_code)
        n = len(series)
        # as-of 시점 t: 과거 WINDOW_DAYS + 향후 HORIZON_DAYS가 모두 존재해야 한다.
        for t in range(WINDOW_DAYS - 1, n - HORIZON_DAYS):
            window = series.iloc[t - WINDOW_DAYS + 1 : t + 1]
            forward = series.iloc[t + 1 : t + 1 + HORIZON_DAYS].to_numpy(dtype=float)
            base = window.to_numpy(dtype=float)[-7:].mean() or 1.0
            label = float(forward.mean() / base - 1.0)

            feats = compute_window_features(window)
            feature_rows.append([feats[name] for name in FEATURE_NAMES])
            labels.append(label)
            asof_dates.append(np.datetime64(series.index[t]))

    return (
        np.asarray(feature_rows, dtype=float),
        np.asarray(labels, dtype=float),
        np.asarray(asof_dates, dtype="datetime64[ns]"),
    )


def latest_features_from_daily(daily: pd.DataFrame, names: dict[str, str]) -> pd.DataFrame:
    """주어진 일별 시계열에서 행정동별 최신 시점 피처를 만든다(주제/세그먼트 공용)."""
    rows: list[dict[str, object]] = []
    for area_code in daily["area_code"].unique():
        series = _series_for_area(daily, area_code)
        if len(series) < WINDOW_DAYS:
            continue
        window = series.iloc[-WINDOW_DAYS:]
        feats = compute_window_features(window)
        rows.append(
            {
                "area_code": area_code,
                "area_name": names.get(area_code, area_code),
                **feats,
            }
        )
    return pd.DataFrame(rows)


def build_latest_features(data_mode: str = "sample") -> pd.DataFrame:
    """행정동별 최신 시점 기준 피처(전체 생활인구). 추론 입력으로 쓴다."""
    return latest_features_from_daily(load_daily_population(data_mode), load_hdong_names(data_mode))


# ---- 주제(세그먼트)별 시계열 ----
# 생활인구 원본 컬럼 위치로 정의(헤더 밀림 회피). 유동인구 등 다른 데이터는 섞지 않는다.
SEGMENT_POSITIONS: dict[str, list[int]] = {
    "all": [3],  # 총생활인구
    "male": list(range(4, 18)),  # 남자 전 연령(4~17)
    "female": list(range(18, 32)),  # 여자 전 연령(18~31)
    "youth": [7, 8, 9, 10, 21, 22, 23, 24],  # 남녀 20~39세
}
# 저녁 주제: 총생활인구를 17~21시(시간대구분 컬럼=위치 1)만 합산한다.
EVENING_HOURS = {"17", "18", "19", "20", "21"}


def _segment_data_dir(data_mode: str) -> Path:
    # 세그먼트 합산은 원본 CSV에서만 가능(DB엔 총합만 적재). db 모드면 실데이터 폴더(.raw)를 본다.
    return RAW_DIR if data_mode == "db" else _data_dir(data_mode)


def load_segment_dailies(data_mode: str = "sample") -> dict[str, pd.DataFrame]:
    """CSV를 한 번만 읽어 전체/남성/여성/청년 일별 시계열을 함께 만든다.

    반환: {segment: DataFrame[area_code, date, population]}
    """
    files = _living_files(_segment_data_dir(data_mode))
    if not files:
        raise FileNotFoundError("생활인구 CSV가 없어 세그먼트를 만들 수 없다")

    value_positions = sorted({pos for positions in SEGMENT_POSITIONS.values() for pos in positions})
    usecols = sorted({0, 1, 2, *value_positions})  # 1=시간대구분(저녁 필터용)

    parts: list[pd.DataFrame] = []
    for path in files:
        raw = read_csv_auto(path, header=None, skiprows=1, usecols=usecols, dtype=str)
        numeric = raw[value_positions].apply(pd.to_numeric, errors="coerce")
        record = {"area_code": raw[2].astype(str), "date": raw[0].astype(str), "hour": raw[1].astype(str)}
        for segment, positions in SEGMENT_POSITIONS.items():
            record[segment] = numeric[positions].sum(axis=1)
        parts.append(pd.DataFrame(record))

    merged = pd.concat(parts, ignore_index=True)
    merged["date"] = pd.to_datetime(merged["date"], format="%Y%m%d")

    def _daily(frame: pd.DataFrame, column: str) -> pd.DataFrame:
        return (
            frame.groupby(["area_code", "date"], as_index=False)[column]
            .sum()
            .rename(columns={column: "population"})
            .sort_values(["area_code", "date"])
        )

    dailies: dict[str, pd.DataFrame] = {segment: _daily(merged, segment) for segment in SEGMENT_POSITIONS}
    # 저녁 인기: 총생활인구를 17~21시만 합산
    dailies["evening"] = _daily(merged[merged["hour"].isin(EVENING_HOURS)], "all")
    return dailies
