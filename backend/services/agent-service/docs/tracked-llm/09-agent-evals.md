# LLM LangGraph SSE Eval Harness 문서

## 1. 개요

본 문서는 `llm/evals` 디렉터리에 구현된 LLM SSE 응답 테스트용 eval harness의 구조, 실행 방법, 테스트 케이스 추가 방법, 검증 원리를 정리한 문서이다.

해당 eval harness는 LLM 서버의 LangGraph 호환 SSE 스트리밍 응답을 실제 HTTP 요청으로 수집한 뒤, 수집된 이벤트를 validator로 검증하는 도구이다. 검증 대상은 최종 응답 텍스트만이 아니다. SSE 이벤트 발생 여부, 도구 호출 여부, 도구 호출 인자, LangGraph interrupt 발생 여부, resume 이후 실행 결과도 함께 검증한다.

> 현재 public chat 실행 계약은 `/api/v1/langgraph/**`이다. 과거 `/api/v1/chat/stream-sessions` 기반 one-shot session 문서는 사용하지 않는다.

---

## 2. 디렉터리 구조

```text
llm/evals/
  README.md
  ATTRIBUTION.md
  config.yaml
  scenarios/
    calculator-add-tool.yaml
    calculator-divide-hitl.yaml
  agent_eval/
    __main__.py
    client.py
    config_loader.py
    models.py
    runner.py
    sse.py
    validators.py
    metrics.py
    reports.py
```

각 파일의 역할은 다음과 같다.

| 경로 | 역할 |
| ---- | ---- |
| `README.md` | eval 실행 방법과 기본 사용법을 설명한다. |
| `ATTRIBUTION.md` | Goose, Cline eval 시스템에서 참고한 구조와 링크를 정리한다. |
| `config.yaml` | runner, scenario matrix, 반복 실행 수, API 설정을 정의한다. |
| `scenarios/*.yaml` | 개별 eval scenario를 정의한다. |
| `agent_eval/__main__.py` | CLI 진입점이다. |
| `agent_eval/client.py` | LLM 서버의 `/api/v1/langgraph/**` API와 SSE endpoint를 호출한다. |
| `agent_eval/config_loader.py` | config와 scenario YAML을 로드한다. |
| `agent_eval/models.py` | config, scenario, stream record, result dataclass를 정의한다. |
| `agent_eval/runner.py` | scenario 실행, multi-turn thread 유지, HITL resume, report 생성을 orchestration한다. |
| `agent_eval/sse.py` | SSE frame 파싱과 stream record 생성을 담당한다. |
| `agent_eval/validators.py` | deterministic validator를 구현한다. |
| `agent_eval/metrics.py` | pass/fail/flaky metric을 계산한다. |
| `agent_eval/reports.py` | JSON/Markdown report를 생성한다. |

---

## 3. 실행 방법

먼저 `llm` 서버를 실행한다.

```bash
cd llm
uv run fastapi dev src/main.py
```

다른 쉘에서 eval을 실행한다.

```bash
cd llm
uv run python -m evals.agent_eval --config evals/config.yaml
```

특정 scenario만 실행한다.

```bash
uv run python -m evals.agent_eval \
  --config evals/config.yaml \
  --scenario calculator-divide-hitl
```

runner는 기본적으로 환경 변수에서 `API_KEY`를 읽어 `X-API-Key` header로 전송한다.

---

## 4. 실행 흐름

단일 turn 실행 흐름은 다음이다.

```text
POST /api/v1/langgraph/threads
  -> thread_id 확보

POST /api/v1/langgraph/threads/{thread_id}/runs/stream
  body.input.messages = [{type: human, content: prompt}]
  body.context.model / reasoning_effort / allowed_tools / interrupt_on
  -> SSE records 수집

interrupt가 있고 scenario.resume이 있으면:
POST /api/v1/langgraph/threads/{thread_id}/runs/stream
  body.command.resume.decisions = [...]
  -> resume SSE records 수집

combined records
  -> validators
  -> report
```

Multi-turn scenario에서는 첫 turn에서 얻은 `thread_id`를 다음 turn의 run stream URL에 그대로 사용한다.

