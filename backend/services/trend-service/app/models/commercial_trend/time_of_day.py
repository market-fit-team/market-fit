"""시간대(상업시간/야간) 평균 생활인구 = 정제본(durable aggregate).

모델이 실제로 쓰는 건 (동,일)별 상업시간대(11~21) 평균·야간(0~5) 평균뿐이라, 이 정제본(~0.5MB/월)만 durable하게 둔다.
- 적재(fetch): 원시를 임시로 받아 일별 집계 → 정제본에 (동,일) upsert → 임시 원시 폐기.
- 학습/예측(batch): 정제본만 읽는다(원시 재처리 없음)
정제본은 시간대(11~21/0~5)·세그먼트 정의를 고정한다. 그 정의를 바꾸면 AGGREGATE_VERSION을 올려
원시(포털 재다운로드)에서 재생성한다.
"""

from __future__ import annotations

import json
import os
from datetime import date

import pandas as pd

from app.models.commercial_trend.features import (
    SEGMENT_POSITIONS,
    _living_files,
    _segment_data_dir,
    read_csv_auto,
)
from app.models.commercial_trend.paths import ARTIFACTS_DIR

COMMERCIAL_HOURS = {f"{hour:02d}" for hour in range(11, 22)}  # 11~21시
NIGHT_HOURS = {f"{hour:02d}" for hour in range(0, 6)}  # 0~5시

_COMMERCIAL_FILE = ARTIFACTS_DIR / "segment_commercial_dailies.csv.gz"
_NIGHT_FILE = ARTIFACTS_DIR / "segment_night_dailies.csv.gz"
# 집계 정의(시간대/세그먼트) 버전. 정의를 바꾸면 올려서 정제본을 원시에서 재생성한다.
AGGREGATE_VERSION = 1
# 정제본 보관 기간[일]. 학습은 2년 워크포워드로 검증했으니 그보다 오래된 건 안 쓴다 → 무한 증가 방지.
RETAIN_DAYS = 365 * 2

_VALUE_POSITIONS = sorted({pos for positions in SEGMENT_POSITIONS.values() for pos in positions})
_USECOLS = sorted({0, 1, 2, *_VALUE_POSITIONS})
_SEGMENTS = list(SEGMENT_POSITIONS)


def _aggregate_files(files: list, hours: set[str]) -> dict[str, pd.DataFrame]:
    """원시 CSV들에서 해당 시간대만 골라 (area, date)별 평균(동시 인원)을 세그먼트별로 만든다."""
    if not files:
        raise FileNotFoundError("생활인구 CSV가 없어 시간대 집계를 만들 수 없다")
    parts: list[pd.DataFrame] = []
    for path in files:
        raw = read_csv_auto(path, header=None, skiprows=1, usecols=_USECOLS, dtype=str)
        raw = raw[raw[1].isin(hours)]  # col1=시간대구분(00~23)
        numeric = raw[_VALUE_POSITIONS].apply(pd.to_numeric, errors="coerce")
        record = {"area_code": raw[2].astype(str), "date": raw[0].astype(str)}
        for segment, positions in SEGMENT_POSITIONS.items():
            record[segment] = numeric[positions].sum(axis=1)  # 시간별 세그먼트 인구
        frame = pd.DataFrame(record)
        # (area,date)별 해당 시간대 평균 = 동시 인원
        parts.append(frame.groupby(["area_code", "date"], as_index=False)[_SEGMENTS].mean())

    merged = pd.concat(parts, ignore_index=True)
    merged["date"] = pd.to_datetime(merged["date"], format="%Y%m%d")

    def _daily(column: str) -> pd.DataFrame:
        return (
            merged.groupby(["area_code", "date"], as_index=False)[column]
            .mean()
            .rename(columns={column: "population"})
            .sort_values(["area_code", "date"])
            .reset_index(drop=True)
        )

    return {segment: _daily(segment) for segment in _SEGMENTS}


def _build(hours: set[str], data_mode: str) -> dict[str, pd.DataFrame]:
    """data_mode의 모든 원시 CSV에서 집계(정제본 시드·재생성용)."""
    return _aggregate_files(_living_files(_segment_data_dir(data_mode)), hours)


def _meta_path(path):
    return path.with_suffix(path.suffix + ".meta.json")


def _latest_date(dailies: dict[str, pd.DataFrame]) -> str | None:
    dates = [frame["date"].max() for frame in dailies.values() if not frame.empty]
    return max(dates).date().isoformat() if dates else None


