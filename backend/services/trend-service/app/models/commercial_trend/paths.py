from __future__ import annotations

import os
from pathlib import Path

# app/models/commercial_trend/paths.py -> parents[3] == 서비스 루트
SERVICE_ROOT = Path(__file__).resolve().parents[3]

# 데이터 루트. 기본값은 서비스 루트(=지금 동작 그대로). 운영은 TREND_DATA_DIR=/data/trend로
# 별도 볼륨을 가리키게 해 코드와 데이터를 분리한다(로컬은 env 미설정 시 변화 없음).
DATA_DIR = Path(os.environ.get("TREND_DATA_DIR", SERVICE_ROOT))
SAMPLE_DIR = DATA_DIR / ".sample"
RAW_DIR = DATA_DIR / ".raw"
ARTIFACTS_DIR = DATA_DIR / ".artifacts"

# 검증된 forward-slope 예측 모델 아티팩트(세그먼트별 부스터 + 공통 메타).
# 오프라인 학습이 만들고 런타임 예측이 읽는다(학습/추론 분리).
FORECAST_META_FILE = ARTIFACTS_DIR / "forecast.meta.json"


def forecast_model_file(segment: str, suffix: str = "") -> Path:
    """세그먼트별 forward-slope 부스터 경로. suffix로 챌린저 임시 경로를 만든다."""
    return ARTIFACTS_DIR / f"forecast_{segment}{suffix}.lgb"


def forecast_meta_file(suffix: str = "") -> Path:
    """forward-slope 모델 메타 경로. suffix로 챌린저 임시 경로를 만든다."""
    return ARTIFACTS_DIR / f"forecast{suffix}.meta.json"
