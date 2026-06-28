from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd

from app.models.commercial_trend.paths import RAW_DIR, SAMPLE_DIR

# 월별 생활인구 원본 파일 패턴(예: LOCAL_PEOPLE_DONG_202604.csv). 폴더 내 모든 달치를 읽는다.
LIVING_GLOB = "LOCAL_PEOPLE_DONG_*.csv"
# 구버전 단일 샘플 파일(폴백용)
LIVING_FILE = "living_population_hdong_domestic.sample.csv"
HDONG_NAME_FILE = "hdong_code_name.sample.csv"


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
    return dict(zip(frame["행정동코드"].astype(str), frame["행정동명"].astype(str), strict=False))


def _living_files(data_dir: Path) -> list[Path]:
    """data_dir 안의 월별 생활인구 파일 목록. 없으면 구버전 단일 파일로 폴백."""
    files = sorted(data_dir.glob(LIVING_GLOB))
    if files:
        return files
    legacy = data_dir / LIVING_FILE
    return [legacy] if legacy.exists() else []


def load_hdong_names(data_mode: str = "sample") -> dict[str, str]:
    """행정동 코드 -> 이름 매핑. data_mode에 따라 CSV 또는 DB에서 읽는다."""
    if data_mode == "db":
        from app.trend.repository import load_hdong_names_db

        return load_hdong_names_db()
    return load_hdong_names_csv(_data_dir(data_mode) / HDONG_NAME_FILE)


# ---- 주제(세그먼트)별 시계열 ----
# 생활인구 원본 컬럼 위치로 정의(헤더 밀림 회피). 유동인구 등 다른 데이터는 섞지 않는다.
SEGMENT_POSITIONS: dict[str, list[int]] = {
    "combined": [3],  # 총생활인구
    "male": list(range(4, 18)),  # 남자 전 연령(4~17)
    "female": list(range(18, 32)),  # 여자 전 연령(18~31)
    "youth": [7, 8, 9, 10, 21, 22, 23, 24],  # 남녀 20~39세
}


def _segment_data_dir(data_mode: str) -> Path:
    # 세그먼트 합산은 원본 CSV에서만 가능하다. db 모드도 실데이터 폴더(.raw)를 본다.
    return RAW_DIR if data_mode == "db" else _data_dir(data_mode)


def latest_source_stat_date(data_mode: str = "sample") -> date | None:
    """원천 생활인구 CSV의 최신 기준일. trend_score의 예측 기준일 메타로 저장한다."""
    files = _living_files(_segment_data_dir(data_mode))
    if not files:
        return None

    latest: pd.Timestamp | None = None
    for path in files:
        raw = read_csv_auto(path, header=None, skiprows=1, usecols=[0], dtype=str)
        dates = pd.to_datetime(raw[0].astype(str), format="%Y%m%d", errors="coerce").dropna()
        if dates.empty:
            continue
        current = dates.max()
        latest = current if latest is None else max(latest, current)
    return None if latest is None else latest.date()