---

## 5. Scenario shape

단일 turn scenario:

```yaml
name: calculator-add-tool
description: add 도구 실행 검증.
tags:
  - calculator
  - tool

prompt: |
  add 도구를 사용하여 2 + 3을 계산하세요.

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
```

Scenario 주요 필드:

| 필드 | 설명 |
| ---- | ---- |
| `name` | scenario 이름이다. |
| `description` | scenario 설명이다. |
| `tags` | scenario 분류용 태그이다. |
| `prompt` | 모델에 전달할 사용자 입력이다. |
| `turns` | multi-turn scenario에서 turn 목록을 정의한다. |
| `allowed_tools` | run `context.allowed_tools`로 전달할 tool allowlist다. |
| `interrupt_on` | run `context.interrupt_on`으로 전달할 tool별 HITL 정책이다. |
| `resume` | interrupt 발생 후 보낼 `command.resume` decision 설정이다. |
| `validate` | 실행 결과에 적용할 validator 목록이다. |

---

## 6. HITL scenario 작성 방식

HITL scenario는 `interrupt_on`과 `resume` 필드를 사용한다.

```yaml
name: calculator-divide-hitl
description: divide 도구 호출 시 interrupt가 발생하고 승인 후 실행되는지 검증한다.

prompt: |
  divide 도구를 사용하여 10 / 2를 계산하라. 결과를 답변하라.

allowed_tools: [add, subtract, multiply]

interrupt_on:
  divide:
    allowed_decisions: [approve, reject]

resume:
  decision: approve

validate:
  - type: no_error
  - type: interrupt_required
    action_names: [divide]
  - type: tool_called
    tool: divide
    args:
      a: "10"
      b: "2"
  - type: final_text_matches
    regex: "\\b5\\b"
```

동작 순서는 다음과 같다.

1. 최초 run은 `allowed_tools`에 `divide`를 포함하지 않는다.
2. 모델이 `divide` 도구 실행을 시도하면 `approval_gate`가 interrupt를 발생시킨다.
3. runner는 `values` event data의 `__interrupt__` payload를 탐지한다.
4. runner는 `resume.decision` 값에 따라 `decisions` 배열을 만든다.
5. resume run은 `command.resume` payload로 전송된다.
6. validator는 최초 stream과 resume stream을 합친 전체 records를 검증한다.

Resume payload 예시:

```json
{
  "command": {
    "resume": {
      "decisions": [
        {"type": "approve"}
      ]
    }
  },
  "stream_mode": ["values", "messages", "tools", "updates"]
}
```

Decision은 `tool_call_id`를 포함하지 않는다. `action_requests` 순서와 같은 위치의 decision이 적용된다.

---

## 7. Multi-turn scenario 작성 방식

Multi-turn scenario는 `prompt` 대신 `turns`를 사용한다.

```yaml
name: calculator-two-turn
description: 두 개의 turn에서 계산 흐름을 검증한다.
tags:
  - calculator
  - multi-turn

turns:
  - prompt: |
      add 도구를 사용하여 1 + 2를 계산하라.
    allowed_tools: [add, subtract, multiply, divide]
    validate:
      - type: no_error
      - type: tool_called
        tool: add
        args:
          a: "1"
          b: "2"
      - type: final_text_matches
        regex: "\\b3\\b"

  - prompt: |
      방금 결과에 multiply 도구로 10을 곱하라.
    allowed_tools: [add, subtract, multiply, divide]
    validate:
      - type: no_error
      - type: tool_called
        tool: multiply
        args:
          b: "10"
      - type: final_text_matches
        regex: "\\b30\\b"
```

multi-turn 실행에서는 이전 turn의 `thread_id`를 다음 turn run에 전달한다. 이 방식으로 동일 conversation checkpoint에서 후속 요청을 실행한다.

---

## 8. Validator 목록

현재 구현된 validator는 다음과 같다.

