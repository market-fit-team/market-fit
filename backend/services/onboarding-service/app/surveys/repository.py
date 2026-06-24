from __future__ import annotations

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    CategoryPredictionCacheRecord,
    SurveyDefinitionRecord,
    SurveyResultRecord,
    UserDefaultProfileRecord,
    UserSavedResultRecord,
)

_SAVED_SOURCE_PRIORITY = {
    "survey_submit": 0,
    "manual_save": 1,
    "default_profile": 2,
}


class SurveyDefinitionRepository:
    async def get_active(self, session: AsyncSession) -> SurveyDefinitionRecord | None:
        result = await session.execute(
            select(SurveyDefinitionRecord).where(SurveyDefinitionRecord.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, session: AsyncSession, definition_id: int) -> SurveyDefinitionRecord | None:
        result = await session.execute(
            select(SurveyDefinitionRecord).where(SurveyDefinitionRecord.id == definition_id)
        )
        return result.scalar_one_or_none()

    async def upsert_active_definition(
        self,
        session: AsyncSession,
        *,
        slug: str,
        version: int,
        survey_code: str,
        scoring_version: str,
        title: str,
        description: str,
        question_count: int,
        definition_json: dict,
    ) -> SurveyDefinitionRecord:
        result = await session.execute(
            select(SurveyDefinitionRecord).where(
                SurveyDefinitionRecord.slug == slug,
                SurveyDefinitionRecord.version == version,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            record = SurveyDefinitionRecord(
                slug=slug,
                version=version,
                survey_code=survey_code,
                scoring_version=scoring_version,
                title=title,
                description=description,
                question_count=question_count,
                is_active=True,
                definition_json=definition_json,
            )
            session.add(record)
        else:
            record.survey_code = survey_code
            record.scoring_version = scoring_version
            record.title = title
            record.description = description
            record.question_count = question_count
            record.is_active = True
            record.definition_json = definition_json

        await session.flush()
        await session.execute(
            update(SurveyDefinitionRecord)
            .where(SurveyDefinitionRecord.id != record.id)
            .values(is_active=False)
        )
        await session.flush()
        return record


class SurveyResultRepository:
    async def create(
        self,
        session: AsyncSession,
        *,
        result_code: str,
        survey_definition_id: int,
        source: str,
        profile_name: str,
        answers_json: dict,
        answers_hash: str,
        area_user_profile_json: dict,
        category_user_profile_json: dict,
        area_profile_key: str,
        category_profile_key: str,
        category_recommendations_json: dict,
    ) -> SurveyResultRecord:
        record = SurveyResultRecord(
            result_code=result_code,
            survey_definition_id=survey_definition_id,
            source=source,
            profile_name=profile_name,
            answers_json=answers_json,
            answers_hash=answers_hash,
            area_user_profile_json=area_user_profile_json,
            category_user_profile_json=category_user_profile_json,
            area_profile_key=area_profile_key,
            category_profile_key=category_profile_key,
            category_recommendations_json=category_recommendations_json,
        )
        session.add(record)
        await session.flush()
        return record

    async def get_by_id(self, session: AsyncSession, survey_result_id: int) -> SurveyResultRecord | None:
        result = await session.execute(
            select(SurveyResultRecord).where(SurveyResultRecord.id == survey_result_id)
        )
        return result.scalar_one_or_none()

    async def get_by_result_code(self, session: AsyncSession, result_code: str) -> SurveyResultRecord | None:
        result = await session.execute(
            select(SurveyResultRecord).where(SurveyResultRecord.result_code == result_code)
        )
        return result.scalar_one_or_none()

    async def get_by_ids(
        self,
        session: AsyncSession,
        survey_result_ids: list[int],
    ) -> list[SurveyResultRecord]:
        if not survey_result_ids:
            return []

        result = await session.execute(
            select(SurveyResultRecord).where(SurveyResultRecord.id.in_(survey_result_ids))
        )
        return list(result.scalars().all())


class CategoryPredictionCacheRepository:
    async def get(
        self,
        session: AsyncSession,
        category_profile_key: str,
        model_signature: str,
        top_k: int,
    ) -> CategoryPredictionCacheRecord | None:
        result = await session.execute(
            select(CategoryPredictionCacheRecord).where(
                CategoryPredictionCacheRecord.category_profile_key == category_profile_key,
                CategoryPredictionCacheRecord.model_signature == model_signature,
                CategoryPredictionCacheRecord.top_k == top_k,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        session: AsyncSession,
        category_profile_key: str,
        model_signature: str,
        top_k: int,
        prediction_json: dict,
    ) -> CategoryPredictionCacheRecord:
        record = await self.get(session, category_profile_key, model_signature, top_k)
        if record is None:
            record = CategoryPredictionCacheRecord(
                category_profile_key=category_profile_key,
                model_signature=model_signature,
                top_k=top_k,
                prediction_json=prediction_json,
            )
            session.add(record)
        else:
            record.prediction_json = prediction_json
        await session.flush()
        return record


class UserDefaultProfileRepository:
    async def get_by_auth_user_uuid(
        self,
        session: AsyncSession,
        auth_user_uuid: str,
    ) -> UserDefaultProfileRecord | None:
        result = await session.execute(
            select(UserDefaultProfileRecord).where(UserDefaultProfileRecord.auth_user_uuid == auth_user_uuid)
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        session: AsyncSession,
        *,
        auth_user_uuid: str,
        survey_result_id: int,
    ) -> UserDefaultProfileRecord:
        record = await self.get_by_auth_user_uuid(session, auth_user_uuid)
        if record is None:
            record = UserDefaultProfileRecord(
                auth_user_uuid=auth_user_uuid,
                survey_result_id=survey_result_id,
            )
            session.add(record)
        else:
            record.survey_result_id = survey_result_id
        await session.flush()
        return record


class UserSavedResultRepository:
    async def get_by_auth_user_uuid(
        self,
        session: AsyncSession,
        auth_user_uuid: str,
    ) -> list[UserSavedResultRecord]:
        result = await session.execute(
            select(UserSavedResultRecord)
            .where(UserSavedResultRecord.auth_user_uuid == auth_user_uuid)
            .order_by(UserSavedResultRecord.updated_at.desc(), UserSavedResultRecord.id.desc())
        )
        return list(result.scalars().all())

    async def get_one(
        self,
        session: AsyncSession,
        *,
        auth_user_uuid: str,
        survey_result_id: int,
    ) -> UserSavedResultRecord | None:
        result = await session.execute(
            select(UserSavedResultRecord).where(
                UserSavedResultRecord.auth_user_uuid == auth_user_uuid,
                UserSavedResultRecord.survey_result_id == survey_result_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        session: AsyncSession,
        *,
        auth_user_uuid: str,
        survey_result_id: int,
        saved_source: str,
        saved_label: str | None = None,
    ) -> UserSavedResultRecord:
        record = await self.get_one(
            session,
            auth_user_uuid=auth_user_uuid,
            survey_result_id=survey_result_id,
        )
        if record is None:
            record = UserSavedResultRecord(
                auth_user_uuid=auth_user_uuid,
                survey_result_id=survey_result_id,
                saved_source=saved_source,
                saved_label=saved_label,
            )
            session.add(record)
        else:
            current_priority = _SAVED_SOURCE_PRIORITY.get(record.saved_source, 0)
            incoming_priority = _SAVED_SOURCE_PRIORITY.get(saved_source, 0)
            if incoming_priority >= current_priority:
                record.saved_source = saved_source
            if saved_label is not None:
                record.saved_label = saved_label
        await session.flush()
        return record

    async def delete_one(
        self,
        session: AsyncSession,
        *,
        auth_user_uuid: str,
        survey_result_id: int,
    ) -> bool:
        result = await session.execute(
            delete(UserSavedResultRecord)
            .where(
                UserSavedResultRecord.auth_user_uuid == auth_user_uuid,
                UserSavedResultRecord.survey_result_id == survey_result_id,
            )
            .returning(UserSavedResultRecord.id)
        )
        return result.scalar_one_or_none() is not None
