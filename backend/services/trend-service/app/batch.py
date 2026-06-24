"""정기 배치 진입점: (선택)이름 적재 → 학습 → 예측 → 결과 저장.

cron 등으로 주기 실행한다. 배치가 trend_score를 쓰고, API는 그 최신 결과를 읽기만 한다
(쓰기/읽기 분리). db 모드에서만 의미가 있다.

사용:
    python -m app.batch                 # 학습 + 예측 저장
    python -m app.batch --ingest        # .raw 행정동 이름 재적재까지 포함
"""

from __future__ import annotations

import argparse
import json

from app.models.commercial_trend.runtime import refresh_theme_rankings
from app.models.commercial_trend.train import train


def run_batch(data_mode: str = "db", ingest: bool = False) -> dict[str, object]:
    if data_mode != "db":
        raise ValueError("배치는 db 모드에서만 동작한다(결과를 DB에 저장하므로).")

    from app.db.session import prepare_database

    prepare_database()  # 테이블 보장 + (비었으면) 행정동 이름 부트스트랩 적재

    if ingest:
        from app.trend.ingest import ingest_bootstrap_into_db

        ingest_bootstrap_into_db()  # 행정동 이름 CSV 재적재(upsert)

    meta = train(data_mode)  # .raw 원천 CSV 전체 이력으로 재학습
    rankings = refresh_theme_rankings(data_mode)  # 주제별 예측 + trend_score 저장

    return {
        "trained_samples": meta.get("n_samples"),
        "saved_themes": list(rankings),
        "validation": meta.get("validation"),
        "saved_scores": sum(len(ranking) for ranking in rankings.values()),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="상권 트렌드 배치(이름 적재→학습→예측 저장)")
    parser.add_argument("--data-mode", default="db", choices=["db"])
    parser.add_argument("--ingest", action="store_true", help="실행 전 .raw 행정동 이름 CSV 재적재")
    args = parser.parse_args()
    result = run_batch(args.data_mode, ingest=args.ingest)
    print(json.dumps(result, ensure_ascii=False, indent=2))
