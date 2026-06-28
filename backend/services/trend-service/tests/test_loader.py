"""생활인구 원본 파싱 검증. 헤더 1칸 밀림(줄 끝 구분자)·세그먼트 합산이 회귀하지 않도록 잠근다."""

from __future__ import annotations

from pathlib import Path

from app.models.commercial_trend import features as F
from app.models.commercial_trend import runtime as R
from app.models.commercial_trend import time_of_day as T

# 남자 14컬럼 + 여자 14컬럼 (실제 LOCAL_PEOPLE_DONG와 동일한 32열 구조)
_MALE_COLS = [f"남자{i}" for i in range(14)]
_FEMALE_COLS = [f"여자{i}" for i in range(14)]
_HEADER = ["기준일ID", "시간대구분", "행정동코드", "총생활인구수"] + _MALE_COLS + _FEMALE_COLS


def _write_living_csv(directory: Path, total: str = "28") -> None:
    """남자=14·여자=14·총합=28인 합성 원본을 만든다. 각 행 끝에 구분자를 붙여 헤더 밀림을 재현."""
    male = ["1"] * 14
    female = ["1"] * 14
    lines = [",".join(_HEADER)]
    for area in ("1111", "2222"):
        for date in ("20260401", "20260402"):
            for hour in ("00", "01"):
                # 4 + 14 + 14 = 32 필드 + 줄 끝 구분자 → 33 필드(실데이터와 동일한 어긋남)
                fields = [date, hour, area, total, *male, *female]
                lines.append(",".join(fields) + ",")
    (directory / "LOCAL_PEOPLE_DONG_TEST.csv").write_text("\n".join(lines), encoding="utf-8")


def test_segment_male_female_sum_equals_total(tmp_path: Path, monkeypatch) -> None:
    """원본 컬럼 위치 합산이 회귀하지 않도록 잠근다: 남성+여성 = 전체."""
    _write_living_csv(tmp_path)
    monkeypatch.setattr(F, "RAW_DIR", tmp_path)
    dailies = T._build({"00", "01"}, "db")  # db 모드는 RAW_DIR을 본다

    assert set(dailies) == {"combined", "male", "female", "youth"}
    assert set(dailies["combined"]["area_code"]) == {"1111", "2222"}
    assert dailies["combined"]["population"].unique().tolist() == [28.0]  # 시간대 평균(동시 인원)
    total = dailies["combined"].set_index(["area_code", "date"])["population"]
    male = dailies["male"].set_index(["area_code", "date"])["population"]
    female = dailies["female"].set_index(["area_code", "date"])["population"]
    assert (male + female - total).abs().max() == 0.0


def test_latest_source_stat_date(tmp_path: Path, monkeypatch) -> None:
    """원천 CSV들에서 가장 최신 기준일을 올바로 읽는지 확인한다."""
    _write_living_csv(tmp_path)
    monkeypatch.setattr(F, "RAW_DIR", tmp_path)

    latest = F.latest_source_stat_date("db")
    assert latest is not None
    assert latest.isoformat() == "2026-04-02"


def _write_month_csv(path: Path, dates: tuple[str, ...], hour: str, total: str) -> None:
    """지정 일자·시간대·총합으로 합성 월 CSV를 만든다(헤더 1행 + 데이터, 줄 끝 구분자 포함)."""
    male = ["1"] * 14
    female = ["1"] * 14
    lines = [",".join(_HEADER)]
    for area in ("1111", "2222"):
        for d in dates:
            lines.append(",".join([d, hour, area, total, *male, *female]) + ",")
    path.write_text("\n".join(lines), encoding="utf-8")


def test_durable_aggregate_upsert_overwrites_dates(tmp_path: Path, monkeypatch) -> None:
    """정제본 upsert: 같은 (동,일)은 새 값으로 덮어쓰고 새 날짜는 추가, 옛 날짜는 유지한다."""
    monkeypatch.setattr(T, "_COMMERCIAL_FILE", tmp_path / "commercial.csv.gz")
    monkeypatch.setattr(T, "_NIGHT_FILE", tmp_path / "night.csv.gz")

    # 1차 적재: 1/1·1/2, 상업시간대(12시), 총합 28
    first_csv = tmp_path / "m1.csv"
    _write_month_csv(first_csv, ("20260101", "20260102"), hour="12", total="28")
    T.upsert_from_csv(first_csv)
    comm = T.load_commercial_dailies("db")  # 정제본 read(원시 불필요)
    assert comm["combined"]["population"].unique().tolist() == [28.0]

    # 2차 적재: 1/2(112로 덮어씀) + 1/3(추가)
    second_csv = tmp_path / "m2.csv"
    _write_month_csv(second_csv, ("20260102", "20260103"), hour="12", total="112")
    T.upsert_from_csv(second_csv)

    merged = T.load_commercial_dailies("db")["combined"]
    by_date = merged.groupby(merged["date"].dt.strftime("%Y%m%d"))["population"].first()
    assert by_date["20260101"] == 28.0  # 유지
    assert by_date["20260102"] == 112.0  # 덮어씀
    assert by_date["20260103"] == 112.0  # 추가


def test_durable_aggregate_prunes_beyond_retention(tmp_path: Path, monkeypatch) -> None:
    """정제본 보관 한도(2년) 초과 날짜는 저장 시 버려진다."""
    monkeypatch.setattr(T, "_COMMERCIAL_FILE", tmp_path / "commercial.csv.gz")
    monkeypatch.setattr(T, "_NIGHT_FILE", tmp_path / "night.csv.gz")

    csv = tmp_path / "m.csv"
    _write_month_csv(csv, ("20230101", "20260101"), hour="12", total="28")  # 3년 차이
    T.upsert_from_csv(csv)

    dates = set(T.load_commercial_dailies("db")["combined"]["date"].dt.strftime("%Y%m%d"))
    assert "20260101" in dates  # 최신 유지
    assert "20230101" not in dates  # 2년 초과 → 삭제


def test_db_mode_skips_runtime_compute_without_snapshot(monkeypatch) -> None:
    """db 모드에서 스냅샷이 없고 런타임 계산이 꺼져 있으면 원천 계산을 안 하는지 확인한다."""
    from app.core.config import settings

    def fail_compute(_: str):
        raise AssertionError("런타임에서 원천 계산을 호출하면 안 된다")

    monkeypatch.setattr(settings, "serve_banner_snapshot_from_db", False)
    monkeypatch.setattr(settings, "allow_runtime_banner_compute", False)
    monkeypatch.setattr(R, "_compute_banner_sections", fail_compute)
    monkeypatch.setitem(R._banner_cache, "data", None)
    monkeypatch.setitem(R._banner_cache, "at", 0.0)

    assert R.get_banner_sections("db", use_cache=False) == {"forecast": {}, "popular": {}}
