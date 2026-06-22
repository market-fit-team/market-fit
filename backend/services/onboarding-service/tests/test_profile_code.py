from __future__ import annotations

import unittest

from app.two_tower.codecs import (
    InvalidResultCodeError,
    build_share_path,
    generate_result_code,
    normalize_result_code,
)


class ResultCodeTestCase(unittest.TestCase):
    def test_generate_result_code_builds_normalized_public_code(self) -> None:
        """공개 결과 코드는 소문자 base36 형식으로 정규화돼야 한다."""

        result_code = generate_result_code()
        normalized = normalize_result_code(result_code)

        self.assertEqual(result_code, normalized)
        self.assertTrue(result_code.startswith("r"))
        self.assertEqual(len(result_code), 16)
        self.assertEqual(build_share_path(result_code), f"/onboarding/result/{result_code}")

    def test_invalid_result_code_raises_error(self) -> None:
        """지원하지 않는 형식의 결과 코드는 예외로 거절해야 한다."""

        with self.assertRaises(InvalidResultCodeError):
            normalize_result_code("invalid")


if __name__ == "__main__":
    unittest.main()