| Validator | 검증 내용 |
| --------- | --------- |
| `no_error` | SSE stream에 `event: error`가 없는지 검증한다. |
| `event_seen` | 특정 SSE event가 등장했는지 검증한다. |
| `event_absent` | 특정 SSE event가 등장하지 않았는지 검증한다. |
| `interrupt_required` | LangGraph interrupt payload가 발생했는지 검증한다. |
| `tool_called` | 특정 도구가 호출되었는지 검증한다. |
| `final_text_contains` | 최종 모델 텍스트에 특정 문자열이 포함되는지 검증한다. |
| `final_text_matches` | 최종 모델 텍스트가 정규식과 매칭되는지 검증한다. |
| `file_exists` | workdir 안에 특정 파일이 존재하는지 검증한다. |
| `file_not_empty` | 특정 파일이 비어 있지 않은지 검증한다. |
| `file_contains` | 특정 파일에 문자열이 포함되는지 검증한다. |
| `file_matches` | 특정 파일 내용이 정규식과 매칭되는지 검증한다. |
| `file_not_matches` | 특정 파일 내용이 정규식과 매칭되지 않는지 검증한다. |
| `command_succeeds` | workdir에서 shell command가 성공하는지 검증한다. |

과거 `done` validator는 one-shot chat stream의 terminal event에 의존했다. LangGraph run stream에서는 연결 종료와 `metadata.status`가 종료 상태를 나타내므로 새 scenario에는 `done`을 추가하지 않는다.

### 8.1 `tool_called` args 매칭

`tool_called` validator는 tool name과 args를 검증한다.

```yaml
validate:
  - type: tool_called
    tool: add
    args:
      a: "2"
      b: "/^3$/"
```

args 기대값이 일반 문자열이면 substring 방식으로 비교한다. 기대값이 `/.../` 형태이면 정규식으로 비교한다.

---

## 9. SSE 파싱 방식

SSE 응답은 빈 줄 기준으로 frame을 구분한다.

```text
id: 1
event: messages
data: [{"content":"hi","type":"AIMessageChunk"},{"langgraph_node":"chat_model"}]

id: 2
event: tools
data: {"event":"on_tool_start","toolCallId":"call-1","name":"add","input":{"a":2,"b":3}}
```

`agent_eval/sse.py`는 각 frame에서 `event`와 `data`를 추출한다. `data`는 JSON으로 파싱한다. 파싱 결과는 내부적으로 `StreamRecord`로 표현된다.

```text
StreamRecord(event, data, raw)
```

모델 텍스트는 주로 `messages` event에서 수집한다. `messages` event data는 LangGraph SDK token stream과 같이 message chunk와 metadata 쌍을 담는다.

```json
[
  {"content":"안","type":"AIMessageChunk","id":"..."},
  {"langgraph_node":"chat_model"}
]
```

Tool 호출은 `tools` event data의 SDK tool event에서 수집한다.

```json
{
  "event": "on_tool_start",
  "toolCallId": "call-1",
  "name": "add",
  "input": {"a": 2, "b": 3}
}
```

---

## 10. Interrupt 탐지 방식

LangGraph interrupt는 `values` event data의 `__interrupt__` payload에서 탐지한다.

예시는 다음과 같다.

```json
{
  "messages": [],
  "__interrupt__": [
    {
      "id": "interrupt-1",
      "value": {
        "action_requests": [
          {"name": "divide", "args": {"a": 10, "b": 2}}
        ],
        "review_configs": [
          {"action_name": "divide", "allowed_decisions": ["approve", "reject"]}
        ]
      }
    }
  ]
}
```

runner는 `__interrupt__` 내부의 `action_requests`를 확인한다. 이후 scenario의 `resume` 설정을 읽고 resume command payload를 구성한다.

승인 예시는 다음과 같다.

```yaml
resume:
  decision: approve
```

이 설정은 interrupt된 action request 수만큼 `{type: approve}` decision을 만든다. resume 요청에서 `allowed_tools`를 다시 지정하지 않는다.

---

## 11. Metric 계산

반복 실행 결과는 task 단위로 집계한다.

상태 값은 다음과 같다.

| 상태 | 의미 |
| ---- | ---- |
| `pass` | 모든 trial이 성공한 상태이다. |
| `fail` | 모든 trial이 실패한 상태이다. |
| `flaky` | 일부 trial은 성공하고 일부 trial은 실패한 상태이다. |

