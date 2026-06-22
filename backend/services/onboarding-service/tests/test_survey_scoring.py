from __future__ import annotations

import sys
import types
import unittest


stub_two_tower_service = types.ModuleType("app.two_tower.service")
stub_two_tower_service.build_share_url = lambda profile_code: f"http://localhost:3000/onboarding/result/{profile_code}"


async def _unused_resolve_prediction_response(*args, **kwargs):
    raise AssertionError("점수 계산 테스트에서는 추천 계산을 호출하지 않습니다.")


stub_two_tower_service.resolve_prediction_response = _unused_resolve_prediction_response
sys.modules["app.two_tower.service"] = stub_two_tower_service

from app.surveys.contracts import SurveyDefinitionResponse, SurveyPreviewRequest
from app.surveys.definitions import active_survey_definition
from app.surveys.service import _score_definition
from app.two_tower.codecs import encode_profile_code


class SurveyScoringTestCase(unittest.TestCase):
    def test_preview_scoring_uses_raw_effects_from_definition_json(self) -> None:
        """설문 점수 계산은 선택지 effects를 잃지 않고 실제 점수를 만들어야 한다."""

        raw_definition = active_survey_definition()
        definition = SurveyDefinitionResponse.model_validate(
            {
                "id": 1,
                "slug": raw_definition["slug"],
                "version": raw_definition["version"],
                "survey_code": raw_definition["survey_code"],
                "scoring_version": raw_definition["scoring_version"],
                "title": raw_definition["title"],
                "description": raw_definition["description"],
                "question_count": len(raw_definition["questions"]),
                "questions": raw_definition["questions"],
            }
        )

        scored = _score_definition(
            definition,
            SurveyPreviewRequest(
                preferred_category_code="CS100005",
                answers={
                    "q1": "A",
                    "q2": "C",
                    "q3": "D",
                    "q4": "A",
                    "q5": "C",
                    "q6": "A",
                    "q7": "B",
                    "q8": "A",
                    "q9": "D",
                    "q10": ["A", "D"],
                },
            ),
            question_lookup={
                str(question["id"]): dict(question)
                for question in raw_definition["questions"]
            },
        )

        profile_code = encode_profile_code(
            scored.user_profile.model_dump(),
            survey_code=scored.survey_code,
        )

        self.assertEqual(scored.user_profile.preferred_category_code, "CS100005")
        self.assertEqual(profile_code, "r3a36ithdexs2sjo")
        self.assertAlmostEqual(scored.user_profile.budget_level, 0.29)
        self.assertAlmostEqual(scored.user_profile.stability_level, 0.84)
        self.assertAlmostEqual(scored.user_profile.subway_dependency_level, 0.12)
        self.assertAlmostEqual(scored.user_profile.weekend_preference_level, 0.61)
        self.assertAlmostEqual(scored.user_profile.evening_preference_level, 0.35)
        self.assertAlmostEqual(scored.user_profile.resident_focus_level, 0.92)
        self.assertAlmostEqual(scored.user_profile.worker_focus_level, 0.12)
        self.assertAlmostEqual(scored.user_profile.rent_sensitivity_level, 0.78)
        self.assertAlmostEqual(scored.user_profile.competition_tolerance_level, 0.18)


if __name__ == "__main__":
    unittest.main()
