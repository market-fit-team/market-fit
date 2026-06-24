from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

TEST_DATABASE_PATH = Path(tempfile.gettempdir()) / "onboarding-service-test.sqlite3"
if TEST_DATABASE_PATH.exists():
    TEST_DATABASE_PATH.unlink()

os.environ["ONBOARDING_SERVICE_DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DATABASE_PATH}"
os.environ["ONBOARDING_SERVICE_AUTO_CREATE_SCHEMA"] = "true"

from app.core.config import settings

settings.database_url = f"sqlite+aiosqlite:///{TEST_DATABASE_PATH}"
settings.auto_create_schema = True

from app.main import app
from app.core.jwt_auth import AuthUserContext
from app.models.onboarding_category_tower.runtime import train_runtime as train_category_runtime
from app.models.onboarding_two_tower.runtime import train_runtime as train_area_runtime


class SurveyApiTestCase(unittest.TestCase):
    SURVEY_ANSWERS = {
        "q1": "B",
        "q2": "A",
        "q3": "C",
        "q4": "A",
        "q5": "C",
        "q6": "B",
        "q7": "B",
        "q8": "A",
        "q9": "C",
        "q10": "A",
        "q11": "C",
        "q12": ["B", "D"],
    }
    AUTH_USER_UUID = "85d9ee80-7047-4011-b5be-e4150319f858"

    @classmethod
    def setUpClass(cls) -> None:
        """테스트 시작 전에 두 모델 artifact와 런타임 캐시를 맞춘다."""

        train_area_runtime(epochs=1)
        train_category_runtime(epochs=1)
        cls.client_manager = TestClient(app)
        cls.client = cls.client_manager.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        """종료 시 테스트 클라이언트와 임시 sqlite 파일을 정리한다."""

        cls.client_manager.__exit__(None, None, None)
        if TEST_DATABASE_PATH.exists():
            TEST_DATABASE_PATH.unlink()

    def _auth_context(self, auth_user_uuid: str | None = None) -> AuthUserContext:
        resolved_auth_user_uuid = auth_user_uuid or self.AUTH_USER_UUID
        return AuthUserContext(
            auth_user_uuid=resolved_auth_user_uuid,
            jwt_payload={"user_profile": {"uuid": resolved_auth_user_uuid}},
        )

    def test_health_endpoint_returns_both_model_statuses(self) -> None:
        """헬스체크는 업종 추천 모델과 상권 추천 모델 상태를 함께 보여줘야 한다."""

        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["service"], "onboarding-service")
        self.assertEqual(payload["area_model"]["model_id"], "onboarding_two_tower")
        self.assertEqual(payload["category_model"]["model_id"], "onboarding_category_tower")

    def test_active_survey_endpoint_returns_current_definition(self) -> None:
        """활성 설문 엔드포인트는 새 12문항 정의를 반환해야 한다."""

        response = self.client.get("/surveys/active")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "founder-fit-12-final")
        self.assertEqual(payload["survey_code"], "A")
        self.assertEqual(payload["question_count"], 12)
        self.assertEqual(len(payload["questions"]), 12)

    def test_preview_result_and_area_recommendation_flow(self) -> None:
        """preview는 결과 본체를 저장하고 업종별 상권 추천은 별도 조회로 제공해야 한다."""

        preview_response = self.client.post(
            "/surveys/active/preview",
            json={
                "profile_name": "설문 미리보기",
                "answers": self.SURVEY_ANSWERS,
            },
        )

        self.assertEqual(preview_response.status_code, 200)
        preview_payload = preview_response.json()
        self.assertEqual(preview_payload["survey"]["survey_code"], "A")
        self.assertTrue(preview_payload["result_code"].startswith("r"))
        self.assertEqual(preview_payload["share_path"], f"/onboarding/result/{preview_payload['result_code']}")
        self.assertGreater(len(preview_payload["category_recommendations"]), 0)
        self.assertLessEqual(len(preview_payload["category_recommendations"]), 20)

        public_response = self.client.get(f"/surveys/results/{preview_payload['result_code']}")
        self.assertEqual(public_response.status_code, 200)
        public_payload = public_response.json()
        self.assertEqual(public_payload["result_code"], preview_payload["result_code"])
        self.assertEqual(
            public_payload["category_recommendations"],
            preview_payload["category_recommendations"],
        )

        selected_category_code = preview_payload["category_recommendations"][0]["service_category_code"]
        area_response = self.client.get(
            f"/surveys/results/{preview_payload['result_code']}/area-recommendations",
            params={"category_code": selected_category_code, "top_k": 5},
        )
        self.assertEqual(area_response.status_code, 200)
        area_payload = area_response.json()
        self.assertEqual(area_payload["result_code"], preview_payload["result_code"])
        self.assertEqual(area_payload["selected_category_code"], selected_category_code)
        self.assertEqual(area_payload["prediction"]["top_k"], 5)
        self.assertEqual(
            area_payload["prediction"]["user_profile"]["preferred_category_code"],
            selected_category_code,
        )

    def test_preview_cache_reuses_saved_category_prediction(self) -> None:
        """같은 답변이면 업종 추천은 DB 캐시를 재사용해야 한다."""

        first_response = self.client.post(
            "/surveys/active/preview",
            json={"profile_name": "첫 번째", "answers": self.SURVEY_ANSWERS},
        )
        self.assertEqual(first_response.status_code, 200)
        first_payload = first_response.json()

        with patch("app.surveys.service.category_predict_payload", side_effect=AssertionError("캐시 miss 금지")):
            second_response = self.client.post(
                "/surveys/active/preview",
                json={"profile_name": "두 번째", "answers": self.SURVEY_ANSWERS},
            )

        self.assertEqual(second_response.status_code, 200)
        second_payload = second_response.json()
        self.assertEqual(
            first_payload["category_recommendations"],
            second_payload["category_recommendations"],
        )

    def test_area_recommendation_cache_reuses_saved_prediction(self) -> None:
        """같은 상권 프로필과 같은 업종이면 상권 추천은 DB 캐시를 재사용해야 한다."""

        first_preview = self.client.post(
            "/surveys/active/preview",
            json={"profile_name": "첫 결과", "answers": self.SURVEY_ANSWERS},
        )
        self.assertEqual(first_preview.status_code, 200)
        first_payload = first_preview.json()
        selected_category_code = first_payload["category_recommendations"][0]["service_category_code"]

        first_area = self.client.get(
            f"/surveys/results/{first_payload['result_code']}/area-recommendations",
            params={"category_code": selected_category_code, "top_k": 5},
        )
        self.assertEqual(first_area.status_code, 200)

        second_preview = self.client.post(
            "/surveys/active/preview",
            json={"profile_name": "두 번째 결과", "answers": self.SURVEY_ANSWERS},
        )
        self.assertEqual(second_preview.status_code, 200)
        second_payload = second_preview.json()

        with patch("app.two_tower.service.predict_payload", side_effect=AssertionError("캐시 miss 금지")):
            second_area = self.client.get(
                f"/surveys/results/{second_payload['result_code']}/area-recommendations",
                params={"category_code": selected_category_code, "top_k": 5},
            )

        self.assertEqual(second_area.status_code, 200)
        self.assertEqual(
            first_area.json()["prediction"]["recommendations"],
            second_area.json()["prediction"]["recommendations"],
        )

    def test_openapi_exposes_only_new_public_paths(self) -> None:
        """OpenAPI 문서는 새 설문 경로만 노출해야 한다."""

        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("/surveys/active", payload["paths"])
        self.assertIn("/surveys/active/preview", payload["paths"])
        self.assertIn("/surveys/results/{result_code}", payload["paths"])
        self.assertIn("/surveys/results/{result_code}/area-recommendations", payload["paths"])
        self.assertIn("/surveys/me/profile", payload["paths"])
        self.assertIn("/surveys/me/profile/status", payload["paths"])
        self.assertIn("/surveys/me/saved-results", payload["paths"])
        self.assertNotIn("/surveys/active/confirm-category", payload["paths"])
        self.assertNotIn("/two-tower/catalog", payload["paths"])
        self.assertNotIn("/two-tower/predict", payload["paths"])

    def test_legacy_two_tower_routes_are_gone(self) -> None:
        """레거시 two-tower 공개 경로는 완전히 제거돼야 한다."""

        self.assertEqual(self.client.get("/two-tower/catalog").status_code, 404)
        self.assertEqual(self.client.post("/two-tower/predict", json={}).status_code, 404)
        self.assertEqual(self.client.get("/two-tower/evaluation").status_code, 404)

    def test_profile_endpoints_require_bearer_token(self) -> None:
        """내 프로필 관련 경로는 Bearer JWT 없이는 접근할 수 없어야 한다."""

        self.assertEqual(self.client.get("/surveys/me/profile/status").status_code, 401)
        self.assertEqual(self.client.get("/surveys/me/profile").status_code, 401)
        self.assertEqual(self.client.get("/surveys/me/saved-results").status_code, 401)
        self.assertEqual(
            self.client.put("/surveys/me/profile", json={"result_code": "r000000000000000"}).status_code,
            401,
        )

    def test_authenticated_preview_default_profile_status_and_saved_results_roundtrip(self) -> None:
        """인증 사용자는 설문 제출 이력과 기본 프로필을 별도로 조회할 수 있어야 한다."""

        with patch("app.api.deps.verify_bearer_token", new=AsyncMock(return_value=self._auth_context())):
            preview_response = self.client.post(
                "/surveys/active/preview",
                headers={"Authorization": "Bearer test-token"},
                json={"profile_name": "내 설문", "answers": self.SURVEY_ANSWERS},
            )
            self.assertEqual(preview_response.status_code, 200)
            preview_payload = preview_response.json()

            status_response = self.client.get(
                "/surveys/me/profile/status",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(status_response.status_code, 200)
            self.assertFalse(status_response.json()["has_default_profile"])

            default_response = self.client.put(
                "/surveys/me/profile",
                headers={"Authorization": "Bearer test-token"},
                json={"result_code": preview_payload["result_code"]},
            )
            self.assertEqual(default_response.status_code, 200)
            self.assertEqual(default_response.json()["result_code"], preview_payload["result_code"])

            status_response_after = self.client.get(
                "/surveys/me/profile/status",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(status_response_after.status_code, 200)
            self.assertTrue(status_response_after.json()["has_default_profile"])
            self.assertEqual(
                status_response_after.json()["default_result_code"],
                preview_payload["result_code"],
            )

            profile_response = self.client.get(
                "/surveys/me/profile",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(profile_response.status_code, 200)
            self.assertEqual(profile_response.json()["result_code"], preview_payload["result_code"])

            saved_results_response = self.client.get(
                "/surveys/me/saved-results",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(saved_results_response.status_code, 200)
            saved_results_payload = saved_results_response.json()
            self.assertEqual(saved_results_payload["default_result_code"], preview_payload["result_code"])
            self.assertEqual(len(saved_results_payload["results"]), 1)
            self.assertEqual(saved_results_payload["results"][0]["saved_source"], "default_profile")

    def test_manual_save_and_delete_saved_result(self) -> None:
        """수동 저장과 삭제는 결과 코드 기준으로 동작해야 한다."""

        preview_response = self.client.post(
            "/surveys/active/preview",
            json={"profile_name": "공유 결과", "answers": self.SURVEY_ANSWERS},
        )
        self.assertEqual(preview_response.status_code, 200)
        preview_payload = preview_response.json()

        with patch(
            "app.api.deps.verify_bearer_token",
            new=AsyncMock(return_value=self._auth_context("4e13dd5f-3d2b-4a57-b91d-d0648abca96d")),
        ):
            save_response = self.client.post(
                "/surveys/me/saved-results",
                headers={"Authorization": "Bearer test-token"},
                json={"result_code": preview_payload["result_code"], "saved_label": "관심 결과"},
            )
            self.assertEqual(save_response.status_code, 200)
            self.assertEqual(save_response.json()["saved_label"], "관심 결과")

            delete_response = self.client.delete(
                f"/surveys/me/saved-results/{preview_payload['result_code']}",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(delete_response.status_code, 204)

            list_response = self.client.get(
                "/surveys/me/saved-results",
                headers={"Authorization": "Bearer test-token"},
            )
            self.assertEqual(list_response.status_code, 200)
            self.assertEqual(list_response.json()["results"], [])


if __name__ == "__main__":
    unittest.main()