`metrics.py`는 trial 결과를 바탕으로 summary metric을 계산한다. 반복 실행 수는 `config.yaml`의 `run.repetitions` 또는 CLI의 `--repetitions` 값으로 결정한다.

---

## 12. 리포트 출력

실행 결과는 report directory에 저장된다.

```text
evals/reports/<timestamp>/report.json
evals/reports/<timestamp>/summary.md
evals/reports/<timestamp>/responses.md
evals/reports/latest -> <timestamp>
evals/.workdir/<scenario_runner_attempt>/trial-log.json
```

각 파일의 내용은 다음과 같다.

| 파일 | 내용 |
| ---- | ---- |
| `report.json` | 전체 실행 결과, task 결과, trial 결과, validator 결과, metric을 포함한다. |
| `summary.md` | 실행 결과 요약을 Markdown 형식으로 기록한다. |
| `responses.md` | scenario별 모델 응답과 주요 이벤트를 기록한다. |
| `trial-log.json` | 개별 trial의 상세 로그를 기록한다. |
| `latest` | 가장 최근 report directory를 가리킨다. |

---

## 13. 현재 포함된 Scenario

### 13.1 `calculator-add-tool`

`calculator-add-tool`은 `add` 도구 호출을 검증하는 scenario이다.

검증 항목은 다음과 같다.

- SSE error 이벤트가 없는지 검증한다.
- `messages` 이벤트가 발생했는지 검증한다.
- `add` 도구가 호출되었는지 검증한다.
- `add` 도구 인자에 `a=2`, `b=3`이 포함되는지 검증한다.
- 최종 모델 텍스트가 `5`와 매칭되는지 검증한다.

### 13.2 `calculator-divide-hitl`

`calculator-divide-hitl`은 `divide` 도구 호출 시 HITL interrupt가 발생하고, 승인 후 도구가 실행되는지 검증하는 scenario이다.

검증 항목은 다음과 같다.

- SSE error 이벤트가 없는지 검증한다.
- `divide` action에 대한 interrupt가 발생했는지 검증한다.
- resume 이후 `divide` 도구가 호출되었는지 검증한다.
- `divide` 도구 인자에 `a=10`, `b=2`가 포함되는지 검증한다.
- 최종 모델 텍스트가 `5`와 매칭되는지 검증한다.

---

## 14. 참고 구조

`ATTRIBUTION.md`에는 Goose Open Model Gym과 Cline eval 시스템에 대한 참고 링크가 포함되어 있다.

본 프로젝트는 해당 참고 구조 중 matrix 실행, YAML scenario, validator, metric, report 생성 방식을 SSE 기반 LLM 서버 검증 흐름에 맞춰 사용한다.

---

## 15. 작성 기준

본 eval harness 문서를 수정할 때 적용할 기준은 다음과 같다.

- 확인된 파일과 코드 기준으로 작성한다.
- 추정과 평가는 본문 설명에 섞지 않는다.
- 사용법, 구조, 실행 흐름, validator 동작을 분리한다.
- 문체는 이다/다 체로 통일한다.
- 동일한 설명을 여러 섹션에서 반복하지 않는다.
- 외부 참고 링크는 참고 구조 설명에만 사용한다.

---

## 16. 요약

`llm/evals`는 LLM 서버의 LangGraph 호환 SSE 스트리밍 응답을 end-to-end로 검증하는 eval harness이다. config matrix를 기준으로 scenario와 runner 조합을 실행하고, SSE events를 수집한 뒤 validator로 결과를 판정한다.

주요 검증 대상은 다음과 같다.

- SSE error 발생 여부
- 특정 SSE event 발생 여부
- 도구 호출 여부
- 도구 호출 인자
- LangGraph interrupt 발생 여부
- resume 이후 도구 실행 여부
- 최종 모델 텍스트
- 파일 생성 및 파일 내용
- shell command 성공 여부

실행 결과는 JSON 및 Markdown 리포트로 저장된다. 반복 실행 결과는 pass, fail, flaky 상태로 집계된다.
