# onboarding-service

## `app`

```text
app/
+ api/
  + routes.py
  + deps.py
+ core/
  + config.py
  + jwt_auth.py
+ db/
  + base.py
  + models.py
  + session.py
+ surveys/
  + definitions.py
  + contracts.py
  + repository.py
  + service.py
+ two_tower/
  + codecs.py
  + contracts.py
  + repository.py
  + service.py
+ models/
  + onboarding_two_tower/
  + item_catalog/
  + subway_commercial_trend_score/
  + sales_momentum_forecast/
  + category_opportunity_score/
  + demand_gap_detector/
```

`surveys/`는 설문 정의와 설문 저장 흐름을 맡고, `two_tower/`는 공유 코드와 추천 계산 경계를 맡는다.
`models/` 아래는 실제 피처 생성과 학습/추론 런타임을 둔다.

## `app/main.py`

`app/main.py`는 FastAPI 앱 부팅 시 DB 스키마를 만들고 활성 설문 정의를 seed 한다.
기본 설정에서는 공개 설문 경로만 열고, 레거시 투타워 경로와 학습 경로는 열지 않는다.

```text
app.main:app
-> app.db.session.prepare_database()
-> app.api.routes.router
```

기본 OpenAPI 태그는 `system`, `survey` 두 개다.
`ONBOARDING_SERVICE_EXPOSE_LEGACY_TWO_TOWER_ROUTES=true` 또는 `ONBOARDING_SERVICE_EXPOSE_INTERNAL_MODEL_ADMIN_ROUTES=true`일 때만 `two-tower` 태그가 추가된다.

## `app/db/session.py`

`app/db/session.py`는 SQLAlchemy async engine과 session factory를 만든다.
`prepare_database()`는 `Base.metadata.create_all()` 뒤에 활성 설문 정의를 바로 upsert 한다.

```text
prepare_database()
-> create_all()
-> app.surveys.service.seed_active_survey_definition()
```

테스트에서는 SQLite를 쓰고, 개발/컴포즈에서는 PostgreSQL DSN을 그대로 받는다.

## `app/db/models.py`

설문 정의, 설문 응답, 사용자 저장 프로필, 추천 캐시를 분리해 둔다.

```text
survey_definitions
+ slug
+ version
+ survey_code
+ scoring_version
+ title
+ description
+ question_count
+ is_active
+ definition_json
```

`definition_json`에는 문항, 선택지, `effects`, `primary_parameters`, `secondary_parameters`가 그대로 들어간다.

```text
survey_responses
+ survey_definition_id
+ survey_slug
+ survey_version
+ survey_code
+ scoring_version
+ source
+ profile_code
+ profile_schema_version
+ profile_name
+ preferred_category_code
+ answers_json
+ scored_profile_json
```

`survey_responses`는 비회원 미리보기까지 포함한 설문 원문 응답 저장소다.
`answers_json`은 문항 코드 응답 원문을, `scored_profile_json`은 0~1 유저 타워 점수 결과를 보관한다.

```text
user_tower_profiles
+ auth_user_uuid unique
+ profile_code indexed
+ survey_definition_id nullable
+ survey_response_id nullable
+ survey_slug nullable
+ survey_version nullable
+ survey_code nullable
+ scoring_version nullable
+ source
+ user_id
+ profile_name
+ preferred_category_code
+ budget_level ... competition_tolerance_level
+ raw_answers
```

`auth_user_uuid`는 JWT `user_profile.uuid`를 그대로 FK처럼 쓴다.
이 테이블에는 로그인 사용자의 최신 저장 상태 한 줄만 남긴다.

```text
user_tower_prediction_cache
+ profile_code
+ model_signature
+ top_k
+ prediction_json
```

같은 `profile_code`와 같은 학습 버전이면 모델 추론 대신 `prediction_json`을 재사용한다.

## `app/two_tower/codecs.py`

