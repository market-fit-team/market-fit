`main.py`는 `uvicorn app.main:app`를 실행한다.

```bash
uv run python main.py
```

샘플 데이터로 투타워 모델을 다시 학습할 때는 아래 스크립트를 사용한다.

```bash
uv run python -m app.models.onboarding_two_tower.train --epochs 16
```

테스트는 sqlite 비동기 DB를 임시로 붙여서 실행한다.

```bash
uv run python -m unittest discover -s tests -v
```

현재 유저 타워 수치 파라미터는 모두 `0.00 ~ 1.00` 범위의 실수이며, API 진입 시 `0.01` 단위로 정규화한다.

## /two-tower/catalog

`/two-tower/catalog`은 예제 화면 첫 렌더링에 필요한 고정 데이터를 모은다.

```text
feature_controls
+ category_options
+ sample_profiles
+ item_preview
+ evaluation
+ profile_code_prefix
+ profile_schema_version
```

## /two-tower/profiles/users/{auth_user_uuid}

`/two-tower/profiles/users/{auth_user_uuid}`는 JWT의 `user_profile.uuid`에 대응하는 현재 유저 타워 점수를 저장하거나 다시 읽는다.

```json
{
  "top_k": 5,
  "source": "manual",
  "user_profile": {
    "user_id": "saved-user",
    "profile_name": "저장 테스트 프로필",
    "preferred_category_code": "CS100005",
    "budget_level": 0.25,
    "stability_level": 1.0,
    "subway_dependency_level": 0.25,
    "weekend_preference_level": 0.5,
    "evening_preference_level": 0.25,
    "resident_focus_level": 1.0,
    "worker_focus_level": 0.0,
    "rent_sensitivity_level": 1.0,
    "competition_tolerance_level": 0.0
  }
}
```

응답은 저장된 프로필 메타데이터와 현재 추천 결과를 같이 돌려준다.

## /two-tower/profiles/code/{profile_code}

`/two-tower/profiles/code/{profile_code}`는 base36 공유 코드만으로 현재 유저 타워 점수를 복원한다.

```text
r + version + category + group1(4) + group2(4) + group3(4)
```

현재 버전 2 공유 코드는 15글자 길이이며, `0.01` 단위로 양자화한 9개 수치 파라미터를 3개씩 묶어 압축한다. 기존 9글자 버전 1 코드도 읽기 전용으로 복원한다.

## docker-compose.yml

루트 `docker-compose.yml`은 `onboarding-db`와 `onboarding-service`를 같이 올린다.

```text
http://localhost:8088/api/onboarding/health
http://localhost:8088/api/onboarding/two-tower/catalog
http://localhost:8088/api/onboarding/two-tower/predict
http://localhost:8088/api/onboarding/two-tower/profiles/users/123e4567-e89b-12d3-a456-426614174000
http://localhost:8088/api/onboarding/openapi.json
```

학습 artifact는 호스트에 그대로 남긴다.

```text
./backend/services/onboarding-service/.artifacts
-> /app/.artifacts
```

## 주요 파일

- `app/main.py`
- `app/api/routes.py`
- `app/db/models.py`
- `app/db/session.py`
- `app/two_tower/codecs.py`
- `app/two_tower/service.py`
- `app/models/onboarding_two_tower/train.py`
- `app/models/onboarding_two_tower/predict.py`
- `tests/test_api.py`

## 참고 문서

- FastAPI SQL Databases: `https://fastapi.tiangolo.com/tutorial/sql-databases/`
- FastAPI async: `https://fastapi.tiangolo.com/async/`
- SQLAlchemy asyncio: `https://docs.sqlalchemy.org/en/latest/orm/extensions/asyncio.html`
