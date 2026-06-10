# Eval Harness 출처 (Attribution)

이 디렉터리는 `llm`을 위한 로컬 Python eval harness(평가 도구)를 구현합니다.

이 코드는 Goose나 Cline의 사본(vendored copy)이 아닙니다. 특정 파일들의 핵심 아이디어를 차용하여 Python으로 작게 각색한 것이며, 다음 커밋을 기준으로 합니다:

- Goose: `aaif-goose/goose@ba16de9738ec5bc319adbddeb9dd6523475fc7c0`
- Cline: `cline/cline@4bec5931f6aa5ee91c8220d1fa4cc5e310a6b705`

## Goose 기반 구조

원본 파일:

- `evals/open-model-gym/config.yaml`
- `evals/open-model-gym/suite/src/types.ts`
- `evals/open-model-gym/suite/src/runner.ts`
- `evals/open-model-gym/suite/src/validator.ts`
- `evals/open-model-gym/suite/scenarios/*.yaml`

아이디어를 차용한 로컬 파일:

- `config.yaml`: Goose의 매트릭스 스타일 suite 설정을 유지하되, runner 항목은 이 FastAPI 서비스를 위한 HTTP/SSE 타겟으로 설정합니다.
- `scenarios/*.yaml`: Goose의 `name`, `description`, `prompt`, `setup`, `validate`, `turns`, `tags` 형식을 유지합니다.
- `agent_eval/models.py`: Goose의 scenario, turn, validation, run result 형태를 Python 데이터 클래스로 구현하고, 로컬 HITL/SSE 필드를 추가했습니다.
- `agent_eval/config_loader.py`: Goose의 scenario/config 로딩 및 테스트 조합(pair) 확장 로직을 Python 버전으로 구현했습니다.
- `agent_eval/validators.py`: Goose의 결정론적 파일/명령어 검증기 및 `tool_called` 인자 매칭 시맨틱을 Python 버전으로 구현하고, 로컬 SSE 검증기를 추가했습니다.
- `agent_eval/runner.py`: 반복 시도 후 최악의 결과를 선택하는 Goose의 방식을 따르되, CLI 에이전트 대신 이 저장소의 HTTP/SSE 채팅 API를 실행합니다.

## Cline 기반 구조

원본 파일:

- `evals/analysis/src/metrics.ts`
- `evals/smoke-tests/run-smoke-tests.ts`

아이디어를 차용한 로컬 파일:

- `agent_eval/metrics.py`: Cline의 `pass@k`, `pass^k`, flakiness, 그리고 pass/fail/flaky 상태 판별 공식을 Python으로 구현했습니다. Cline의 `c >= k` 단축 평가 대신 문서화된 `pass@k` 공식을 직접 평가하도록 의도적으로 구현하여, `pass@1`이 반복 시도에 대한 실제 통과율(observed pass rate)로 유지되게 했습니다.
- `agent_eval/reports.py`: Cline 스모크 테스트의 JSON 리포트 및 Markdown 요약 패턴을 사용하되, 모델/시나리오 단위의 리포팅에서 runner/시나리오 단위 리포팅으로 각색했습니다.
- `agent_eval/runner.py`: Cline의 반복 시도/리포팅 워크플로우에서 리포팅 방식을 참고하고, Goose 스타일의 매트릭스 확장을 유지했습니다.

## 로컬 전용 파일

다음 파일들은 이 저장소의 고유한 파일입니다:

- `agent_eval/client.py`: `POST /api/v1/langgraph/threads`, Protocol V2 SSE `POST /stream/events`, `POST /commands`, 및 HITL `input.respond` 검증용 HTTP 클라이언트.
- `agent_eval/sse.py`: eval 하네스에서 Protocol V2 SSE frame을 검증하기 위한 파서 및 헬퍼 함수. 프로덕션 프론트엔드는 공식 `@langchain/react` transport를 사용합니다.
- `agent_eval/__main__.py`, `agent_eval/__init__.py`, `__init__.py`.
