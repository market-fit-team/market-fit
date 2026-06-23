from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.models.onboarding_category_tower.contracts import (
    CategoryRecommendation,
    CategoryUserProfilePayload,
)
from app.two_tower.contracts import (
    AreaUserProfilePayload,
    PredictResponse,
)


class SurveyOption(BaseModel):
    code: str
    label: str


class SurveyQuestion(BaseModel):
    id: str
    selection_type: Literal["single", "multi"]
    prompt: str
    max_selections: int | None = None
    options: list[SurveyOption]
    primary_parameters: list[str]
    secondary_parameters: list[str]


class SurveyDefinitionSummary(BaseModel):
    id: int
    slug: str
    version: int
    survey_code: str
    scoring_version: str
    title: str
    description: str
    question_count: int


class SurveyDefinitionResponse(SurveyDefinitionSummary):
    questions: list[SurveyQuestion]


class SurveyPreviewRequest(BaseModel):
    profile_name: str = Field(default="설문 결과 프로필", description="프론트에 표시할 프로필 이름")
    answers: dict[str, Any] = Field(description="문항 id 기준 응답 JSON")


class SaveSurveyProfileRequest(BaseModel):
    result_code: str = Field(description="기본 성향 또는 저장 목록에 연결할 결과 코드")


class SaveSurveyResultRequest(BaseModel):
    result_code: str = Field(description="저장할 결과 코드")
    saved_label: str | None = Field(default=None, description="사용자 지정 저장 이름")


class SavedSurveyResultSummary(BaseModel):
    result_code: str
    profile_name: str
    share_path: str
    share_url: str
    saved_source: str
    saved_label: str | None
    result_created_at: datetime
    saved_at: datetime


class SavedSurveyResultListResponse(BaseModel):
    default_result_code: str | None
    results: list[SavedSurveyResultSummary]


class SurveyProfileStatusResponse(BaseModel):
    has_default_profile: bool
    default_result_code: str | None


class SurveyResultResponse(BaseModel):
    survey: SurveyDefinitionSummary
    result_code: str
    profile_name: str
    share_path: str
    share_url: str
    area_user_profile: AreaUserProfilePayload
    category_user_profile: CategoryUserProfilePayload
    category_recommendations: list[CategoryRecommendation]
    created_at: datetime


class SurveyAreaRecommendationResponse(BaseModel):
    result_code: str
    selected_category_code: str
    share_path: str
    share_url: str
    prediction: PredictResponse


class ProfileUpdateEvidence(BaseModel):
    message_id: str = Field(min_length=1, max_length=128)
    quote: str = Field(min_length=1, max_length=1000)


class SurveyProfileUpdateRequest(BaseModel):
    base_result_code: str = Field(min_length=1, max_length=64)
    patch: dict[str, float] = Field(min_length=1)
    evidence: list[ProfileUpdateEvidence] = Field(default_factory=list, max_length=20)
    profile_name: str | None = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def validate_patch_values(self) -> "SurveyProfileUpdateRequest":
        invalid = [
            field_name
            for field_name, value in self.patch.items()
            if not field_name or not 0 <= float(value) <= 1
        ]
        if invalid:
            raise ValueError("성향 패치 값은 이름이 있는 0~1 숫자여야 한다.")
        return self


class SurveyProfileUpdatePreviewResponse(BaseModel):
    base_result_code: str
    profile_name: str
    area_user_profile: AreaUserProfilePayload
    category_user_profile: CategoryUserProfilePayload
    category_recommendations: list[CategoryRecommendation]
    diff: dict[str, dict[str, float]]
    evidence: list[ProfileUpdateEvidence]


class SurveyAnswerValidationRequest(BaseModel):
    question: SurveyQuestion
    answer: Any

    @model_validator(mode="after")
    def validate_answer_shape(self) -> "SurveyAnswerValidationRequest":
        if self.question.selection_type == "single":
            if not isinstance(self.answer, str):
                raise ValueError("단일선택 문항은 문자열 코드 하나를 받아야 한다.")
            return self

        if not isinstance(self.answer, list) or not all(isinstance(item, str) for item in self.answer):
            raise ValueError("복수선택 문항은 문자열 코드 배열을 받아야 한다.")
        if self.question.max_selections is not None and len(self.answer) > self.question.max_selections:
            raise ValueError("복수선택 허용 개수를 초과했다.")
        return self


class SurveyScoredProfiles(BaseModel):
    survey_code: str
    answers: dict[str, Any]
    area_user_profile: AreaUserProfilePayload
    category_user_profile: CategoryUserProfilePayload
