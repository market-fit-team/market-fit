"""평가 시나리오를 위한 검증 규칙(Validation rules).

Goose Open Model Gym 코드를 각색함:
- 파일 및 명령어 검증기들은 ``ba16de9738ec5bc319adbddeb9dd6523475fc7c0`` 커밋의 ``evals/open-model-gym/suite/src/validator.ts`` 에 있는 ``validateRule`` 을 Python으로 각색한 것입니다.
- ``tool_called`` 인자 매칭 동작은 Goose의 정규 표현식 및 대소문자 구분 없는 부분 문자열 시맨틱(semantics)을 따릅니다.

로컬 변경 사항:
- 이 저장소를 위한 SSE 기반 검증기들을 추가했습니다: ``event_seen``, ``event_absent``, ``no_error``, ``done``, ``interrupt_required``, ``final_text_contains``, ``final_text_matches``.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from evals.agent_eval.models import StreamRecord, ValidationResult, ValidationRule
from evals.agent_eval.sse import collect_model_text, interrupt_values, protocol_v2_tool_started


@dataclass(frozen=True, slots=True)
class ValidationContext:
    events: list[StreamRecord]
    workdir: Path

    @property
    def final_text(self) -> str:
        return collect_model_text(self.events)


def validate_all(rules: list[ValidationRule], context: ValidationContext) -> list[ValidationResult]:
    return [validate_rule(rule, context) for rule in rules]


def validate_rule(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    rule_type = str(rule.get("type", ""))
    if rule_type == "file_exists":
        return _file_exists(rule, context)
    if rule_type == "file_not_empty":
        return _file_not_empty(rule, context)
    if rule_type == "file_contains":
        return _file_contains(rule, context)
    if rule_type == "file_matches":
        return _file_matches(rule, context)
    if rule_type == "file_not_matches":
        return _file_not_matches(rule, context)
    if rule_type == "command_succeeds":
        return _command_succeeds(rule, context)
    if rule_type == "tool_called":
        return _tool_called(rule, context)
    if rule_type == "event_seen":
        return _event_seen(rule, context)
    if rule_type == "event_absent":
        return _event_absent(rule, context)
    if rule_type == "no_error":
        return _no_error(rule, context)
    if rule_type == "done":
        return _done(rule, context)
    if rule_type == "interrupt_required":
        return _interrupt_required(rule, context)
    if rule_type == "final_text_contains":
        return _final_text_contains(rule, context)
    if rule_type == "final_text_matches":
        return _final_text_matches(rule, context)
    return _result(rule, False, f"Unknown validation rule type: {rule_type}")


def _file_exists(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    path = _path(rule, context)
    return _result(rule, path.exists(), None if path.exists() else f"File not found: {rule.get('path')}")


def _file_not_empty(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    path = _path(rule, context)
    if not path.exists():
        return _result(rule, False, f"File not found: {rule.get('path')}")
    passed = path.stat().st_size > 0
    return _result(rule, passed, None if passed else f"File is empty: {rule.get('path')}")


def _file_contains(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    path = _path(rule, context)
    if not path.exists():
        return _result(rule, False, f"File not found: {rule.get('path')}")
    pattern = str(rule.get("pattern", ""))
    passed = pattern in path.read_text(encoding="utf-8")
    return _result(rule, passed, None if passed else f"File {rule.get('path')} does not contain: {pattern}")


def _file_matches(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    path = _path(rule, context)
    if not path.exists():
        return _result(rule, False, f"File not found: {rule.get('path')}")
    regex = str(rule.get("regex", ""))
    passed = re.search(regex, path.read_text(encoding="utf-8")) is not None
    return _result(rule, passed, None if passed else f"File {rule.get('path')} does not match regex: {regex}")


def _file_not_matches(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    path = _path(rule, context)
    if not path.exists():
        return _result(rule, False, f"File not found: {rule.get('path')}")
    regex = str(rule.get("regex", ""))
    passed = re.search(regex, path.read_text(encoding="utf-8")) is None
    return _result(rule, passed, None if passed else f"File {rule.get('path')} should not match regex: {regex}")


def _command_succeeds(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    command = str(rule.get("command", ""))
    completed = subprocess.run(command, cwd=context.workdir, shell=True, capture_output=True, text=True, check=False)
    passed = completed.returncode == 0
    message = None if passed else f"Command failed: {command}\n{completed.stderr.strip()}"
    return _result(rule, passed, message)


def _tool_called(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    tool_name = str(rule.get("tool", ""))

    # Protocol V2에서는 tools 채널의 tool-started 이벤트가 도구 실행 시작을 나타냅니다.
    # 기존 eval 시나리오와 호환되도록 legacy on_tool_start와 V2 tools 이벤트를 모두 인정합니다.
    # 근거:
    # https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
    # https://docs.langchain.com/oss/python/langgraph/event-streaming
    matching: list[tuple[StreamRecord, dict[str, Any]]] = []
    for event in context.events:
        if event.event == "on_tool_start" and event.data.get("name") == tool_name:
            args = event.data.get("data", {}).get("input", {})
            matching.append((event, args if isinstance(args, dict) else {}))
            continue

        started = protocol_v2_tool_started(event)
        if started is not None:
            name, args = started
            if name == tool_name:
                matching.append((event, args))

    if not matching:
        return _result(rule, False, f"Tool not called: {tool_name}")

    expected_args = rule.get("args")
    if expected_args is None:
        return _result(rule, True)
    if not isinstance(expected_args, dict):
        return _result(rule, False, "tool_called args must be a mapping")

    for _event, args in matching:
        if all(_matches_expected(args.get(key), expected) for key, expected in expected_args.items()):
            return _result(rule, True)

    return _result(rule, False, f"Tool {tool_name} called but args did not match: {expected_args}")


def _event_seen(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    event_name = str(rule.get("event", ""))
    passed = any(event.event == event_name for event in context.events)
    return _result(rule, passed, None if passed else f"Event not seen: {event_name}")


def _event_absent(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    event_name = str(rule.get("event", ""))
    passed = all(event.event != event_name for event in context.events)
    return _result(rule, passed, None if passed else f"Event should be absent: {event_name}")


def _no_error(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    errors = [event for event in context.events if event.event == "error"]
    return _result(rule, not errors, None if not errors else f"Stream error events found: {len(errors)}")


def _done(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    passed = bool(context.events) and context.events[-1].event == "done"
    return _result(rule, passed, None if passed else "Last SSE event was not done")


def _interrupt_required(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    values = interrupt_values(context.events)
    if not values:
        return _result(rule, False, "No interrupt payload found")

    expected_names = rule.get("action_names")
    if expected_names is None:
        return _result(rule, True)
    if not isinstance(expected_names, list):
        return _result(rule, False, "interrupt_required action_names must be a list")

    actual_names: set[str] = set()
    for value in values:
        requests = value.get("action_requests", [])
        if isinstance(requests, list):
            actual_names.update(str(item.get("name")) for item in requests if isinstance(item, dict))
    missing = [name for name in expected_names if str(name) not in actual_names]
    return _result(rule, not missing, None if not missing else f"Missing interrupt action names: {missing}")


def _final_text_contains(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    pattern = str(rule.get("pattern", ""))
    passed = pattern in context.final_text
    return _result(rule, passed, None if passed else f"Final text does not contain: {pattern}")


def _final_text_matches(rule: ValidationRule, context: ValidationContext) -> ValidationResult:
    regex = str(rule.get("regex", ""))
    passed = re.search(regex, context.final_text, re.IGNORECASE | re.DOTALL) is not None
    return _result(rule, passed, None if passed else f"Final text does not match regex: {regex}")


def _matches_expected(actual: Any, expected: Any) -> bool:
    if actual is None:
        return False
    expected_str = str(expected)
    actual_str = str(actual)
    if expected_str.startswith("/") and expected_str.endswith("/"):
        return re.search(expected_str[1:-1], actual_str, re.IGNORECASE) is not None
    return expected_str.lower() in actual_str.lower()


def _path(rule: ValidationRule, context: ValidationContext) -> Path:
    return context.workdir / str(rule.get("path", ""))


def _result(rule: ValidationRule, passed: bool, message: str | None = None) -> ValidationResult:
    return ValidationResult(rule=rule, passed=passed, message=message)