def _prune_old(dailies: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """최신일 기준 RETAIN_DAYS 이전 데이터를 버린다(정제본이 무한히 커지지 않게)."""
    iso = _latest_date(dailies)
    if iso is None:
        return dailies
    cutoff = pd.Timestamp(iso) - pd.Timedelta(days=RETAIN_DAYS)
    return {segment: frame[frame["date"] >= cutoff].reset_index(drop=True) for segment, frame in dailies.items()}


def _write_durable(path, dailies: dict[str, pd.DataFrame]) -> None:
    """정제본을 임시 파일에 쓰고 원자적으로 교체(중간에 죽어도 안 깨지게) + 메타 갱신."""
    dailies = _prune_old(dailies)  # 보관 한도(2년) 초과분은 저장 전에 버린다
    snapshot = pd.concat(
        [frame.assign(segment=segment) for segment, frame in dailies.items()], ignore_index=True
    )[["segment", "area_code", "date", "population"]]
    path.parent.mkdir(parents=True, exist_ok=True)
    # 데이터·메타 모두 고정 이름 .tmp에 쓰고 os.replace로 원자 교체한다.
    # 고정 이름이라 크래시로 남은 .tmp는 다음 실행이 덮어쓰고, 성공 시 replace가 소진해 누적되지 않는다.
    tmp = path.with_suffix(path.suffix + ".tmp")
    snapshot.to_csv(tmp, index=False, compression="gzip")
    os.replace(tmp, path)

    meta_path = _meta_path(path)
    meta_tmp = meta_path.with_suffix(meta_path.suffix + ".tmp")
    meta_tmp.write_text(
        json.dumps(
            {"version": AGGREGATE_VERSION, "latest_date": _latest_date(dailies)},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    os.replace(meta_tmp, meta_path)


def _read_durable(path) -> dict[str, pd.DataFrame] | None:
    """정제본을 읽어 {segment: df}. 파일/메타가 없거나 집계 버전이 다르면 None(재생성 신호)."""
    if not path.exists() or not _meta_path(path).exists():
        return None
    try:
        meta = json.loads(_meta_path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if meta.get("version") != AGGREGATE_VERSION:
        return None
    frame = read_csv_auto(path, dtype={"area_code": str, "segment": str}, parse_dates=["date"])
    return {
        segment: rows.drop(columns=["segment"]).sort_values(["area_code", "date"]).reset_index(drop=True)
        for segment, rows in frame.groupby("segment", sort=False)
    }


def _merge(existing: dict[str, pd.DataFrame], new: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """정제본 upsert: (area_code, date) 동일 키는 새 값으로 덮어쓰고 나머지는 유지한다."""
    out: dict[str, pd.DataFrame] = {}
    for segment in _SEGMENTS:
        old, fresh = existing.get(segment), new.get(segment)
        if old is None or old.empty:
            out[segment] = fresh
            continue
        if fresh is None or fresh.empty:
            out[segment] = old
            continue
        combined = pd.concat([old, fresh], ignore_index=True)  # fresh가 뒤 → keep='last'가 새 값 채택
        combined = combined.drop_duplicates(subset=["area_code", "date"], keep="last")
        out[segment] = combined.sort_values(["area_code", "date"]).reset_index(drop=True)
    return out


def upsert_from_csv(csv_path) -> dict[str, str | None]:
    """원시 월 CSV 한 개를 상업/야간 정제본에 (area, date) 기준으로 병합한다(없으면 새로 만든다)."""
    result: dict[str, str | None] = {}
    for kind, path, hours in (
        ("commercial", _COMMERCIAL_FILE, COMMERCIAL_HOURS),
        ("night", _NIGHT_FILE, NIGHT_HOURS),
    ):
        new = _aggregate_files([csv_path], hours)
        existing = _read_durable(path)
        merged = _merge(existing, new) if existing else new
        expected = _latest_date(merged)
        _write_durable(path, merged)
        # 저장 검증: 원자 교체 뒤 다시 읽어 파싱되고 최신일이 일치할 때만 성공으로 본다.
        verify = _read_durable(path)
        if verify is None or _latest_date(verify) != expected:
            raise RuntimeError(f"정제본 저장 검증 실패: {path.name}")
        result[kind] = expected
    return result


def _load(path, hours: set[str], data_mode: str) -> dict[str, pd.DataFrame]:
    """정제본을 읽는다. 없거나 버전이 다르면 원시에서 시드(전체 재생성)."""
    durable = _read_durable(path)
    if durable is not None:
        return durable
    dailies = _build(hours, data_mode)  # 시드: 원시 전체 → 정제본
    _write_durable(path, dailies)
    return dailies


def load_commercial_dailies(data_mode: str = "db") -> dict[str, pd.DataFrame]:
    """상업시간대(11~21시) 평균 일별 시계열(세그먼트별). 정제본 read, 없으면 원시에서 시드."""
    return _load(_COMMERCIAL_FILE, COMMERCIAL_HOURS, data_mode)


def load_night_dailies(data_mode: str = "db") -> dict[str, pd.DataFrame]:
    """야간(0~5시) 평균 일별 시계열(세그먼트별). 상권성 비율용. 정제본 read, 없으면 원시에서 시드."""
    return _load(_NIGHT_FILE, NIGHT_HOURS, data_mode)


def latest_aggregate_date() -> date | None:
    """상업 정제본의 최신 기준일. batch의 '새 데이터 있나' 판정과 예측 as_of 메타로 쓴다."""
    durable = _read_durable(_COMMERCIAL_FILE)
    if durable is None:
        return None
    iso = _latest_date(durable)
    return date.fromisoformat(iso) if iso else None
