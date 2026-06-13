## evals/config.yaml

`evals/config.yaml`은 local eval harness의 기본 조합표다.

```yaml
run:
  repetitions: 1
  output_dir: reports
  workdir: .workdir
  fail_fast: true

scenarios_dir: scenarios

runners:
  - name: local-agent-server
    type: http_sse
    base_url: http://localhost:2024
    timeout_seconds: 180
    label: 로컬 LangGraph Agent Server

matrix:
  - scenario: calculator-add-tool
    runners: [local-agent-server]
  - scenario: calculator-divide-hitl
    runners: [local-agent-server]
```

`base_url`의 기본값이 `http://localhost:2024`라서, `langgraph dev` 기본 포트와 맞는다.

## langgraph.eval.json

local eval 서버 설정에는 `auth`가 없다.

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "env": ".env",
  "http": {
    "app": "./src/agent/webapp.py:app"
  }
}
```

`evals/agent_eval/client.py`도 `Authorization` 헤더를 만들지 않는다.

```py
def _headers(self, *, accept: str) -> dict[str, str]:
    return {"Accept": accept}
```

## models.py

eval harness의 핵심 shape는 dataclass로 고정돼 있다.

```py
@dataclass(frozen=True, slots=True)
class RunSettings:
    repetitions: int = 1
    output_dir: Path = Path("reports")
    workdir: Path = Path(".workdir")
    fail_fast: bool = True

@dataclass(frozen=True, slots=True)
class RunnerConfig:
    name: str
    type: str
    base_url: str
    timeout_seconds: float = 180.0
    label: str | None = None

@dataclass(frozen=True, slots=True)
class Turn:
    prompt: str
    validate: list[ValidationRule] = field(default_factory=list)
    allowed_tools: list[str] | None = None
    interrupt_on: dict[str, Any] | None = None
    resume: ResumeConfig | None = None
```

`StreamRecord`는 SSE frame을 담는다.

```py
@dataclass(slots=True)
class StreamRecord:
    event: str
    data: dict[str, Any]
    raw: str
```

`TrialResult`는 report와 `trial-log.json`의 기준 단위다.

```py
@dataclass(slots=True)
class TrialResult:
    scenario_name: str
    runner_name: str
    attempt: int
    status: RunStatus
    started_at: datetime
    ended_at: datetime
    workdir: Path
    turns: list[TurnResult]
    errors: list[str] = field(default_factory=list)
```

## scenarios/*.yaml

단일 턴 scenario는 `prompt`와 `validate`로 끝난다.

```yaml
name: calculator-add-tool
description: 채팅 에이전트가 add 계산기 도구를 호출하고 SSE 스트림을 완료하는지 검증합니다.
prompt: |
  add 도구를 사용하여 2 + 3을 계산하세요. 그리고 결과로 답변을 작성하세요.
allowed_tools: [add, subtract, multiply, divide]
validate:
  - type: no_error
  - type: event_seen
    event: messages
  - type: tool_called
    tool: add
    args:
      a: "2"
      b: "3"
  - type: final_text_matches
    regex: "\\b5\\b"
  - type: run_completed
```

HITL scenario는 `interrupt_on`과 `resume`를 같이 쓴다.

```yaml
name: calculator-divide-hitl
prompt: |
  divide 도구를 사용하여 10 / 2를 계산하세요. 그리고 결과로 답변을 작성하세요.
allowed_tools: [add, subtract, multiply]
interrupt_on:
  divide:
    allowed_decisions: [approve, reject]
resume:
  decision: approve
  allowed_tools: [add, subtract, multiply, divide]