`app/two_tower/codecs.py`는 현재 유저 타워 점수와 선호 업종을 base36 공유 코드로 압축한다.
현재 버전은 `3`이다.

```text
r + version(1) + survey_code(1) + category(1) + score_group_1(4) + score_group_2(4) + score_group_3(4)
```

현재 공유 코드는 총 16글자다.
`survey_code` 한 글자가 들어가므로 공유 코드만으로 어떤 설문 정의에서 나온 결과인지 복원할 수 있다.

예전 코드도 읽는다.

```text
v1
+ 9글자
+ 1~5 점수 기반

v2
+ 15글자
+ survey_code 없음
+ 0.00~1.00 점수 기반
```

점수 그룹 순서는 고정이다.

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

`decode_profile_code_details()`는 `survey_code`, `preferred_category_code`, `user_profile`을 같이 돌려준다.

## `app/surveys/definitions.py`

`app/surveys/definitions.py`에는 현재 활성 설문 원본이 들어 있다.
지금 코드 기준 활성 설문은 아래 값으로 seed 된다.

```text
slug: founder-fit-10-final
version: 1
survey_code: A
scoring_version: founder_fit_v1
```

문항은 10개다.
각 선택지는 아래 형태를 가진다.

```json
{
  "code": "A",
  "label": "안정적인 생활 기반",
  "effects": {
    "stability_level": 1.0,
    "competition_tolerance_level": 0.2
  }
}
```

## `app/surveys/service.py`

`app/surveys/service.py`가 설문 정의 검증, 점수 계산, 설문 응답 저장, JWT 저장을 다 묶는다.

```text
get_active_survey_definition()
preview_survey_result()
resolve_survey_result_by_code()
save_survey_result_for_user()
get_saved_survey_result()
```

점수 계산은 선택지 `effects`의 가중 평균이다.
가중치는 문항 메타데이터를 그대로 쓴다.

```text
primary_parameters -> 1.00
secondary_parameters -> 0.65
기타 effects -> 0.50
```

복수선택 문항은 같은 질문이 과도하게 세지지 않도록 선택 개수만큼 나눠서 반영한다.
어떤 파라미터에도 기여가 없으면 `0.50` 중립값을 넣는다.

## `JWT`

`app/core/jwt_auth.py`는 Bearer JWT를 직접 검증한다.
의존성은 `app/api/deps.py`에 있다.

```text
Authorization: Bearer <token>
-> JWKS fetch
-> RS256 서명 검증
-> iss / aud / exp / nbf 확인
-> user_profile.uuid 추출
```

기본 공개 경로는 아래 셋이다.

```text
GET /surveys/active
POST /surveys/active/preview
GET /surveys/results/{profile_code}
```

인증이 필요한 경로는 `/surveys/me/profile` 두 개뿐이다.

## `GET /surveys/active`

프론트 설문 화면은 먼저 이 경로를 읽는다.
응답에는 현재 문항 세트와 점수화 버전이 같이 들어간다.

```json
{
  "id": 1,
  "slug": "founder-fit-10-final",
  "version": 1,
  "survey_code": "A",
  "scoring_version": "founder_fit_v1",
  "title": "창업 성향 설문 10문항 최종",
  "description": "비회원도 바로 응답하고 base36 추천 코드를 받을 수 있는 현재 활성 설문 정의다.",
  "question_count": 10,
  "questions": []
}
```

## `POST /surveys/active/preview`

비회원 설문 흐름의 중심 경로다.
설문 원문 응답을 받고 유저 타워 점수, base36 코드, 추천 결과를 한 번에 만든다.

```json
{
  "top_k": 5,
  "preferred_category_code": "CS100005",
  "profile_name": "설문 결과 프로필",
  "answers": {
    "q1": "A",
    "q2": "C",
    "q3": "D",
    "q4": "A",
    "q5": "C",
    "q6": "A",
    "q7": "B",
    "q8": "A",
    "q9": "D",
    "q10": ["A", "D"]
  }
}
```

