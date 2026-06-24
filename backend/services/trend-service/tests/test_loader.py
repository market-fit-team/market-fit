"""생활인구 원본 파싱 검증. 헤더 1칸 밀림(줄 끝 구분자)·세그먼트 합산이 회귀하지 않도록 잠근다."""

from __future__ import annotations

from pathlib import Path

from app.models.commercial_trend import features as F

# 남자 14컬럼 + 여자 14컬럼 (실제 LOCAL_PEOPLE_DONG와 동일한 32열 구조)
_MALE_COLS = [f"남자{i}" for i in range(14)]
_FEMALE_COLS = [f"여자{i}" for i in range(14)]
_HEADER = ["기준일ID", "시간대구분", "행정동코드", "총생활인구수"] + _MALE_COLS + _FEMALE_COLS


def _write_living_csv(directory: Path) -> None:
    """남자=14·여자=14·총합=28인 합성 원본을 만든다. 각 행 끝에 구분자를 붙여 헤더 밀림을 재현."""
    male = ["1"] * 14
    female = ["1"] * 14
    lines = [",".join(_HEADER)]
    for area in ("1111", "2222"):
        for date in ("20260401", "20260402"):
            for hour in ("00", "01"):
                # 4 + 14 + 14 = 32 필드 + 줄 끝 구분자 → 33 필드(실데이터와 동일한 어긋남)
                fields = [date, hour, area, "28", *male, *female]
                lines.append(",".join(fields) + ",")
    (directory / "LOCAL_PEOPLE_DONG_TEST.csv").write_text("\n".join(lines), encoding="utf-8")


def test_세그먼트_남여합_전체일치(tmp_path: Path, monkeypatch) -> None:
    _write_living_csv(tmp_path)
    monkeypatch.setattr(F, "RAW_DIR", tmp_path)
    dailies = F.load_segment_dailies("db")  # db 모드는 RAW_DIR을 본다

    assert set(dailies) == {"all", "male", "female", "youth", "evening"}
    assert set(dailies["all"]["area_code"]) == {"1111", "2222"}
    assert dailies["all"]["population"].unique().tolist() == [56.0]
    total = dailies["all"].set_index(["area_code", "date"])["population"]
    male = dailies["male"].set_index(["area_code", "date"])["population"]
    female = dailies["female"].set_index(["area_code", "date"])["population"]
    assert (male + female - total).abs().max() == 0.0


def test_원천_csv_최신기준일(tmp_path: Path, monkeypatch) -> None:
    _write_living_csv(tmp_path)
    monkeypatch.setattr(F, "RAW_DIR", tmp_path)

    latest = F.latest_source_stat_date("db")
    assert latest is not None
    assert latest.isoformat() == "2026-04-02"