```

`Scenario.normalized_turns()`는 `turns`가 없으면 `prompt` 하나를 `Turn`으로 바꾼다.

## runner.py

실행 흐름은 `load_suite()` → `build_test_pairs()` → `run_trial()` → `build_report()` → `write_report()`다.

```text
suite(config.yaml)
  -> scenarios/*.yaml
  -> matrix
  -> (scenario, runner) pairs
  -> repetitions
  -> report.json / summary.md / responses.md
```

`scenario_filter`와 `runner_filter`는 콤마로 분리한 문자열을 부분 일치로 거른다. `fail_fast`는 pair 안에서 첫 실패 trial 뒤에 멈춘다.

```py
for turn in pair.scenario.normalized_turns():
    turn_result = await _run_turn(
        client=client, turn=turn, thread_id=thread_id, workdir=workdir
    )
    thread_id = turn_result.thread_id
    turn_results.append(turn_result)
    failed = [validation for validation in turn_result.validations if not validation.passed]
    if failed:
        errors.extend(validation.message or "validation failed" for validation in failed)
        break
```

`_run_turn()`은 새 thread가 없으면 먼저 만들고, 그 뒤 `run.start`를 보낸다. `turn.resume`가 있으면 `input.requested` frame에서 만든 decision 배열로 `input.respond`를 이어 붙인다.

## validators.py

`validate_rule()`는 아래 타입을 분기한다.

```text
file_exists
file_not_empty
file_contains
file_matches
file_not_matches
command_succeeds
tool_called
event_seen
event_absent
no_error
run_completed
interrupt_required
final_text_contains
final_text_matches
```

`tool_called`는 `messages`와 `tools`에서 protocol v2 tool call만 본다. 인자 비교는 두 방식만 쓴다.

```py
if expected_str.startswith("/") and expected_str.endswith("/"):
    re.search(expected_str[1:-1], actual_str, re.IGNORECASE)
else:
    expected_str.lower() in actual_str.lower()
```

`interrupt_required`는 `input.requested` payload의 `action_requests[].name`을 모은다. `final_text_*`는 `collect_model_text()` 결과에 대해 검사한다.

## reports.py

report는 scenario x runner 단위로 묶는다.

```py
grouped.setdefault((result.scenario_name, result.runner_name), []).append(result)
```

생성 파일은 아래 네 개다.

```text
evals/reports/<timestamp>/report.json
evals/reports/<timestamp>/summary.md
evals/reports/<timestamp>/responses.md
evals/reports/latest -> <timestamp>
```

`trial-log.json`은 각 workdir 안에 남는다.

```text
evals/.workdir/<scenario_runner_attempt>/trial-log.json
```

`pass_at_1`, `pass_at_3`, `pass_caret_3`, `flakiness_score`는 `metrics.py`에서 계산한다. `responses.md`는 `collect_model_text(turn.all_events)`를 찍는다.

## tests/

pytest는 `tests/` 아래만 본다.

```toml
[tool.pytest.ini_options]
addopts = "-p no:cacheprovider"
testpaths = ["tests"]
asyncio_mode = "auto"
pythonpath = ["src", "."]
```

`tests/conftest.py`는 anyio 백엔드를 asyncio로 고정한다.

```py
@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"
```

단위 테스트 트리는 아래 모양이다.

```text
tests/
  conftest.py
  integration_tests/test_graph.py
  unit_tests/test_chat_runtime_context.py
  unit_tests/test_configuration.py
  unit_tests/test_eval_protocol_v2.py
  unit_tests/test_exception_handlers.py
```

`test_chat_runtime_context.py`는 model default와 reasoning effort default를 본다. `test_configuration.py`는 graph compile과 tool catalog를 본다. `test_exception_handlers.py`는 problem detail 응답을 본다. `test_eval_protocol_v2.py`는 SSE frame, `input.requested`, terminal lifecycle, legacy event rejection을 본다.

## tests/integration_tests/test_graph.py

이 smoke test는 provider API key가 하나도 없으면 모듈 로드 단계에서 skip 된다.

```py
if not (
    os.getenv("OLLAMA_API_KEY")
    or os.getenv("OPENROUTER_API_KEY")
    or os.getenv("OPENCODE_ZEN_API_KEY")
):
    pytest.skip("Set a chat provider API key to run integration tests.", allow_module_level=True)
```

실행 본문은 `chat_graph.ainvoke(...)`다.

```py
result = await chat_graph.ainvoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "What is 19*3? Use tools if needed and answer with just the number.",
            }
        ],
        "model": "gpt-oss:120b",
        "reasoning_effort": "medium",
        "allowed_tools": ["multiply"],
        "interrupt_on": {},
    }
)
```

결과 마지막 메시지에 `57`이 들어가야 한다.

## Makefile

```make
test:
	uv run python -m pytest tests/unit_tests -q

integration-tests:
	uv run python -m pytest tests/integration_tests -q
```

`make test`는 unit tree만 달린다. `make integration-tests`는 provider key가 있어야 통과한다.

## 두 터미널

```bash
cd backend/services/agent-service
FF_V2_EVENT_STREAMING=true uv run langgraph dev \
  --config langgraph.eval.json \
  --no-browser
```

```bash
cd backend/services/agent-service
uv run python -m evals.agent_eval --config evals/config.yaml
```

`langgraph dev` 쪽은 `langgraph.eval.json`을 읽고 `http://localhost:2024`에서 뜬다. runner는 그 주소로 `/threads`, `/stream/events`, `/commands`를 직접 친다.

## 주요 파일

- `langgraph.eval.json`
- `langgraph.json`
- `pyproject.toml`
- `Makefile`
- `README.md`
- `evals/config.yaml`
- `evals/README.md`
- `evals/agent_eval/client.py`
- `evals/agent_eval/models.py`
- `evals/agent_eval/runner.py`
- `evals/agent_eval/sse.py`
- `evals/agent_eval/validators.py`
- `evals/agent_eval/reports.py`
- `evals/scenarios/calculator-add-tool.yaml`
- `evals/scenarios/calculator-divide-hitl.yaml`
- `tests/conftest.py`
- `tests/integration_tests/test_graph.py`
- `tests/unit_tests/test_chat_runtime_context.py`
- `tests/unit_tests/test_configuration.py`
- `tests/unit_tests/test_eval_protocol_v2.py`
- `tests/unit_tests/test_exception_handlers.py`

## 참고 문서

- https://docs.langchain.com/langsmith/cli
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- https://docs.langchain.com/langsmith/agent-server-changelog
- https://docs.pytest.org/en/stable/how-to/skipping.html
- https://docs.pytest.org/en/stable/reference/reference.html
