# onboarding-service

`app/main.py`는 앱 부팅 시 DB 스키마를 준비하고, FastAPI 라우터를 `/two-tower/*` 경로로 연다.

```text
app.main:app
-> app.db.session.prepare_database()
-> app.api.routes.router
-> app.two_tower.service
-> app.models.onboarding_two_tower.runtime
```

브라우저 예제 화면은 Traefik 경유로 `http://localhost:8088/api/onboarding`를 호출한다.

## app/db

`app/db/models.py`는 유저 타워 현재 상태와 추천 캐시를 나눠 저장한다.

```text
user_tower_profiles
+ auth_user_uuid unique
+ profile_code indexed
+ preferred_category_code
+ budget_level ... competition_tolerance_level
+ raw_answers json
```

수치 파라미터는 전부 `0.00 ~ 1.00` 실수로 저장한다.

```text
user_tower_prediction_cache
+ profile_code
+ model_signature
+ top_k
+ prediction_json
```

`auth_user_uuid`는 인증 서버 JWT의 `user_profile.uuid`를 그대로 받는다.

## app/two_tower/codecs.py

`app/two_tower/codecs.py`는 현재 유저 타워 점수를 base36 공유 코드로 바꾼다.

```text
r + version(1) + category(1) + score_group_1(4) + score_group_2(4) + score_group_3(4)
```

현재 버전 2 공유 코드는 총 15글자이며, 9개 점수를 `0.01` 단위로 양자화해 3개씩 묶는다. 예전 버전 1의 9글자 코드도 읽기 전용으로 복원한다.

점수 그룹은 아래 순서대로 3개씩 묶는다.

```text
group_1
+ budget_level
+ stability_level
+ subway_dependency_level
```

```text
group_2
+ weekend_preference_level
+ evening_preference_level
+ resident_focus_level
```

```text
group_3
+ worker_focus_level
+ rent_sensitivity_level
+ competition_tolerance_level
```

`decode_profile_code()`는 공유 코드만으로 다시 `UserProfilePayload`를 복원한다.

## app/two_tower/service.py

`app/two_tower/service.py`는 프론트가 직접 쓰는 경로를 묶는다.

```text
get_catalog_response()
resolve_prediction_response()
get_saved_profile_response()
upsert_saved_profile_response()
resolve_shared_profile_response()
```

`resolve_prediction_response()`는 아래 순서로 동작한다.

```text
user_profile
-> encode_profile_code()
-> evaluation_payload()
-> model_signature = model_id:trained_at
-> prediction cache hit 확인
-> miss 면 runtime predict 후 DB 캐시 저장
```

같은 점수 조합과 같은 학습 버전이면 이후 응답은 `prediction_json` 재사용으로 끝난다.

## /two-tower/predict

`/two-tower/predict`는 저장 없이 현재 점수 조합의 추천만 바로 계산한다.

```json
{
  "top_k": 5,
  "user_profile": {
    "user_id": "demo-user",
    "profile_name": "사용자 조정 프로필",
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

응답에는 추천 결과 외에 `profile_code`, `share_path`, `share_url`, `model_signature`가 같이 들어간다.

## /two-tower/profiles/users/{auth_user_uuid}

`PUT /two-tower/profiles/users/{auth_user_uuid}`는 현재 점수 조합을 사용자 현재 상태로 저장한다.

`GET /two-tower/profiles/users/{auth_user_uuid}`는 가장 최근 저장된 현재 상태를 다시 읽는다.

```text
JWT user_profile.uuid
-> user_tower_profiles.auth_user_uuid
-> current profile row
-> prediction cache lookup
```

## /two-tower/profiles/code/{profile_code}

`GET /two-tower/profiles/code/{profile_code}`는 DB에서 사용자 row를 찾지 않는다.

```text
profile_code
-> decode_profile_code()
-> prediction cache lookup
-> miss 면 runtime predict
```

이 경로는 공유 URL 진입 화면 `frontend/src/app/example/two-tower/[base36]/page.tsx`가 그대로 사용한다.

## app/models/onboarding_two_tower

`app/models/onboarding_two_tower/train.py`는 현재 retrieval 모델을 학습한다.

지금은 사용자 식별자 `user_id`를 모델 입력에서 빼고 아래 피처만 사용한다. 수치 파라미터는 모두 `0.00 ~ 1.00` 범위다.

```text
user tower
+ preferred_category_code
+ budget_level
+ stability_level
+ subway_dependency_level
+ weekend_preference_level
+ evening_preference_level
+ resident_focus_level
+ worker_focus_level
+ rent_sensitivity_level
+ competition_tolerance_level
```

```text
item tower
+ item_id
+ area_code
+ service_category_code
+ subway_coverage_level
+ area_profile_type
+ sales_amount
+ weekend_sales_ratio
+ evening_sales_ratio
+ subway_commercial_trend_score
+ category_opportunity_score
+ demand_gap_score
+ resident_population
+ worker_population
+ living_population
```

## frontend/src/app/example/two-tower

예제 화면은 아래 두 경로로 나뉜다.

```text
src/app/example/two-tower/page.tsx
-> 저장 가능한 기본 콘솔
```

```text
src/app/example/two-tower/[base36]/page.tsx
-> 공유 코드 진입 화면
-> base36 값이 바뀌면 같은 클라이언트 컴포넌트에서 URL도 교체
```

실제 UI와 fetch 로직은 `_components/two-tower-client.tsx`와 `_components/two-tower-api.ts`에 있다.

## 주요 파일

- `app/main.py`
- `app/api/routes.py`
- `app/db/models.py`
- `app/db/session.py`
- `app/two_tower/contracts.py`
- `app/two_tower/codecs.py`
- `app/two_tower/service.py`
- `app/models/onboarding_two_tower/train.py`
- `app/models/onboarding_two_tower/runtime.py`
- `../../frontend/src/app/example/two-tower/_components/two-tower-client.tsx`

## 참고 문서

- FastAPI SQL Databases: `https://fastapi.tiangolo.com/tutorial/sql-databases/`
- FastAPI async: `https://fastapi.tiangolo.com/async/`
- SQLAlchemy asyncio: `https://docs.sqlalchemy.org/en/latest/orm/extensions/asyncio.html`
- Next.js Dynamic Segments: `https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes`
