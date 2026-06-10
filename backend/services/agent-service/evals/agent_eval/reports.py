"""평가(eval) 실행 결과의 리포트 직렬화(Serialization).

Cline 코드를 각색함:
- ``4bec5931f6aa5ee91c8220d1fa4cc5e310a6b705`` 커밋의 ``run-smoke-tests.ts`` 에 있는 JSON 리포트 생성 및 ``generateSummaryMarkdown``.

로컬 변경 사항:
- 결과를 scenario x model 단위가 아닌 scenario x runner 단위로 그룹화합니다.
- Cline의 CLI 표준 출력(stdout)/표준 에러(stderr) 전체를 저장하는 대신 간결한 이벤트 요약(summary)을 저장합니다.
"""

from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from evals.agent_eval.metrics import task_metrics, task_status
from evals.agent_eval.models import TrialResult
from evals.agent_eval.sse import collect_model_text


def build_report(results: list[TrialResult], *, repetitions: int) -> dict[str, Any]:
    grouped: dict[tuple[str, str], list[TrialResult]] = {}
    for result in results:
        grouped.setdefault((result.scenario_name, result.runner_name), []).append(result)

    tasks: list[dict[str, Any]] = []
    for (scenario_name, runner_name), trials in sorted(grouped.items()):
        trial_bools = [trial.status == "passed" for trial in trials]
        tasks.append(
            {
                "scenario": scenario_name,
                "runner": runner_name,
                "status": task_status(trial_bools),
                "metrics": task_metrics(trial_bools),
                "trials": [_trial_to_dict(trial) for trial in trials],
            }
        )

    total = len(tasks)
    passed = sum(1 for task in tasks if task["status"] == "pass")
    failed = sum(1 for task in tasks if task["status"] == "fail")
    flaky = sum(1 for task in tasks if task["status"] == "flaky")
    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "trials_per_task": repetitions,
        "tasks": tasks,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "flaky": flaky,
            "pass_at_1_overall": _average([task["metrics"]["pass_at_1"] for task in tasks]),
            "pass_at_3_overall": _average([task["metrics"]["pass_at_3"] for task in tasks]),
        },
    }


def write_report(report: dict[str, Any], output_dir: Path) -> Path:
    timestamp = str(report["timestamp"]).replace(":", "-").replace(".", "-")
    run_dir = output_dir / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)

    (run_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "summary.md").write_text(summary_markdown(report), encoding="utf-8")
    (run_dir / "responses.md").write_text(responses_markdown(report), encoding="utf-8")
    _update_latest_symlink(output_dir, run_dir)
    return run_dir


def summary_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    trials = int(report["trials_per_task"])
    pass_label = "pass@3" if trials >= 3 else "pass@1"
    overall_key = "pass_at_3_overall" if trials >= 3 else "pass_at_1_overall"

    lines = [
        "## LLM Eval Results",
        "",
        f"**Date:** {report['timestamp']}",
        f"**Trials per task:** {trials}",
        "",
        "### Summary",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Total | {summary['total']} |",
        f"| Passed | {summary['passed']} |",
        f"| Failed | {summary['failed']} |",
        f"| Flaky | {summary['flaky']} |",
        f"| Overall {pass_label} | {summary[overall_key] * 100:.1f}% |",
        "",
        "### Results by Scenario",
        "",
        f"| Scenario | Runner | Status | {pass_label} |",
        "|----------|--------|--------|--------|",
    ]
    for task in report["tasks"]:
        metric_key = "pass_at_3" if trials >= 3 else "pass_at_1"
        lines.append(
            f"| {task['scenario']} | {task['runner']} | {task['status'].upper()} | "
            f"{task['metrics'][metric_key] * 100:.0f}% |"
        )

    problem_tasks = [task for task in report["tasks"] if task["status"] != "pass"]
    if problem_tasks:
        lines.extend(["", "### Failed/Flaky Details", ""])
        for task in problem_tasks:
            lines.append(f"#### {task['scenario']} ({task['runner']})")
            for trial in task["trials"]:
                if trial["status"] != "passed":
                    errors = "; ".join(trial["errors"]) or "validation failed"
                    lines.append(f"- Trial {trial['attempt']}: {errors}")
            lines.append("")

    return "\n".join(lines)


def responses_markdown(report: dict[str, Any]) -> str:
    lines = ["## LLM Responses", ""]
    for task in report["tasks"]:
        lines.append(f"### {task['scenario']} ({task['runner']})")
        for trial in task["trials"]:
            lines.append(f"- **Trial {trial['attempt']} ({trial['status'].upper()})**")
            for i, turn in enumerate(trial["turns"], start=1):
                text = turn.get("final_text", "").strip() or "(No text returned or stream failed)"
                lines.append(f"  - **Turn {i}:**")
                lines.append("")
                lines.append("```text")
                lines.append(text)
                lines.append("```")
                lines.append("")

    return "\n".join(lines)


def _trial_to_dict(trial: TrialResult) -> dict[str, Any]:
    return {
        "scenario": trial.scenario_name,
        "runner": trial.runner_name,
        "attempt": trial.attempt,
        "status": trial.status,
        "started_at": trial.started_at.isoformat(),
        "ended_at": trial.ended_at.isoformat(),
        "workdir": str(trial.workdir),
        "errors": trial.errors,
        "turns": [
            {
                "thread_id": turn.thread_id,
                "final_text": collect_model_text(turn.all_events),
                "events": [event.event for event in turn.all_events],
                "validations": [
                    {"rule": validation.rule, "passed": validation.passed, "message": validation.message}
                    for validation in turn.validations
                ],
            }
            for turn in trial.turns
        ],
    }


def _average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _update_latest_symlink(output_dir: Path, run_dir: Path) -> None:
    latest = output_dir / "latest"
    try:
        if latest.exists() or latest.is_symlink():
            latest.unlink()
        latest.symlink_to(run_dir.name)
    except OSError:
        (output_dir / "latest.txt").write_text(str(run_dir), encoding="utf-8")


def _json_default(value: Any) -> Any:
    if is_dataclass(value):
        return asdict(value)
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object is not JSON serializable: {value!r}")

