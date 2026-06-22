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
os.environ["ONBOARDING_SERVICE_EXPOSE_LEGACY_TWO_TOWER_ROUTES"] = "false"
os.environ["ONBOARDING_SERVICE_EXPOSE_INTERNAL_MODEL_ADMIN_ROUTES"] = "false"

from app.main import app
from app.core.jwt_auth import AuthUserContext
from app.models.onboarding_two_tower.runtime import train_runtime


class SurveyApiTestCase(unittest.TestCase):
    SURVEY_ANSWERS = {
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
    }

    @classmethod
    def setUpClass(cls) -> None:
        """테스트 시작 전에 경량 학습으로 artifact와 런타임 캐시를 맞춘다."""

        train_runtime(epochs=1)
        cls.client_manager = TestClient(app)
        cls.client = cls.client_manager.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        """종료 시 테스트 클라이언트와 임시 sqlite 파일을 정리한다."""

        cls.client_manager.__exit__(None, None, None)
        if TEST_DATABASE_PATH.exists():
            TEST_DATABASE_PATH.unlink()

    def test_health_endpoint_returns_model_status(self) -> None:
        """헬스체크는 최소 서비스 상태와 현재 모델 적재 여부를 보여줘야 한다."""

        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["service"], "onboarding-service")
        self.assertEqual(payload["model_id"], "onboarding_two_tower")

    def test_active_survey_endpoint_returns_current_definition(self) -> None:
        """활성 설문 엔드포인트는 현재 문항 세트와 점수화 버전을 돌려줘야 한다."""

        response = self.client.get("/surveys/active")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "founder-fit-10-final")
        self.assertEqual(payload["survey_code"], "A")
        self.assertEqual(payload["question_count"], 10)
        self.assertEqual(len(payload["questions"]), 10)

    def test_survey_preview_and_public_result_roundtrip(self) -> None:
        """설문 미리보기 결과는 base36과 함께 공개 조회 경로로 다시 복원할 수 있어야 한다."""

        preview_response = self.client.post(
            "/surveys/active/preview",
            json={
                "top_k": 4,
                "preferred_category_code": "CS100005",
                "profile_name": "설문 미리보기",
                "answers": self.SURVEY_ANSWERS,
            },
        )

        self.assertEqual(preview_response.status_code, 200)
        preview_payload = preview_response.json()
        self.assertEqual(preview_payload["survey"]["survey_code"], "A")
        self.assertEqual(preview_payload["profile"]["source"], "survey")
        self.assertEqual(preview_payload["profile"]["user_profile"]["preferred_category_code"], "CS100005")
        self.assertEqual(preview_payload["prediction"]["survey_code"], "A")
        self.assertEqual(preview_payload["prediction"]["top_k"], 4)
        self.assertEqual(preview_payload["survey_response_id"], preview_payload["profile"]["survey_response_id"])
        self.assertNotEqual(preview_payload["prediction"]["profile_code"], "r3a0b1hqb1hqb1hq")
        self.assertNotEqual(preview_payload["profile"]["user_profile"]["budget_level"], 0.5)
        self.assertNotEqual(preview_payload["profile"]["user_profile"]["stability_level"], 0.5)
        self.assertTrue(
            all(0 <= item["score"] <= 1 for item in preview_payload["prediction"]["recommendations"])
        )

        profile_code = preview_payload["prediction"]["profile_code"]
        public_response = self.client.get(f"/surveys/results/{profile_code}")

        self.assertEqual(public_response.status_code, 200)
        public_payload = public_response.json()
        self.assertEqual(public_payload["survey"]["survey_code"], "A")
        self.assertEqual(public_payload["profile"]["profile_code"], profile_code)
        self.assertEqual(public_payload["profile"]["raw_answers"]["q10"], ["A", "D"])
        self.assertEqual(public_payload["prediction"]["survey_code"], "A")

    def test_openapi_exposes_only_public_survey_paths_by_default(self) -> None:
        """기본 OpenAPI 문서는 공개 설문 경로만 노출하고 레거시 투타워 경로는 숨겨야 한다."""

        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("/surveys/active", payload["paths"])
        self.assertIn("/surveys/active/preview", payload["paths"])
        self.assertIn("/surveys/results/{profile_code}", payload["paths"])
        self.assertIn("/surveys/me/profile", payload["paths"])
        self.assertNotIn("/two-tower/catalog", payload["paths"])
        self.assertNotIn("/two-tower/predict", payload["paths"])
        self.assertNotIn("/two-tower/evaluation", payload["paths"])
        self.assertNotIn("/two-tower/train", payload["paths"])
        self.assertNotIn("/two-tower/profiles/users/{auth_user_uuid}", payload["paths"])
        self.assertNotIn("/two-tower/profiles/code/{profile_code}", payload["paths"])

    def test_legacy_two_tower_routes_are_hidden_by_default(self) -> None:
        """레거시 투타워 및 학습 경로는 기본 설정에서 외부에 노출되면 안 된다."""

        auth_user_uuid = "123e4567-e89b-12d3-a456-426614174000"

        catalog_response = self.client.get("/two-tower/catalog")
        predict_response = self.client.post("/two-tower/predict", json={"top_k": 3, "user_profile": {}})
        evaluation_response = self.client.get("/two-tower/evaluation")
        train_response = self.client.post("/two-tower/train", json={"epochs": 1})
        get_profile_response = self.client.get(f"/two-tower/profiles/users/{auth_user_uuid}")
        put_profile_response = self.client.put(
            f"/two-tower/profiles/users/{auth_user_uuid}",
            json={"top_k": 3, "source": "manual", "user_profile": {}},
        )
        code_response = self.client.get("/two-tower/profiles/code/r300000000000000")

        self.assertEqual(catalog_response.status_code, 404)
        self.assertEqual(predict_response.status_code, 404)
        self.assertEqual(evaluation_response.status_code, 404)
        self.assertEqual(train_response.status_code, 404)
        self.assertEqual(get_profile_response.status_code, 404)
        self.assertEqual(put_profile_response.status_code, 404)
        self.assertEqual(code_response.status_code, 404)

    def test_survey_save_requires_bearer_token(self) -> None:
        """내 설문 결과 저장 경로는 Bearer JWT 없이는 접근할 수 없어야 한다."""

        response = self.client.put(
            "/surveys/me/profile",
            json={
                "profile_code": "r3A0TR6Q0T0T0T0T",
                "top_k": 3,
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_authenticated_survey_save_and_get_roundtrip(self) -> None:
        """JWT 사용자 기준 설문 결과 저장 후 다시 조회할 수 있어야 한다."""

        preview_response = self.client.post(
            "/surveys/active/preview",
            json={
                "top_k": 3,
                "preferred_category_code": "CS100001",
                "profile_name": "저장 전 설문",
                "answers": self.SURVEY_ANSWERS,
            },
        )
        self.assertEqual(preview_response.status_code, 200)
        preview_payload = preview_response.json()
        auth_user_uuid = "85d9ee80-7047-4011-b5be-e4150319f858"
        auth_context = AuthUserContext(
            auth_user_uuid=auth_user_uuid,
            jwt_payload={"user_profile": {"uuid": auth_user_uuid}},
        )

        with patch("app.api.deps.verify_bearer_token", new=AsyncMock(return_value=auth_context)):
            save_response = self.client.put(
                "/surveys/me/profile",
                headers={"Authorization": "Bearer test-token"},
                json={
                    "profile_code": preview_payload["prediction"]["profile_code"],
                    "survey_response_id": preview_payload["survey_response_id"],
                    "profile_name": "내 설문 저장본",
                    "top_k": 3,
                },
            )

            self.assertEqual(save_response.status_code, 200)
            save_payload = save_response.json()
            self.assertEqual(save_payload["profile"]["auth_user_uuid"], auth_user_uuid)
            self.assertEqual(save_payload["profile"]["user_profile"]["profile_name"], "내 설문 저장본")
            self.assertEqual(save_payload["profile"]["survey_code"], "A")
            self.assertEqual(save_payload["survey_response_id"], preview_payload["survey_response_id"])

            get_response = self.client.get(
                "/surveys/me/profile",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(get_response.status_code, 200)
        get_payload = get_response.json()
        self.assertEqual(get_payload["profile"]["auth_user_uuid"], auth_user_uuid)
        self.assertEqual(get_payload["profile"]["profile_code"], save_payload["profile"]["profile_code"])
        self.assertEqual(get_payload["profile"]["raw_answers"]["q1"], "A")
        self.assertEqual(get_payload["prediction"]["survey_code"], "A")


if __name__ == "__main__":
    unittest.main()