흐름은 아래 순서다.

```text
answers
-> 설문 정의 검증
-> 0~1 유저 타워 점수 계산
-> encode_profile_code()
-> resolve_prediction_response()
-> survey_responses 저장
-> profile + prediction 응답
```

응답 `profile.raw_answers`에는 정규화된 문항 코드 응답이 남는다.

## `GET /surveys/results/{profile_code}`

공유 URL 진입 경로다.
`profile_code` 안의 `survey_code`를 보고 설문 정의를 찾는다.

```text
profile_code
-> decode_profile_code_details()
-> survey_code
-> survey_definitions lookup
-> survey_responses latest lookup
-> prediction cache lookup
-> miss 면 runtime predict
```

같은 코드로 미리보기를 이미 한 적이 있으면 `raw_answers`까지 다시 붙는다.

## `PUT /surveys/me/profile`

로그인 사용자의 최신 설문 결과를 저장한다.
프론트는 미리보기 응답에서 받은 `profile_code`와 `survey_response_id`를 그대로 넘기면 된다.

```json
{
  "profile_code": "r3a2g1yf0m4h0zrk",
  "survey_response_id": 12,
  "profile_name": "내 설문 저장본",
  "top_k": 5
}
```

저장 흐름은 아래 순서다.

```text
Bearer JWT
-> user_profile.uuid
-> profile_code decode
-> survey_definition lookup
-> survey_response lookup
-> user_tower_profiles upsert
-> prediction 반환
```

`profile_name`만 덮어쓰고 점수와 업종 코드는 그대로 유지한다.

## `GET /surveys/me/profile`

로그인 사용자의 최신 설문 저장본을 읽는다.
설문 저장본이 없거나, 예전 수동 프로필만 있는 경우에는 `404`를 반환한다.

## `/two-tower/*`

기존 예제 화면과 학습/검증 경로 구현은 코드 안에 남겨 두었다.
기본 설정에서는 OpenAPI와 라우터에서 빠진다.

```text
ONBOARDING_SERVICE_EXPOSE_LEGACY_TWO_TOWER_ROUTES=false
ONBOARDING_SERVICE_EXPOSE_INTERNAL_MODEL_ADMIN_ROUTES=false
```

레거시 예제 경로를 다시 열 때는 아래 플래그를 켠다.

```text
ONBOARDING_SERVICE_EXPOSE_LEGACY_TWO_TOWER_ROUTES=true

/two-tower/catalog
/two-tower/predict
/two-tower/profiles/users/{auth_user_uuid}
/two-tower/profiles/code/{profile_code}
```

이때도 `/two-tower/profiles/users/{auth_user_uuid}` 두 경로는 JWT가 필요하고, path UUID와 JWT UUID가 같아야 한다.

학습/지표 경로는 더 별도 플래그다.

```text
ONBOARDING_SERVICE_EXPOSE_INTERNAL_MODEL_ADMIN_ROUTES=true

/two-tower/evaluation
/two-tower/train
```

즉, 기본 운영 경계는 설문 공개 API와 `/surveys/me/profile`만 남기고, 예제/학습 경로는 opt-in 방식으로 닫아 둔 상태다.

## 주요 파일

- `app/main.py`
- `app/api/routes.py`
- `app/api/deps.py`
- `app/core/jwt_auth.py`
- `app/db/models.py`
- `app/db/session.py`
- `app/surveys/definitions.py`
- `app/surveys/contracts.py`
- `app/surveys/repository.py`
- `app/surveys/service.py`
- `app/two_tower/codecs.py`
- `app/two_tower/service.py`

## 참고 문서

- FastAPI Security Reference: `https://fastapi.tiangolo.com/reference/security/`
- FastAPI Metadata and Docs URLs: `https://fastapi.tiangolo.com/tutorial/metadata/`
- SQLAlchemy asyncio: `https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html`
