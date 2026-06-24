from __future__ import annotations

import argparse
from pathlib import Path

from app.models.commercial_trend.features import (
    HDONG_NAME_FILE,
    RAW_DIR,
    SAMPLE_DIR,
    load_hdong_names_csv,
)
from app.trend.repository import upsert_hdong_names


def ingest_csv_into_db(data_dir: Path) -> dict[str, int]:
    """주어진 폴더의 행정동 이름 CSV를 DB로 적재한다."""
    names = load_hdong_names_csv(data_dir / HDONG_NAME_FILE)
    inserted_names = upsert_hdong_names(names)
    return {"areas": inserted_names}


def ingest_bootstrap_into_db() -> dict[str, int]:
    """부트스트랩용: .raw의 실데이터 CSV를 DB로 적재한다."""
    return ingest_csv_into_db(RAW_DIR)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="행정동 이름 CSV를 trend-db로 적재한다")
    parser.add_argument(
        "--source",
        default="sample",
        choices=["sample", "raw"],
        help="sample: .sample 폴더, raw: .raw 폴더(실데이터 투입용)",
    )
    args = parser.parse_args()
    data_dir = SAMPLE_DIR if args.source == "sample" else RAW_DIR
    result = ingest_csv_into_db(data_dir)
    print(f"적재 완료: 행정동 {result['areas']}개")
