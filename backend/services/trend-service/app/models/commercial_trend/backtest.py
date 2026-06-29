"""검증 게이트: forward-slope 모델이 단순 기준을 실제로 이기는지 시간순 워크포워드로 판정한다.

문서(README·model.md)의 'p≈0.0002 / p<0.05' 주장을 **재현하는** 코드다. 핵심 설계:
- 지표는 결정주 횡단면 순위상관(rank IC = Spearman(예측, 라벨)). 배너는 순위만 쓰므로 점추정이 아닌 순위 적중을 본다.
- **확장 윈도우 워크포워드**: 결정주를 시간순으로 밀며, 검증주 w는 그보다 과거 결정주들로만 학습한다.
- **purge 갭 = FORWARD_WEEKS**: 라벨이 전방 8주를 보므로, 검증주와 라벨 구간이 겹치지 않게 학습 끝과 8주 간격을 둔다.
- **두 기준 + 퍼뮤테이션 p값**:
  - 무작위: 무작위 예측의 기대 rank IC는 0. 검증주별 모델 IC의 부호를 무작위로 뒤집어(sign-flip) 평균>0 유의성 판정.
  - 전기 트레일링 기울기(slope_trend): 같은 검증주에서 트레일링 기울기로 랭킹한 기준. 모델은 역추세라 이 기준을 이겨야 한다(쌍체 퍼뮤테이션).
- 학습 하이퍼파라미터는 운영 학습(forecast_train)과 **동일한 것을 import**해 검증-운영 불일치를 막는다.

    python -m app.models.commercial_trend.backtest --data-mode db
"""

from __future__ import annotations

import argparse

import numpy as np

from app.models.commercial_trend.forecast_features import (
    FORECAST_FEATURES,
    FORWARD_WEEKS,
    TOP_N,
    TREND_WEEKS,
    build_panels,
    build_segment_samples,
    enough_history,
)
from app.models.commercial_trend.forecast_train import _LGB_PARAMS, _NUM_BOOST_ROUND

# 검증주가 인정받는 최소 학습 결정주 수(이보다 과거 주가 적으면 그 검증주는 건너뛴다).
MIN_TRAIN_WEEKS = 20
# 퍼뮤테이션 반복 수. 5000이면 add-one 최소 p ≈ 1/5001 ≈ 0.0002.
N_PERM = 5000
# 배너 노출 폭(Top-K) 정밀도용.
TOP_K = TOP_N
# 누수 스크린 임계: |Spearman(피처, 라벨)|이 이 값 이상이면 미래를 직접 베끼는 의심 피처.
LEAK_THRESHOLD = 0.5
# 대조(음성/양성)용 단일 시간순 분할의 검증 비율(마지막 결정주들).
_VALID_FRACTION = 0.2
# 트레일링 기울기 기준이 쓰는 피처 인덱스.
_SLOPE_TREND_IDX = FORECAST_FEATURES.index("slope_trend")


def _spearman(pred: np.ndarray, target: np.ndarray) -> float:
    """순위상관(Spearman). 분산이 0이거나 표본<3이면 0."""
    if len(pred) < 3:
        return 0.0
    if np.std(pred) == 0 or np.std(target) == 0:  # 상수 입력은 순위가 무의미 → 0
        return 0.0
    pr = np.argsort(np.argsort(pred)).astype(float)
    tr = np.argsort(np.argsort(target)).astype(float)
    return float(np.corrcoef(pr, tr)[0, 1])


def _precision_at_k(pred: np.ndarray, target: np.ndarray, k: int) -> float:
    """예측 상위 k와 실제 상위 k의 겹침 비율(한 검증주 횡단면)."""
    if len(pred) < k:
        return 0.0
    top_pred = set(np.argsort(pred)[-k:].tolist())
    top_true = set(np.argsort(target)[-k:].tolist())
    return len(top_pred & top_true) / k


def _sign_flip_p(values: np.ndarray, n_perm: int, rng: np.random.Generator) -> float:
    """무작위 대비: 검증주별 값의 부호를 무작위로 뒤집어 평균>관측이 나올 확률(단측, add-one)."""
    if len(values) == 0:
        return 1.0
    observed = float(np.mean(values))
    signs = rng.choice([-1.0, 1.0], size=(n_perm, len(values)))
    perm_means = (signs * values).mean(axis=1)
    return float((1 + np.sum(perm_means >= observed)) / (1 + n_perm))


def _paired_perm_p(model: np.ndarray, baseline: np.ndarray, n_perm: int, rng: np.random.Generator) -> float:
    """기준 대비: 쌍체 차이(model-baseline) 부호를 무작위로 뒤집는 쌍체 퍼뮤테이션(단측, add-one)."""
    return _sign_flip_p(model - baseline, n_perm, rng)


def _feature_label_screen(x: np.ndarray, y: np.ndarray) -> dict[str, float]:
    """누수 스크린: 피처별 |Spearman(피처, 라벨)|(풀링). 0.5 이상이면 미래를 직접 베끼는 의심 피처.

    피처는 결정시점 t까지의 과거만 봐야 한다. 라벨(전방 8주)과 상관이 비정상적으로 높으면 누수 신호다.
    라벨이 결정주별 횡단면 z라 결정주 표본을 풀링해도 무방하다.
    """
    return {name: abs(_spearman(x[:, i], y)) for i, name in enumerate(FORECAST_FEATURES)}


