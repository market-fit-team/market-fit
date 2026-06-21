from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.models.onboarding_two_tower.runtime import train_runtime


class TwoTowerApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        """테스트 시작 전에 경량 학습으로 artifact와 런타임 캐시를 맞춘다."""

        train_runtime(epochs=1)
        cls.client = TestClient(app)

    def test_catalog_endpoint_returns_controls_and_preview(self) -> None:
        """카탈로그 엔드포인트는 예제 화면 초기 렌더링에 필요한 데이터를 준다."""

        response = self.client.get("/two-tower/catalog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_id"], "onboarding_two_tower")
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
                    "budget_level": 2,
                    "stability_level": 5,
                    "subway_dependency_level": 2,
                    "weekend_preference_level": 3,
                    "evening_preference_level": 2,
                    "resident_focus_level": 5,
                    "worker_focus_level": 1,
                    "rent_sensitivity_level": 5,
                    "competition_tolerance_level": 1,
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user_profile"]["preferred_category_code"], "CS100005")
        self.assertEqual(len(payload["recommendations"]), 5)
        self.assertEqual(payload["recommendations"][0]["service_category_name"], "제과점")

    def test_openapi_contains_two_tower_paths(self) -> None:
        """OpenAPI 문서는 예제 페이지가 쓰는 핵심 경로를 노출해야 한다."""

        response = self.client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("/two-tower/catalog", payload["paths"])
        self.assertIn("/two-tower/predict", payload["paths"])
        self.assertIn("/two-tower/train", payload["paths"])


if __name__ == "__main__":
    unittest.main()
