"""평가 하네스를 위해 고정된 원본 출처(Upstream source) 참조.

이 프로젝트는 Goose나 Cline 코드를 그대로 복사(vendor)하지 않습니다.
``llm/evals/agent_eval`` 아래의 파일들은 해당 저장소들의 특정 부분들을
Python으로 각색한 것이며, 이 llm 서비스를 위한 로컬 HTTP/SSE 동작이 추가되었습니다.
"""

GOOSE_COMMIT = "ba16de9738ec5bc319adbddeb9dd6523475fc7c0"
CLINE_COMMIT = "4bec5931f6aa5ee91c8220d1fa4cc5e310a6b705"

GOOSE_BASE_URL = f"https://github.com/aaif-goose/goose/blob/{GOOSE_COMMIT}"
CLINE_BASE_URL = f"https://github.com/cline/cline/blob/{CLINE_COMMIT}"

GOOSE_TYPES = f"{GOOSE_BASE_URL}/evals/open-model-gym/suite/src/types.ts"
GOOSE_RUNNER = f"{GOOSE_BASE_URL}/evals/open-model-gym/suite/src/runner.ts"
GOOSE_VALIDATOR = f"{GOOSE_BASE_URL}/evals/open-model-gym/suite/src/validator.ts"
GOOSE_README = f"{GOOSE_BASE_URL}/evals/open-model-gym/README.md"

CLINE_METRICS = f"{CLINE_BASE_URL}/evals/analysis/src/metrics.ts"
CLINE_SMOKE_RUNNER = f"{CLINE_BASE_URL}/evals/smoke-tests/run-smoke-tests.ts"
CLINE_EVALS_README = f"{CLINE_BASE_URL}/evals/README.md"
