"""eval suite YAML 파일들을 로드하고 scenario x runner 조합을 확장합니다.

Goose Open Model Gym 코드를 각색함:
- ``ba16de9738ec5bc319adbddeb9dd6523475fc7c0`` 커밋의 ``evals/open-model-gym/suite/src/runner.ts`` 에 있는 ``loadScenario``, ``loadAllScenarios``, ``loadConfig`` 및 ``buildTestPairs``.

로컬 변경 사항:
- Goose는 scenario x model x runner 조합을 확장합니다. 이 서비스는 현재 서버에서 단일 채팅 모델을 선택하므로, 이 로더는 scenario x HTTP/SSE runner 조합으로 확장합니다.
- Scenario YAML은 Goose의 prompt/setup/validate/turns 형식을 유지하며, 이 저장소의 tool policy와 HITL 흐름을 위해 ``allowed_tools``, ``interrupt_on`` 및 ``resume`` 속성을 추가합니다.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, cast

import yaml

from evals.agent_eval.models import (
    MatrixEntry,
    ResumeConfig,
    RunSettings,
    RunnerConfig,
    Scenario,
    SuiteDefinition,
    TestPair,
    Turn,
    ValidationRule,
)


def load_suite(config_path: Path) -> SuiteDefinition:
    config_path = config_path.resolve()
    root_dir = config_path.parent
    data = _load_yaml_mapping(config_path)

    run = _parse_run_settings(data.get("run", {}), root_dir=root_dir)
    runners = [_parse_runner(item) for item in _require_list(data, "runners")]
    matrix = [_parse_matrix_entry(item) for item in cast(list[Any], data.get("matrix", []))]
    scenarios_dir = _resolve_path(root_dir, str(data.get("scenarios_dir", "scenarios")))
    scenarios = load_all_scenarios(scenarios_dir)

    return SuiteDefinition(
        config_path=config_path,
        root_dir=root_dir,
        scenarios_dir=scenarios_dir,
        run=run,
        runners=runners,
        matrix=matrix,
        scenarios=scenarios,
    )


def load_all_scenarios(scenarios_dir: Path) -> list[Scenario]:
    scenario_paths = sorted(scenarios_dir.glob("*.yaml"))
    return [load_scenario(path) for path in scenario_paths]


def load_scenario(path: Path) -> Scenario:
    data = _load_yaml_mapping(path)
    return _parse_scenario(data, path=path)


def build_test_pairs(suite: SuiteDefinition) -> list[TestPair]:
    runners_by_name = {runner.name: runner for runner in suite.runners}
    scenarios_by_name = {scenario.name: scenario for scenario in suite.scenarios}
    pairs: list[TestPair] = []

    entries = suite.matrix or [MatrixEntry(scenario=scenario.name) for scenario in suite.scenarios]
    for entry in entries:
        scenario = scenarios_by_name.get(entry.scenario)
        if scenario is None:
            available = ", ".join(sorted(scenarios_by_name))
            raise ValueError(f"Unknown scenario '{entry.scenario}'. Available: {available}")

        runner_names = entry.runners or [runner.name for runner in suite.runners]
        for runner_name in runner_names:
            runner = runners_by_name.get(runner_name)
            if runner is None:
                available = ", ".join(sorted(runners_by_name))
                raise ValueError(f"Unknown runner '{runner_name}'. Available: {available}")
            pairs.append(TestPair(scenario=scenario, runner=runner))

    return pairs


def _parse_run_settings(data: Any, *, root_dir: Path) -> RunSettings:
    mapping = _ensure_mapping(data, "run")
    return RunSettings(
        repetitions=int(mapping.get("repetitions", 1)),
        output_dir=_resolve_path(root_dir, str(mapping.get("output_dir", "reports"))),
        workdir=_resolve_path(root_dir, str(mapping.get("workdir", ".workdir"))),
        fail_fast=bool(mapping.get("fail_fast", True)),
    )


def _parse_runner(data: Any) -> RunnerConfig:
    mapping = _ensure_mapping(data, "runner")
    return RunnerConfig(
        name=_require_str(mapping, "name"),
        type=str(mapping.get("type", "http_sse")),
        base_url=_require_str(mapping, "base_url").rstrip("/"),
        api_key_env=str(mapping.get("api_key_env", "API_KEY")),
        api_key_header=str(mapping.get("api_key_header", "X-API-Key")),
        timeout_seconds=float(mapping.get("timeout_seconds", 180)),
        label=cast(str | None, mapping.get("label")),
    )


def _parse_matrix_entry(data: Any) -> MatrixEntry:
    mapping = _ensure_mapping(data, "matrix entry")
    runners = mapping.get("runners")
    return MatrixEntry(
        scenario=_require_str(mapping, "scenario"),
        runners=[str(item) for item in runners] if isinstance(runners, list) else None,
    )


def _parse_scenario(data: dict[str, Any], *, path: Path) -> Scenario:
    turns_data = data.get("turns", [])
    turns = [_parse_turn(item, path=path) for item in turns_data] if isinstance(turns_data, list) else []
    return Scenario(
        name=_require_str(data, "name"),
        description=_require_str(data, "description"),
        prompt=cast(str | None, data.get("prompt")),
        setup={key: str(value) for key, value in _ensure_mapping(data.get("setup", {}), "setup").items()},
        validate=_parse_validation_rules(data.get("validate", [])),
        turns=turns,
        tags=[str(item) for item in cast(list[Any], data.get("tags", []))],
        allowed_tools=_parse_optional_str_list(data.get("allowed_tools")),
        interrupt_on=cast(dict[str, Any] | None, data.get("interrupt_on")),
        resume=_parse_resume(data.get("resume")),
    )


def _parse_turn(data: Any, *, path: Path) -> Turn:
    mapping = _ensure_mapping(data, f"turn in {path}")
    return Turn(
        prompt=_require_str(mapping, "prompt"),
        validate=_parse_validation_rules(mapping.get("validate", [])),
        allowed_tools=_parse_optional_str_list(mapping.get("allowed_tools")),
        interrupt_on=cast(dict[str, Any] | None, mapping.get("interrupt_on")),
        resume=_parse_resume(mapping.get("resume")),
    )


def _parse_resume(data: Any) -> ResumeConfig | None:
    if data is None or data is False:
        return None
    if data is True:
        return ResumeConfig()
    mapping = _ensure_mapping(data, "resume")
    return ResumeConfig(
        decision=cast(Any, mapping.get("decision", "approve")),
        message=cast(str | None, mapping.get("message")),
        allowed_tools=_parse_optional_str_list(mapping.get("allowed_tools")),
    )


def _parse_validation_rules(data: Any) -> list[ValidationRule]:
    if data is None:
        return []
    if not isinstance(data, list):
        raise TypeError("validate must be a list")
    rules: list[ValidationRule] = []
    for item in data:
        if not isinstance(item, dict):
            raise TypeError("validation rules must be mappings")
        rules.append({str(key): value for key, value in item.items()})
    return rules


def _parse_optional_str_list(data: Any) -> list[str] | None:
    if data is None:
        return None
    if not isinstance(data, list):
        raise TypeError("expected a list of strings")
    return [str(item) for item in data]


def _load_yaml_mapping(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle) or {}
    if not isinstance(loaded, dict):
        raise TypeError(f"YAML file must contain a mapping: {path}")
    return {str(key): value for key, value in loaded.items()}


def _require_list(mapping: dict[str, Any], key: str) -> list[Any]:
    value = mapping.get(key)
    if not isinstance(value, list):
        raise ValueError(f"'{key}' must be a list")
    return value


def _require_str(mapping: dict[str, Any], key: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"'{key}' must be a non-empty string")
    return value


def _ensure_mapping(value: Any, label: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise TypeError(f"{label} must be a mapping")
    return {str(key): item for key, item in value.items()}


def _resolve_path(root_dir: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root_dir / path
