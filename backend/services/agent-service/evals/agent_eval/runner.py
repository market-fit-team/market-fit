"""llm HTTP/SSE 평가 시나리오를 실행합니다.

Goose Open Model Gym 코드를 각색함:
- 시나리오 로딩, 작업 디렉터리(workdir) 설정, 테스트 조합 확장, 반복 시도 및 최악의 결과 선택 로직은 ``ba16de9738ec5bc319adbddeb9dd6523475fc7c0`` 커밋의 ``evals/open-model-gym/suite/src/runner.ts`` 를 따릅니다.

Cline 코드를 각색함:
- 반복 시도 리포팅 스타일과 pass@k 요약 흐름은 ``4bec5931f6aa5ee91c8220d1fa4cc5e310a6b705`` 커밋의 ``evals/smoke-tests/run-smoke-tests.ts`` 를 따릅니다.

로컬 변경 사항:
- 코딩 에이전트 CLI 대신 이 저장소의 FastAPI 채팅 스트림 API를 실행합니다.
- Protocol V2 ``/stream/events`` + ``/commands`` 를 통해 LangGraph HITL 인터럽트를 처리합니다.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from evals.agent_eval.client import LlmEvalClient
from evals.agent_eval.config_loader import build_test_pairs, load_suite
from evals.agent_eval.models import (
    ResumeConfig,
    Scenario,
    StreamRecord,
    TestPair,
    TrialResult,
    Turn,
    TurnResult,
)
from evals.agent_eval.reports import build_report, write_report
from evals.agent_eval.sse import interrupt_requests
from evals.agent_eval.validators import ValidationContext, validate_all


async def run_suite(
    *,
    config_path: Path,
    scenario_filter: str | None = None,
    runner_filter: str | None = None,
    repetitions: int | None = None,
    output_dir: Path | None = None,
) -> Path:
    suite = load_suite(config_path)
    pairs = build_test_pairs(suite)

    if scenario_filter:
        filters = [item.strip() for item in scenario_filter.split(",") if item.strip()]
        pairs = [pair for pair in pairs if any(item in pair.scenario.name for item in filters)]
    if runner_filter:
        filters = [item.strip() for item in runner_filter.split(",") if item.strip()]
        pairs = [pair for pair in pairs if any(item in pair.runner.name for item in filters)]

    run_count = repetitions if repetitions is not None else suite.run.repetitions
    report_output_dir = output_dir or suite.run.output_dir
    results: list[TrialResult] = []

    for pair in pairs:
        worst_result: TrialResult | None = None
        for attempt in range(1, run_count + 1):
            result = await run_trial(pair, base_workdir=suite.run.workdir, attempt=attempt)
            results.append(result)
            if worst_result is None or _score_result(result) < _score_result(worst_result):
                worst_result = result
            if suite.run.fail_fast and result.status == "failed":
                break

    report = build_report(results, repetitions=run_count)
    return write_report(report, report_output_dir)


async def run_trial(pair: TestPair, *, base_workdir: Path, attempt: int) -> TrialResult:
    started_at = datetime.now(UTC)
    workdir = _prepare_workdir(pair.scenario, base_workdir, pair.runner.name, attempt)
    client = LlmEvalClient(pair.runner)
    turn_results: list[TurnResult] = []
    errors: list[str] = []
    thread_id: str | None = None

    try:
        for turn in pair.scenario.normalized_turns():
            turn_result = await _run_turn(client=client, turn=turn, thread_id=thread_id, workdir=workdir)
            thread_id = turn_result.thread_id
            turn_results.append(turn_result)
            failed = [validation for validation in turn_result.validations if not validation.passed]
            if failed:
                errors.extend(validation.message or "validation failed" for validation in failed)
                break
    except Exception as error:
        errors.append(str(error))
    finally:
        await client.aclose()

    ended_at = datetime.now(UTC)
    status = "failed" if errors else "passed"
    _write_trial_log(workdir, turn_results, errors)
    return TrialResult(
        scenario_name=pair.scenario.name,
        runner_name=pair.runner.name,
        attempt=attempt,
        status=status,
        started_at=started_at,
        ended_at=ended_at,
        workdir=workdir,
        turns=turn_results,
        errors=errors,
    )


async def _run_turn(
    *,
    client: LlmEvalClient,
    turn: Turn,
    thread_id: str | None,
    workdir: Path,
) -> TurnResult:
    if thread_id is None:
        thread_id = await client.create_thread(thread_id=None)

    input_payload = {"messages": [{"type": "human", "content": turn.prompt}]}
    context: dict[str, Any] = {}
    if turn.allowed_tools is not None:
        context["allowed_tools"] = turn.allowed_tools
    if turn.interrupt_on is not None:
        context["interrupt_on"] = turn.interrupt_on

    payload: dict[str, Any] = {"input": input_payload}
    if context:
        payload["context"] = context

    events = await client.stream_run(thread_id=thread_id, payload=payload)
    resume_events: list[StreamRecord] = []

    if turn.resume is not None:
        resume_payload = _build_resume_payload(events, turn.resume)
        if resume_payload["decisions"] and resume_payload["interrupt_id"]:
            resume_context = dict(context)
            if turn.resume.allowed_tools is not None:
                resume_context["allowed_tools"] = turn.resume.allowed_tools
            resume_events = await client.stream_response(
                thread_id=thread_id,
                interrupt_id=resume_payload["interrupt_id"],
                namespace=resume_payload["namespace"],
                response_value={"decisions": resume_payload["decisions"]},
                context=resume_context,
            )

    combined_events = [*events, *resume_events]
    validations = validate_all(turn.validate, ValidationContext(events=combined_events, workdir=workdir))
    return TurnResult(
        prompt=turn.prompt,
        thread_id=thread_id,
        events=events,
        resume_events=resume_events,
        validations=validations,
    )


def _build_resume_payload(events: list[StreamRecord], resume: ResumeConfig) -> dict[str, Any]:
    decisions: list[dict[str, Any]] = []
    interrupt_id = ""
    namespace: list[str] = []

    for request in interrupt_requests(events):
        value = request.get("value", {})
        action_requests = value.get("action_requests", []) if isinstance(value, dict) else []
        if not isinstance(action_requests, list):
            continue

        interrupt_id = str(request.get("interrupt_id") or interrupt_id)
        request_namespace = request.get("namespace")
        if isinstance(request_namespace, list):
            namespace = [str(item) for item in request_namespace]

        for action in action_requests:
            if not isinstance(action, dict):
                continue
            decision: dict[str, Any] = {"type": resume.decision}
            if resume.message:
                decision["message"] = resume.message
            decisions.append(decision)

    return {"interrupt_id": interrupt_id, "namespace": namespace, "decisions": decisions}


def _prepare_workdir(scenario: Scenario, base_workdir: Path, runner_name: str, attempt: int) -> Path:
    test_id = f"{scenario.name}_{runner_name}_attempt{attempt}".replace("/", "_").replace(":", "_")
    workdir = base_workdir / test_id
    if workdir.exists():
        shutil.rmtree(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    for relative_path, content in scenario.setup.items():
        path = workdir / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return workdir


def _score_result(result: TrialResult) -> int:
    if result.status == "failed" and result.errors:
        return -1
    passed = sum(1 for validation in result.validations if validation.passed)
    return 1000 + passed if result.status == "passed" else passed


def _write_trial_log(workdir: Path, turns: list[TurnResult], errors: list[str]) -> None:
    payload = {
        "errors": errors,
        "turns": [
            {
                "thread_id": turn.thread_id,
                "events": [event.event for event in turn.all_events],
                "validations": [
                    {"rule": validation.rule, "passed": validation.passed, "message": validation.message}
                    for validation in turn.validations
                ],
            }
            for turn in turns
        ],
    }
    (workdir / "trial-log.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run llm HTTP/SSE eval scenarios.")
    parser.add_argument("--config", type=Path, default=Path("evals/config.yaml"))
    parser.add_argument("--scenario", help="Comma-separated scenario name filter")
    parser.add_argument("--runner", help="Comma-separated runner name filter")
    parser.add_argument("--repetitions", type=int, help="Override run.repetitions")
    parser.add_argument("--output-dir", type=Path, help="Override run.output_dir")
    args = parser.parse_args()

    run_dir = asyncio.run(
        run_suite(
            config_path=args.config,
            scenario_filter=args.scenario,
            runner_filter=args.runner,
            repetitions=args.repetitions,
            output_dir=args.output_dir,
        )
    )
    print(f"Eval report written to: {run_dir}")


if __name__ == "__main__":
    main()
