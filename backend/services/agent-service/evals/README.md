# LLM Evals

이 폴더에는 FastAPI/LangGraph `llm` 서버를 위한 로컬 eval harness(평가 도구)가 포함되어 있습니다.

suite 설정, 시나리오, 결정론적 검증기(deterministic validators), 반복 시도 및 최악의 결과 선택 등은 Goose Open Model Gym의 형태를 따릅니다. 또한 Cline의 pass@k/pass^k/flakiness 지표를 포팅하여 사용합니다.

정확한 원본 파일과 고정된 커밋은 `ATTRIBUTION.md`를 참고하세요.

## 실행 방법 (Run)

먼저 LangGraph Agent Server를 Protocol V2 event streaming으로 실행합니다:

```bash
cd backend/services/agent-service
FF_V2_EVENT_STREAMING=true uv run langgraph dev --no-browser
```

다른 쉘에서 다음을 실행합니다:

```bash
cd backend/services/agent-service
uv run python -m evals.agent_eval --config evals/config.yaml
```

runner는 Agent Server 네이티브 `/threads`, `/stream/events`, `/commands`를 직접 호출합니다.
`API_KEY`가 설정되어 있으면 `X-API-Key` 헤더도 함께 전송합니다.

## 결과물 (Output)

생성된 파일들은 git에 의해 무시됩니다:

```text
evals/reports/<timestamp>/report.json
evals/reports/<timestamp>/summary.md
evals/reports/latest -> <timestamp>
evals/.workdir/<scenario_runner_attempt>/trial-log.json
```

## 시나리오 형태 (Scenario Shape)

단일 턴(Single-turn):

```yaml
name: calculator-add-tool
description: add 도구 실행 검증.
prompt: |
  add 도구를 사용하여 2 + 3을 계산하세요.
allowed_tools: [add, subtract, multiply, divide]
validate:
  - type: tool_called
    tool: add
    args:
      a: "2"
      b: "3"
```

HITL 재개(resume):

```yaml
prompt: |
  divide 도구를 사용하여 10 / 2를 계산하세요.
allowed_tools: [add, subtract, multiply]
interrupt_on:
  divide:
    allowed_decisions: [approve, reject]
resume:
  decision: approve
```

## 검증기 타입 (Validator Types)

Goose 기반:

- `file_exists`
- `file_not_empty`
- `file_contains`
- `file_matches`
- `file_not_matches`
- `command_succeeds`
- `tool_called`

로컬 SSE 검증기:

- `event_seen`
- `event_absent`
- `no_error`
- `run_completed`
- `interrupt_required`
- `final_text_contains`
- `final_text_matches`
