from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

TEST_DATABASE_PATH = Path(tempfile.gettempdir()) / "onboarding-service-test.sqlite3"
if TEST_DATABASE_PATH.exists():
    TEST_DATABASE_PATH.unlink()

os.environ["ONBOARDING_SERVICE_DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DATABASE_PATH}"
os.environ["ONBOARDING_SERVICE_AUTO_CREATE_SCHEMA"] = "true"

from app.main import app
from app.models.onboarding_two_tower.runtime import train_runtime


class TwoTowerApiTestCase(unittest.TestCase):
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

    def test_catalog_endpoint_returns_controls_and_preview(self) -> None:
        """카탈로그 엔드포인트는 예제 화면 초기 렌더링에 필요한 데이터를 준다."""

        response = self.client.get("/two-tower/catalog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_id"], "onboarding_two_tower")
        self.assertEqual(payload["profile_code_prefix"], "r")
        self.assertEqual(payload["profile_schema_version"], 2)
        self.assertGreater(len(payload["feature_controls"]), 0)
        self.assertGreater(len(payload["sample_profiles"]), 0)
        self.assertGreater(len(payload["item_preview"]), 0)

    def test_predict_endpoint_returns_ranked_recommendations(self) -> None:
        """예측 엔드포인트는 유저 타워 입력을 그대로 반영해 추천을 정렬한다."""

        response = self.client.post(
            "/two-tower/predict",
            json={
                "top_k": 5,
                "user_profile": {
                    "user_id": "test-user",
                    "profile_name": "테스트 제과형",
                    "preferred_category_code": "CS100005",
                    "budget_level": 0.25,
                    "stability_level": 1.0,
                    "subway_dependency_level": 0.25,
                    "weekend_preference_level": 0.5,
                    "evening_preference_level": 0.25,
                    "resident_focus_level": 1.0,
                    "worker_focus_level": 0.0,
                    "rent_sensitivity_level": 1.0,
                    "competition_tolerance_level": 0.0,
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user_profile"]["preferred_category_code"], "CS100005")
        self.assertEqual(len(payload["recommendations"]), 5)
        self.assertTrue(payload["profile_code"].startswith("r"))
        self.assertEqual(payload["profile_schema_version"], 2)
        self.assertIn(
            "제과점",
            [item["service_category_name"] for item in payload["recommendations"][:3]],
        )

    def test_openapi_contains_two_tower_paths(self) -> None:
        """OpenAPI 문서는 예제 페이지가 쓰는 핵심 경로를 노출해야 한다."""

        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("/two-tower/catalog", payload["paths"])
        self.assertIn("/two-tower/predict", payload["paths"])
        self.assertIn("/two-tower/train", payload["paths"])
        self.assertIn("/two-tower/profiles/users/{auth_user_uuid}", payload["paths"])
        self.assertIn("/two-tower/profiles/code/{profile_code}", payload["paths"])

    def test_put_and_get_saved_profile_roundtrip(self) -> None:
        """사용자 저장 프로필은 UUID 기준으로 수정 후 다시 조회할 수 있어야 한다."""

        auth_user_uuid = "123e4567-e89b-12d3-a456-426614174000"
        response = self.client.put(
            f"/two-tower/profiles/users/{auth_user_uuid}",
            json={
                "top_k": 3,
                "source": "manual",
                "raw_answers": {"q1": "안정적인 생활", "q2": "주거 밀착 상권"},
                "user_profile": {
                    "user_id": "saved-user",
                    "profile_name": "저장 테스트 프로필",
                    "preferred_category_code": "CS100005",
                    "budget_level": 0.25,
                    "stability_level": 1.0,
                    "subway_dependency_level": 0.25,
                    "weekend_preference_level": 0.5,
                    "evening_preference_level": 0.25,
                    "resident_focus_level": 1.0,
                    "worker_focus_level": 0.0,
                    "rent_sensitivity_level": 1.0,
                    "competition_tolerance_level": 0.0,
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["profile"]["auth_user_uuid"], auth_user_uuid)
        self.assertEqual(payload["profile"]["user_profile"]["profile_name"], "저장 테스트 프로필")
        self.assertEqual(payload["profile"]["raw_answers"]["q1"], "안정적인 생활")
        self.assertEqual(payload["prediction"]["profile_code"], payload["profile"]["profile_code"])
        self.assertEqual(payload["prediction"]["user_profile"]["profile_name"], "저장 테스트 프로필")

        get_response = self.client.get(f"/two-tower/profiles/users/{auth_user_uuid}")

        self.assertEqual(get_response.status_code, 200)
        get_payload = get_response.json()
        self.assertEqual(get_payload["profile"]["profile_code"], payload["profile"]["profile_code"])
        self.assertEqual(get_payload["prediction"]["top_k"], 5)

    def test_profile_code_endpoint_returns_decoded_prediction(self) -> None:
        """공유 코드는 별도 사용자 저장 없이도 추천 결과를 복원해야 한다."""

        predict_response = self.client.post(
            "/two-tower/predict",
            json={
                "top_k": 3,
                "user_profile": {
                    "user_id": "shared-demo",
                    "profile_name": "공유 테스트",
                    "preferred_category_code": "CS100003",
                    "budget_level": 0.5,
                    "stability_level": 0.5,
                    "subway_dependency_level": 1.0,
                    "weekend_preference_level": 0.25,
                    "evening_preference_level": 0.25,
                    "resident_focus_level": 0.0,
                    "worker_focus_level": 1.0,
                    "rent_sensitivity_level": 0.5,
                    "competition_tolerance_level": 0.5,
                },
            },
        )
        profile_code = predict_response.json()["profile_code"]

        response = self.client.get(f"/two-tower/profiles/code/{profile_code}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload["profile"]["auth_user_uuid"])
        self.assertEqual(payload["profile"]["source"], "shared_url")
        self.assertEqual(payload["prediction"]["profile_code"], profile_code)
        self.assertEqual(payload["prediction"]["user_profile"]["preferred_category_code"], "CS100003")


if __name__ == "__main__":
    unittest.main()
