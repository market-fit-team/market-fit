from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AreaPredictionCacheRecord


class AreaPredictionCacheRepository:
    async def get(
        self,
        session: AsyncSession,
        area_profile_key: str,
        selected_category_code: str,
        model_signature: str,
        top_k: int,
    ) -> AreaPredictionCacheRecord | None:
        result = await session.execute(
            select(AreaPredictionCacheRecord).where(
                AreaPredictionCacheRecord.area_profile_key == area_profile_key,
                AreaPredictionCacheRecord.selected_category_code == selected_category_code,
                AreaPredictionCacheRecord.model_signature == model_signature,
                AreaPredictionCacheRecord.top_k == top_k,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        session: AsyncSession,
        area_profile_key: str,
        selected_category_code: str,
        model_signature: str,
        top_k: int,
        prediction_json: dict,
    ) -> AreaPredictionCacheRecord:
        record = await self.get(
            session,
            area_profile_key,
            selected_category_code,
            model_signature,
            top_k,
        )
        if record is None:
            record = AreaPredictionCacheRecord(
                area_profile_key=area_profile_key,
                selected_category_code=selected_category_code,
                model_signature=model_signature,
                top_k=top_k,
                prediction_json=prediction_json,
            )
            session.add(record)
        else:
            record.prediction_json = prediction_json
        await session.flush()
        return record
