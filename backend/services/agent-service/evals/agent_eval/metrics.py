"""반복적이고 비결정론적인(nondeterministic) 에이전트 실행을 위한 측정 지표(Metrics).

Cline 코드를 각색함:
- 지표 이름, 공식 및 작업 상태(task status) 범주는 ``4bec5931f6aa5ee91c8220d1fa4cc5e310a6b705`` 커밋의 ``evals/analysis/src/metrics.ts`` 에 있는 ``MetricsCalculator`` 에서 가져왔습니다.

로컬 변경 사항:
- 함수 이름에 Python의 snake_case를 사용합니다.
- 반환 값의 형태(shape)에 snake_case 키를 사용합니다.
- ``pass_at_k``는 문서화된 공식을 직접 평가합니다. 고정된 버전의 Cline 구현에는 단 한 번의 시도라도 통과하면 ``pass@1``이 항상 1.0을 반환하게 하는 ``c >= k`` 단축 논리(shortcut)가 포함되어 있습니다; 반면 이 로컬 구현은 k=1일 때 ``pass@1``을 실제 관찰된 통과율(observed pass rate)로 유지합니다.
"""

from __future__ import annotations

import math

from evals.agent_eval.models import TaskStatus


def pass_at_k(trials: list[bool], k: int) -> float:
    n = len(trials)
    c = sum(1 for trial in trials if trial)
    if n < k:
        raise ValueError(f"Cannot calculate pass@{k} with only {n} trials")
    return 1 - _binomial(n - c, k) / _binomial(n, k)


def pass_caret_k(trials: list[bool], k: int) -> float:
    n = len(trials)
    c = sum(1 for trial in trials if trial)
    if n < k:
        raise ValueError(f"Cannot calculate pass^{k} with only {n} trials")
    if c < k:
        return 0.0
    return _binomial(c, k) / _binomial(n, k)


def flakiness_score(trials: list[bool]) -> float:
    if not trials:
        raise ValueError("Cannot calculate flakiness with no trials")
    pass_rate = sum(1 for trial in trials if trial) / len(trials)
    if pass_rate in (0, 1):
        return 0.0
    return -pass_rate * math.log2(pass_rate) - (1 - pass_rate) * math.log2(1 - pass_rate)


def task_metrics(trials: list[bool]) -> dict[str, float]:
    if not trials:
        raise ValueError("Cannot calculate metrics with no trials")
    return {
        "pass_at_1": pass_at_k(trials, 1),
        "pass_at_3": pass_at_k(trials, 3) if len(trials) >= 3 else 0.0,
        "pass_caret_3": pass_caret_k(trials, 3) if len(trials) >= 3 else 0.0,
        "flakiness_score": flakiness_score(trials),
    }


def task_status(trials: list[bool]) -> TaskStatus:
    passed = sum(1 for trial in trials if trial)
    if passed == len(trials):
        return "pass"
    if passed == 0:
        return "fail"
    return "flaky"


def _binomial(n: int, k: int) -> float:
    if k > n:
        return 0.0
    if k == 0 or k == n:
        return 1.0
    if k > n - k:
        k = n - k

    result = 1.0
    for i in range(1, k + 1):
        result *= n - i + 1
        result /= i
    return result
