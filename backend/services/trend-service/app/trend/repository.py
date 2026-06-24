from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from datetime import date, datetime

from app.db.models import HdongArea, TrendScore
from app.db.session import session_scope

# psycopg 파라미터 한도(65535) 회피용 upsert 청크 크기
_UPSERT_CHUNK = 5000


def is_hdong_area_empty() -> bool:
    with session_scope() as session:
        count = session.scalar(select(func.count()).select_from(HdongArea))
        return (count or 0) == 0


def load_hdong_names_db() -> dict[str, str]:
    with session_scope() as session:
        rows = session.execute(select(HdongArea.code, HdongArea.name)).all()
    return {str(code): str(name) for code, name in rows}


def upsert_hdong_names(names: dict[str, str]) -> int:
    if not names:
        return 0
    payload = [{"code": code, "name": name} for code, name in names.items()]
    statement = pg_insert(HdongArea).values(payload)
    statement = statement.on_conflict_do_update(
        index_elements=[HdongArea.code], set_={"name": statement.excluded.name}
    )
    with session_scope() as session:
        session.execute(statement)
        session.commit()
    return len(payload)


def save_theme_scores(
    rankings: dict[str, list[dict[str, object]]], run_at: datetime, as_of_date: date | None
) -> int:
    """주제별 예측 결과를 trend_score에 저장한다(run_at 단위 이력, theme로 구분)."""
    payload = [
        {
            "run_at": run_at,
            "theme": theme,
            "area_code": str(item["area_code"]),
            "area_name": str(item["area_name"]),
            "as_of_date": as_of_date,
            "pred_growth": float(item["pred_growth"]),  # type: ignore[arg-type]
            "score": int(item["score"]),  # type: ignore[arg-type]
            "rank": rank,
            "signals": item["signals"],
        }
        for theme, ranking in rankings.items()
        for rank, item in enumerate(ranking, start=1)
    ]
    if not payload:
        return 0
    with session_scope() as session:
        for start in range(0, len(payload), _UPSERT_CHUNK):
            statement = pg_insert(TrendScore).values(payload[start : start + _UPSERT_CHUNK])
            statement = statement.on_conflict_do_nothing(
                index_elements=[TrendScore.run_at, TrendScore.theme, TrendScore.area_code]
            )
            session.execute(statement)
        session.commit()
    return len(payload)


def load_latest_theme_scores() -> dict[str, list[dict[str, object]]]:
    """가장 최근 run_at의 주제별 예측 결과를 {theme: 랭킹}으로 읽는다. 없으면 빈 dict."""
    with session_scope() as session:
        latest = session.scalar(select(func.max(TrendScore.run_at)))
        if latest is None:
            return {}
        rows = (
            session.execute(
                select(TrendScore)
                .where(TrendScore.run_at == latest)
                .order_by(TrendScore.theme, TrendScore.rank)
            )
            .scalars()
            .all()
        )
    result: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        result.setdefault(row.theme, []).append(
            {
                "area_code": row.area_code,
                "area_name": row.area_name,
                "score": row.score,
                "pred_growth": row.pred_growth,
                "signals": row.signals,
            }
        )
    return result
