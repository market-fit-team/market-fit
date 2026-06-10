"""llm 평가 하네스를 위한 공유 데이터 구조(Data structures).

Goose Open Model Gym 코드를 각색함:
- ``ba16de9738ec5bc319adbddeb9dd6523475fc7c0`` 커밋의 ``evals/open-model-gym/suite/src/types.ts``.

로컬 변경 사항:
- Goose의 CLI 에이전트 설정을 이 FastAPI 서비스를 위한 HTTP/SSE runner 설정으로 교체했습니다.
- 이 저장소의 채팅 API에 특화된 HITL 재개(resume) 메타데이터 및 SSE 이벤트 레코드를 추가했습니다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Literal


ValidationRule = dict[str, Any]
RunStatus = Literal["passed", "failed"]
TaskStatus = Literal["pass", "fail", "flaky"]


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
    api_key_env: str = "API_KEY"
    api_key_header: str = "X-API-Key"
    timeout_seconds: float = 180.0
    label: str | None = None


@dataclass(frozen=True, slots=True)
class MatrixEntry:
    scenario: str
    runners: list[str] | None = None


@dataclass(frozen=True, slots=True)
class ResumeConfig:
    decision: Literal["approve", "reject", "respond"] = "approve"
    message: str | None = None
    allowed_tools: list[str] | None = None


@dataclass(frozen=True, slots=True)
class Turn:
    prompt: str
    validate: list[ValidationRule] = field(default_factory=list)
    allowed_tools: list[str] | None = None
    interrupt_on: dict[str, Any] | None = None
    resume: ResumeConfig | None = None


@dataclass(frozen=True, slots=True)
class Scenario:
    name: str
    description: str
    prompt: str | None = None
    setup: dict[str, str] = field(default_factory=dict)
    validate: list[ValidationRule] = field(default_factory=list)
    turns: list[Turn] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    allowed_tools: list[str] | None = None
    interrupt_on: dict[str, Any] | None = None
    resume: ResumeConfig | None = None

    def normalized_turns(self) -> list[Turn]:
        if self.turns:
            return self.turns
        if self.prompt is None:
            raise ValueError(f"Scenario '{self.name}' needs either prompt or turns.")
        return [
            Turn(
                prompt=self.prompt,
                validate=self.validate,
                allowed_tools=self.allowed_tools,
                interrupt_on=self.interrupt_on,
                resume=self.resume,
            )
        ]


@dataclass(frozen=True, slots=True)
class SuiteDefinition:
    config_path: Path
    root_dir: Path
    scenarios_dir: Path
    run: RunSettings
    runners: list[RunnerConfig]
    matrix: list[MatrixEntry]
    scenarios: list[Scenario]


@dataclass(frozen=True, slots=True)
class TestPair:
    scenario: Scenario
    runner: RunnerConfig


@dataclass(frozen=True, slots=True)
class StreamRecord:
    event: str
    data: dict[str, Any]
    raw: str


@dataclass(slots=True)
class ValidationResult:
    rule: ValidationRule
    passed: bool
    message: str | None = None


@dataclass(slots=True)
class TurnResult:
    prompt: str
    thread_id: str
    events: list[StreamRecord]
    resume_events: list[StreamRecord] = field(default_factory=list)
    validations: list[ValidationResult] = field(default_factory=list)

    @property
    def all_events(self) -> list[StreamRecord]:
        return [*self.events, *self.resume_events]


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

    @property
    def validations(self) -> list[ValidationResult]:
        return [validation for turn in self.turns for validation in turn.validations]

