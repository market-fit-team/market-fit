"""서울 열린데이터 Open API로 최근 생활인구를 받아 정제본에 증분 적재한다(원시 비보관).

원시(시간대×전동×일)는 월 100~170MB로 무거워 보관하지 않는다. 대신 적재 시점에 바로 집계해
정제본(상업/야간 일평균, time_of_day)에 (동,일) upsert하고 임시 원시는 폐기한다.
- 응답 필드(`_ROW_FIELDS`)는 기존 CSV 컬럼 순서(총인구 → 남자 14밴드 → 여자 14밴드)와 같아
  같은 위치 기반 집계 로직을 그대로 재사용한다.
- Open API는 최근 2개월만 제공 → 학습용 전체 히스토리는 포털 파일 다운로드로 시드(time_of_day._build).

사용(cron):
    docker compose run --rm -e TREND_SERVICE_SEOUL_API_KEY=... trend-service \\
        python -m app.fetch --year 2026 --month 5
"""

from __future__ import annotations

import argparse
import csv
import json
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

from app.core.config import settings

_BASE = "http://openapi.seoul.go.kr:8088"
_PAGE = 1000  # 호출당 최대 행수(서울 API 표준)
_SERVICE = "SPOP_LOCAL_RESD_DONG"  # 데이터셋 OA-14991의 OpenAPI 서비스명
_RETRIES = 3  # 일시적 네트워크 오류 재시도(월 ~330콜이라 한 번 끊겨도 회차가 안 죽게)
_NO_DATA = "INFO-200"  # 해당 일자 데이터 없음(미공개·미래일). 오류가 아니라 건너뜀.

# 연령대 코드(남녀 공통, 0~9세 ~ 70~74세). 행정동 생활인구 14개 밴드.
_AGE_BANDS = ("0T9", "10T14", "15T19", "20T24", "25T29", "30T34", "35T39",
              "40T44", "45T49", "50T54", "55T59", "60T64", "65T69", "70T74")

# CSV 컬럼 순서(0..31). 집계 파서가 '위치'로 읽으므로 이 순서가 계약이다(총인구→남자→여자).
_ROW_FIELDS: list[str] = [
    "STDR_DE_ID",  # 0 기준일(YYYYMMDD)
    "TMZON_PD_SE",  # 1 시간대(00~23)
    "ADSTRD_CODE_SE",  # 2 행정동코드
    "TOT_LVPOP_CO",  # 3 총생활인구수
    *[f"MALE_F{band}_LVPOP_CO" for band in _AGE_BANDS],  # 4..17 남자 14밴드
    *[f"FEMALE_F{band}_LVPOP_CO" for band in _AGE_BANDS],  # 18..31 여자 14밴드
]


def _month_last_day(year: int, month: int) -> date:
    nxt = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return nxt - timedelta(days=1)


def _get_json(url: str) -> dict[str, object]:
    """일시적 네트워크 오류는 몇 번 재시도한다."""
    last: Exception | None = None
    for attempt in range(_RETRIES):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError) as exc:  # HTTPError 포함
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"API 호출 실패(재시도 {_RETRIES}회): {last}")


def _fetch_day(api_key: str, day: date) -> list[dict[str, object]]:
    """하루치 행을 페이지네이션으로 모두 받는다(1000행/콜). 데이터 없는 날은 빈 리스트."""
    rows: list[dict[str, object]] = []
    start = 1
    while True:
        url = f"{_BASE}/{api_key}/json/{_SERVICE}/{start}/{start + _PAGE - 1}/{day:%Y%m%d}"
        payload = _get_json(url)
        # 데이터 없는 날·키 오류는 서비스 키 없이 top-level RESULT로 온다(서비스명 문제로 오인하지 않게 먼저 본다).
        top = payload.get("RESULT")
        if isinstance(top, dict):
            code = top.get("CODE")
            if code == _NO_DATA:  # 해당 일자 데이터 없음 → 건너뜀
                break
            if code not in (None, "INFO-000"):
                raise RuntimeError(f"API 오류(키/요청 확인): {top}")
        body = payload.get(_SERVICE)
        if not isinstance(body, dict):
            raise RuntimeError(f"예상치 못한 응답: keys={list(payload)}")
        code = body.get("RESULT", {}).get("CODE")
        if code == _NO_DATA:  # 해당 일자 데이터 없음 → 건너뜀
            break
        if code not in (None, "INFO-000"):
            raise RuntimeError(f"API 오류: {body.get('RESULT')}")
        chunk = body.get("row", [])
        if not chunk:
            break
        rows.extend(chunk)
        total = int(body.get("list_total_count", len(rows)))
        if start + _PAGE - 1 >= total:
            break
        start += _PAGE
    return rows


def _row_values(item: dict[str, object]) -> list[object]:
    """JSON 행 → CSV 32필드. 키가 안 맞으면 실제 키 목록을 알려준다(필드 확정용)."""
    try:
        return [item[key] for key in _ROW_FIELDS]
    except KeyError as exc:
        raise RuntimeError(f"응답 필드 {exc}가 _ROW_FIELDS와 불일치. 실제 키로 확정하라: {list(item)}") from None


def fetch_month(year: int, month: int, dest: Path, api_key: str | None = None) -> int:
    """해당 월을 일자별로 받아 기존 CSV 형식으로 dest에 쓴다(데이터 없는 날은 건너뜀). 쓴 행 수 반환."""
    api_key = api_key or settings.seoul_api_key
    if not api_key:
        raise RuntimeError("TREND_SERVICE_SEOUL_API_KEY가 비어 있어 fetch를 할 수 없다.")
    last = _month_last_day(year, month)
    written = 0
    with dest.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(_ROW_FIELDS)  # 헤더 1행(집계 시 skiprows=1로 건너뜀)
        day = date(year, month, 1)
        while day <= last:
            for item in _fetch_day(api_key, day):
                writer.writerow(_row_values(item))
                written += 1
            day += timedelta(days=1)
    return written


def refine_month(year: int, month: int, api_key: str | None = None) -> dict[str, object]:
    """월 데이터를 임시 CSV로 받아 정제본에 upsert하고 임시 원시는 폐기한다(증분 적재)."""
    from app.models.commercial_trend.time_of_day import upsert_from_csv

    with tempfile.TemporaryDirectory() as tmp:
        tmp_csv = Path(tmp) / f"LOCAL_PEOPLE_DONG_{year}{month:02d}.csv"
        rows = fetch_month(year, month, tmp_csv, api_key)
        latest = upsert_from_csv(tmp_csv)  # 상업/야간 정제본에 (동,일) 병합
    # TemporaryDirectory가 닫히며 임시 원시 자동 삭제
    return {"year": year, "month": month, "rows": rows, "latest_date": latest}


if __name__ == "__main__":
    today = date.today()
    parser = argparse.ArgumentParser(description="서울 Open API → 정제본 증분 적재(원시 비보관)")
    parser.add_argument("--year", type=int, default=today.year)
    parser.add_argument("--month", type=int, default=today.month)
    args = parser.parse_args()
    result = refine_month(args.year, args.month)
    print(json.dumps(result, ensure_ascii=False, indent=2))
