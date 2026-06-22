from __future__ import annotations

import unittest

from app.surveys.contracts import SurveyDefinitionResponse, SurveyPreviewRequest
from app.surveys.definitions import active_survey_definition
from app.surveys.service import _score_definition


class SurveyScoringTestCase(unittest.TestCase):
    def test_preview_scoring_builds_area_and_category_profiles(self) -> None:
        """설문 점수 계산은 상권용 9축과 업종용 17축을 함께 만들어야 한다."""

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
                profile_name="점수 계산 테스트",
                answers={
                    "q1": "A",
                    "q2": "A",
                    "q3": "A",
                    "q4": "A",
                    "q5": "A",
                    "q6": "A",
                    "q7": "A",
                    "q8": "A",
                    "q9": "A",
                    "q10": "A",
                    "q11": "A",
                    "q12": ["A", "C"],
                },
            ),
            question_lookup={
                str(question["id"]): dict(question)
                for question in raw_definition["questions"]
            },
        )

        self.assertEqual(scored.survey_code, "A")
        self.assertEqual(scored.answers["q12"], ["A", "C"])
        self.assertAlmostEqual(scored.area_user_profile.subway_dependency_level, 1.0)
        self.assertLess(scored.area_user_profile.budget_level, 0.2)
        self.assertGreater(scored.area_user_profile.stability_level, 0.8)
        self.assertGreater(scored.category_user_profile.lunch_preference_level, 0.8)
        self.assertGreater(scored.category_user_profile.female_preference_level, 0.8)
        self.assertLess(scored.category_user_profile.labor_intensity_tolerance, 0.2)
        self.assertAlmostEqual(
            scored.category_user_profile.target_age_10_level
            + scored.category_user_profile.target_age_20_level
            + scored.category_user_profile.target_age_30_level
            + scored.category_user_profile.target_age_40_level
            + scored.category_user_profile.target_age_50_plus_level,
            1.0,
            places=2,
        )


if __name__ == "__main__":
    unittest.main()
