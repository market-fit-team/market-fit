# onboarding-service

`app/main.py`는 FastAPI 앱을 만들고 `/health`, `/two-tower/*` 라우트를 붙인다.

```text
app.main:app
-> app.api.routes.router
-> app.models.onboarding_two_tower.runtime
-> app.models.onboarding_two_tower.train / predict
```

브라우저 예제 화면은 Traefik 경유로 `http://localhost:8088/api/onboarding`를 호출한다.

## /two-tower/catalog

`/two-tower/catalog`은 프론트 예제 화면이 처음 들어올 때 필요한 초기 데이터를 한 번에 준다.

```text
feature_controls
+ category_options
+ sample_profiles
+ item_preview
+ evaluation
```

응답 shape:

```json
{
  "model_id": "onboarding_two_tower",
  "feature_controls": [
    {
      "name": "budget_level",
      "label": "예산 허용치",
      "minimum": 1,
      "maximum": 5
    }
  ],
  "sample_profiles": [
    {
      "user_id": "profile_safe_residential_bakery",
      "preferred_category_code": "CS100005",
      "budget_level": 2
    }
  ]
}
```

## /two-tower/predict

`/two-tower/predict`는 프론트에서 조정한 유저 타워 값을 바로 받아 추천을 다시 계산한다.

```json
{
  "top_k": 5,
  "user_profile": {
    "user_id": "demo-user",
    "profile_name": "수동 조정",
    "preferred_category_code": "CS100005",
    "budget_level": 2,
    "stability_level": 5,
    "subway_dependency_level": 2,
    "weekend_preference_level": 3,
    "evening_preference_level": 2,
    "resident_focus_level": 5,
    "worker_focus_level": 1,
    "rent_sensitivity_level": 5,
    "competition_tolerance_level": 1
  }
}
```

응답은 `trained_at`, `user_profile`, `recommendations`를 돌려준다.

## app/models/onboarding_two_tower

`app/models/onboarding_two_tower/train.py`는 TensorFlow Recommenders retrieval 모델을 학습한다.

```text
user tower
-> preferred_category_code
-> budget_level
-> stability_level
-> subway_dependency_level
-> weekend_preference_level
-> evening_preference_level
-> resident_focus_level
-> worker_focus_level
-> rent_sensitivity_level
-> competition_tolerance_level
```

```text
item tower
-> item_id
-> area_code
-> service_category_code
-> subway_coverage_level
-> area_profile_type
-> sales_amount
-> weekend_sales_ratio
-> evening_sales_ratio
-> subway_commercial_trend_score
-> category_opportunity_score
-> demand_gap_score
-> resident_population
-> worker_population
-> living_population
```

`user_profiles.py`는 샘플 프로필과 UI 조정 슬라이더 정의를 같이 가진다.

```text
DEFAULT_USER_PROFILES
USER_CONTROL_SPECS
build_user_item_labels()
```

`runtime.py`는 현재 프로세스 안에 로드된 모델과 metadata를 캐시한다.

```text
get_runtime()
train_runtime()
catalog_payload()
predict_payload()
```

## .sample

`.sample/`에는 아이템 타워용 상권 샘플 CSV와 유저 프로필 JSONL이 들어있다.

```text
.sample/estimated_sales_hdong_2025.sample.csv
.sample/subway_station_hourly_ridership.sample.csv
.sample/resident_population_hdong.sample.csv
.sample/working_population_hdong.sample.csv
.sample/living_population_hdong_domestic.sample.csv
.sample/user_tower_profiles.sample.jsonl
```

`app/models/item_catalog/features.py`는 이 파일들을 합쳐 `행정동-업종` 후보 catalog를 만든다.

## docker-compose.yml

루트 `docker-compose.yml`에는 `onboarding-service`가 `/api/onboarding` 경로로 붙어 있다.

```text
http://localhost:8088/api/onboarding/health
http://localhost:8088/api/onboarding/two-tower/catalog
http://localhost:8088/api/onboarding/two-tower/predict
http://localhost:8088/api/onboarding/openapi.json
```

학습 artifact는 바인드 마운트로 호스트에 남긴다.

```text
./backend/services/onboarding-service/.artifacts
-> /app/.artifacts
```

## 주요 파일

- `app/main.py`
- `app/api/routes.py`
- `app/models/onboarding_two_tower/contract.py`
- `app/models/onboarding_two_tower/runtime.py`
- `app/models/onboarding_two_tower/train.py`
- `app/models/onboarding_two_tower/predict.py`
- `app/models/item_catalog/features.py`
- `Dockerfile`

## 참고 문서

- FastAPI: `https://fastapi.tiangolo.com/`
- TensorFlow Recommenders: `https://www.tensorflow.org/recommenders`
- TensorFlow Recommenders Basic Retrieval: `https://www.tensorflow.org/recommenders/examples/basic_retrieval`