def _time_split_weeks(weeks: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """결정주를 시간순으로 나눠 (학습 mask, 검증 mask)를 만든다. 학습 끝과 검증 사이 purge 갭(전방 8주)."""
    unique_weeks = np.unique(weeks)
    n_valid = max(1, int(len(unique_weeks) * _VALID_FRACTION))
    first_valid = unique_weeks[-n_valid]
    train_mask = weeks < (first_valid - FORWARD_WEEKS)
    valid_mask = weeks >= first_valid
    return train_mask, valid_mask


def _mean_week_ic(weeks_valid: np.ndarray, pred: np.ndarray, y_valid: np.ndarray) -> float:
    """검증 구간을 결정주별 횡단면으로 나눠 rank IC 평균."""
    ics = [_spearman(pred[weeks_valid == w], y_valid[weeks_valid == w]) for w in np.unique(weeks_valid)]
    return float(np.mean(ics)) if ics else 0.0


def _controls(x: np.ndarray, y: np.ndarray, weeks: np.ndarray, rng: np.random.Generator) -> dict[str, float]:
    """음성·양성 대조로 '검증기 자체'를 점검한다(단일 시간순 분할).

    - real: 정상 학습 → 검증 IC(높아야 정상).
    - shuffled(음성 대조): 학습 라벨을 뒤섞으면 신호가 끊겨 IC≈0이어야 정상(아니면 누수/버그).
    - oracle(양성 대조): 정답 라벨을 피처로 더 주면 IC≈1로 치솟아야 정상(아니면 검증기 고장).
    """
    import lightgbm as lgb

    train_mask, valid_mask = _time_split_weeks(weeks)
    if not train_mask.any() or not valid_mask.any():
        return {}
    weeks_valid, y_valid = weeks[valid_mask], y[valid_mask]

    def _fit_pred(x_tr: np.ndarray, y_tr: np.ndarray, x_va: np.ndarray, names: list[str]) -> np.ndarray:
        booster = lgb.train(
            _LGB_PARAMS,
            lgb.Dataset(x_tr, label=y_tr, feature_name=names),
            num_boost_round=_NUM_BOOST_ROUND,
            callbacks=[lgb.log_evaluation(period=0)],
        )
        return np.asarray(booster.predict(x_va), dtype=float)

    real = _fit_pred(x[train_mask], y[train_mask], x[valid_mask], list(FORECAST_FEATURES))

    y_shuffled = y[train_mask].copy()
    rng.shuffle(y_shuffled)
    shuffled = _fit_pred(x[train_mask], y_shuffled, x[valid_mask], list(FORECAST_FEATURES))

    oracle_names = [*FORECAST_FEATURES, "__oracle__"]  # 정답을 마지막 열 피처로 주입
    oracle = _fit_pred(
        np.column_stack([x[train_mask], y[train_mask]]),
        y[train_mask],
        np.column_stack([x[valid_mask], y_valid]),
        oracle_names,
    )

    return {
        "real_ic": _mean_week_ic(weeks_valid, real, y_valid),
        "shuffled_ic": _mean_week_ic(weeks_valid, shuffled, y_valid),
        "oracle_ic": _mean_week_ic(weeks_valid, oracle, y_valid),
    }


def _walkforward(x: np.ndarray, y: np.ndarray, weeks: np.ndarray) -> dict[str, np.ndarray]:
    """확장 윈도우 워크포워드. 검증주별 (모델 IC, 트레일링기준 IC, 모델 P@K)를 모은다."""
    import lightgbm as lgb

    unique_weeks = np.unique(weeks)
    model_ic: list[float] = []
    base_ic: list[float] = []
    model_pk: list[float] = []
    eval_weeks: list[int] = []

    for w in unique_weeks:
        # purge: 검증주 w의 라벨(전방 8주)과 겹치지 않도록 학습은 w-FORWARD_WEEKS 이전 결정주만.
        train_mask = weeks < (w - FORWARD_WEEKS)
        train_weeks = np.unique(weeks[train_mask])
        if len(train_weeks) < MIN_TRAIN_WEEKS:
            continue
        valid_mask = weeks == w
        booster = lgb.train(
            _LGB_PARAMS,
            lgb.Dataset(x[train_mask], label=y[train_mask], feature_name=FORECAST_FEATURES),
            num_boost_round=_NUM_BOOST_ROUND,
            callbacks=[lgb.log_evaluation(period=0)],
        )
        pred = np.asarray(booster.predict(x[valid_mask]), dtype=float)
        yv = y[valid_mask]
        model_ic.append(_spearman(pred, yv))
        base_ic.append(_spearman(x[valid_mask][:, _SLOPE_TREND_IDX], yv))  # 트레일링 기울기 기준
        model_pk.append(_precision_at_k(pred, yv, TOP_K))
        eval_weeks.append(int(w))

    return {
        "model_ic": np.asarray(model_ic),
        "base_ic": np.asarray(base_ic),
        "model_pk": np.asarray(model_pk),
        "eval_weeks": np.asarray(eval_weeks),
    }


def run_backtest(data_mode: str = "db", n_perm: int = N_PERM, seed: int = 0) -> dict[str, object]:
    """세그먼트별 워크포워드 검증을 돌려 평균 rank IC와 두 기준 대비 퍼뮤테이션 p값을 낸다."""
    rng = np.random.default_rng(seed)
    panels = build_panels(data_mode)
    segments: dict[str, object] = {}

    for segment, (weekly, ratio) in panels.items():
        if not enough_history(weekly, segment):
            segments[segment] = {"evaluated": False, "reason": "데이터 주 수 부족"}
            continue
        x, y, weeks = build_segment_samples(weekly, TREND_WEEKS[segment], ratio)
        if len(x) == 0:
            segments[segment] = {"evaluated": False, "reason": "학습 표본 없음"}
            continue

        wf = _walkforward(x, y, weeks)
        n_weeks = len(wf["eval_weeks"])
        if n_weeks < 5:
            segments[segment] = {"evaluated": False, "reason": f"검증주 부족({n_weeks})"}
            continue

        feature_screen = _feature_label_screen(x, y)
        leaked = {name: corr for name, corr in feature_screen.items() if corr >= LEAK_THRESHOLD}
        segments[segment] = {
            "evaluated": True,
            "n_valid_weeks": n_weeks,
            "mean_rank_ic": float(np.mean(wf["model_ic"])),
            "mean_baseline_ic": float(np.mean(wf["base_ic"])),
            "mean_precision_at_k": float(np.mean(wf["model_pk"])),
            "random_precision_expectation": float(TOP_K / np.mean([len(x[weeks == w]) for w in wf["eval_weeks"]])),
            "p_vs_random": _sign_flip_p(wf["model_ic"], n_perm, rng),
            "p_vs_trailing_slope": _paired_perm_p(wf["model_ic"], wf["base_ic"], n_perm, rng),
            # 누수 게이트(§3): 피처 스크린 + 음성/양성 대조.
            "max_feature_corr": float(max(feature_screen.values())),
            "leaked_features": leaked,
            "controls": _controls(x, y, weeks, rng),
        }

    return {
        "data_mode": data_mode,
        "n_perm": n_perm,
        "purge_weeks": FORWARD_WEEKS,
        "min_train_weeks": MIN_TRAIN_WEEKS,
        "segments": segments,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="forward-slope 모델 워크포워드 검증(무작위·트레일링 기준 대비)")
    parser.add_argument("--data-mode", default="db", choices=["db", "raw", "sample"])
    parser.add_argument("--n-perm", type=int, default=N_PERM)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()
    result = run_backtest(args.data_mode, n_perm=args.n_perm, seed=args.seed)

    print(f"워크포워드 검증 | purge {result['purge_weeks']}주 | 퍼뮤테이션 {result['n_perm']}회\n")
    print(f"{'세그먼트':10s} {'검증주':>5s} {'모델IC':>8s} {'기준IC':>8s} {'P@3':>7s} {'p(무작위)':>10s} {'p(트레일링)':>11s}")
    for segment, info in result["segments"].items():  # type: ignore[attr-defined]
        if not isinstance(info, dict) or not info.get("evaluated"):
            reason = info.get("reason") if isinstance(info, dict) else "?"
            print(f"{segment:10s} {'-':>5s}  (검증 안 됨: {reason})")
            continue
        print(
            f"{segment:10s} {info['n_valid_weeks']:5d} {info['mean_rank_ic']:8.3f} "
            f"{info['mean_baseline_ic']:8.3f} {info['mean_precision_at_k']:7.1%} "
            f"{info['p_vs_random']:10.4f} {info['p_vs_trailing_slope']:11.4f}"
        )

    # 누수 게이트(§3): 피처 스크린(최대 |corr|) + 음성(shuffled≈0)·양성(oracle≈1) 대조.
    print(f"\n누수 게이트 | 스크린 임계 |corr|≥{LEAK_THRESHOLD} | 음성 대조 shuffled≈0 · 양성 대조 oracle≈1")
    print(f"{'세그먼트':10s} {'최대피처corr':>10s} {'누수의심':>8s} {'real':>7s} {'shuffled':>9s} {'oracle':>7s}")
    for segment, info in result["segments"].items():  # type: ignore[attr-defined]
        if not isinstance(info, dict) or not info.get("evaluated"):
            continue
        controls = info.get("controls") or {}
        leaked = info.get("leaked_features") or {}
        leak_flag = ",".join(leaked) if leaked else "없음"
        print(
            f"{segment:10s} {info['max_feature_corr']:10.3f} {leak_flag:>8s} "
            f"{controls.get('real_ic', float('nan')):7.3f} "
            f"{controls.get('shuffled_ic', float('nan')):9.3f} "
            f"{controls.get('oracle_ic', float('nan')):7.3f}"
        )
