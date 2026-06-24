from __future__ import annotations

import unittest

import numpy as np

from app.models.onboarding_two_tower.predict import _scale_scores_to_unit_interval


class OnboardingTwoTowerScoreTestCase(unittest.TestCase):
    def test_score_scaling_keeps_values_inside_open_unit_interval(self) -> None:
        """상권 추천 점수는 후보 상대 비교와 무관하게 0과 1 사이에서 유지돼야 한다."""

        raw_scores = np.array([2.0, 1.0, -1.0], dtype=np.float32)

        scaled_scores = _scale_scores_to_unit_interval(raw_scores)

        self.assertGreater(float(scaled_scores[0]), float(scaled_scores[1]))
        self.assertGreater(float(scaled_scores[1]), float(scaled_scores[2]))
        for score in scaled_scores:
            self.assertGreater(float(score), 0.0)
            self.assertLess(float(score), 1.0)

    def test_score_scaling_does_not_depend_on_other_candidates(self) -> None:
        """같은 raw score는 다른 후보가 섞여도 같은 0~1 점수로 매핑돼야 한다."""

        full_scores = _scale_scores_to_unit_interval(np.array([2.0, 1.0, -1.0], dtype=np.float32))
        partial_scores = _scale_scores_to_unit_interval(np.array([2.0, -1.0], dtype=np.float32))

        self.assertAlmostEqual(float(full_scores[0]), float(partial_scores[0]), places=6)
        self.assertAlmostEqual(float(full_scores[2]), float(partial_scores[1]), places=6)


if __name__ == "__main__":
    unittest.main()
