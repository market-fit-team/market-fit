from __future__ import annotations

import unittest

from app.two_tower.codecs import decode_profile_code, encode_profile_code


class ProfileCodeTestCase(unittest.TestCase):
    def test_profile_code_roundtrip_preserves_category_and_scores(self) -> None:
        """공유 코드는 업종과 9개 점수를 손실 없이 왕복 복원해야 한다."""

        payload = {
            "user_id": "roundtrip-user",
            "profile_name": "라운드트립",
            "preferred_category_code": "CS100005",
            "budget_level": 0.23,
            "stability_level": 0.91,
            "subway_dependency_level": 0.02,
            "weekend_preference_level": 0.48,
            "evening_preference_level": 0.27,
            "resident_focus_level": 0.88,
            "worker_focus_level": 0.1,
            "rent_sensitivity_level": 0.95,
            "competition_tolerance_level": 0.05,
        }

        profile_code = encode_profile_code(payload)
        decoded = decode_profile_code(profile_code)

        self.assertEqual(len(profile_code), 15)
        self.assertEqual(decoded["preferred_category_code"], payload["preferred_category_code"])
        self.assertAlmostEqual(decoded["budget_level"], payload["budget_level"])
        self.assertAlmostEqual(decoded["competition_tolerance_level"], payload["competition_tolerance_level"])

    def test_legacy_profile_code_still_decodes(self) -> None:
        """기존 1~5 기반 공유 코드도 새 0~1 스키마로 복원할 수 있어야 한다."""

        decoded = decode_profile_code("r131A1N0K")

        self.assertEqual(decoded["preferred_category_code"], "CS100005")
        self.assertAlmostEqual(decoded["budget_level"], 0.25)
        self.assertAlmostEqual(decoded["stability_level"], 1.0)

    def test_invalid_profile_code_raises_error(self) -> None:
        """잘못된 공유 코드는 예외로 거절해야 한다."""

        with self.assertRaises(ValueError):
            decode_profile_code("invalid")


if __name__ == "__main__":
    unittest.main()
