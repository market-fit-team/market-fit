# survey API

`app/api/routes.py`는 설문 정의 조회, 결과 생성, 공개 결과 조회, 로그인 사용자 저장 기능을 한 라우터에 모아 둔다.

```text
GET /surveys/active
POST /surveys/active/preview
GET /surveys/results/{result_code}
GET /surveys/results/{result_code}/area-recommendations?category_code=...&top_k=5
GET /surveys/me/profile/status
PUT /surveys/me/profile
GET /surveys/me/profile
POST /surveys/me/saved-results
GET /surveys/me/saved-results
DELETE /surveys/me/saved-results/{result_code}
```

## `result_code`

`result_code`는 업종이 들어 있지 않은 공개 결과 코드다.
상권 추천은 항상 `result_code + category_code` 조합으로 조회한다.
기본 업종 확정 단계는 없다.
`/surveys/results/{result_code}/confirm-category` 같은 경로도 없다.

```text
result_code
+ 설문 결과 본체 식별자
+ 공유 URL 식별자
+ 기본 프로필 / 저장 결과 연결 키

category_code
+ 상권 추천 조회 시에만 사용
+ result_code에 인코딩되지 않음
```

## `GET /surveys/active`

프론트 설문 화면은 먼저 이 경로를 읽는다.
응답은 `SurveyDefinitionResponse`다.

```json
{
  "id": 1,
  "slug": "founder-fit-12-final",
  "version": 1,
  "survey_code": "A",
  "scoring_version": "founder_fit_v2",
  "title": "창업 성향 설문 12문항",
  "description": "업종 추천용 유저타워와 상권 추천용 유저타워를 함께 계산하는 현재 활성 설문 정의다.",
  "question_count": 12,
  "questions": [
    {
      "id": "q1",
      "selection_type": "single",
      "prompt": "주말 오후에 가장 자주 가는 곳은 어디인가요?",
      "max_selections": null,
      "options": [
        {
          "code": "A",
          "label": "집 근처 카페나 동네 가게"
        }
      ],
      "primary_parameters": [
        "resident_focus_level",
        "weekend_preference_level",
        "traffic_volume_preference"
      ],
      "secondary_parameters": [
        "subway_dependency_level",
        "stability_level",
        "labor_intensity_tolerance"
      ]
    }
  ]
}
```

## `POST /surveys/active/preview`

설문 응답으로 결과 본체를 만들고 DB에 바로 저장한다.
Bearer 토큰이 있으면 저장 목록에도 `survey_submit`으로 같이 들어간다.
응답은 `SurveyResultResponse`다.

요청 body:

```json
{
  "profile_name": "설문 결과 프로필",
  "answers": {
    "q1": "B",
    "q2": "A",
    "q3": "C",
    "q4": "A",
    "q5": "C",
    "q6": "B",
    "q7": "B",
    "q8": "A",
    "q9": "C",
    "q10": "A",
    "q11": "C",
    "q12": ["B", "D"]
  }
}
```

응답 body:

```json
{
  "survey": {
    "id": 1,
    "slug": "founder-fit-12-final",
    "version": 1,
    "survey_code": "A",
    "scoring_version": "founder_fit_v2",
    "title": "창업 성향 설문 12문항",
    "description": "업종 추천용 유저타워와 상권 추천용 유저타워를 함께 계산하는 현재 활성 설문 정의다.",
    "question_count": 12
  },
  "result_code": "r0a1b2c3d4e5f6g",
  "profile_name": "설문 결과 프로필",
  "share_path": "/onboarding/result/r0a1b2c3d4e5f6g",
  "share_url": "http://localhost:3000/onboarding/result/r0a1b2c3d4e5f6g",
  "area_user_profile": {
    "user_id": "survey_a_area",
    "profile_name": "설문 결과 프로필",
    "budget_level": 0.42,
    "stability_level": 0.81,
    "subway_dependency_level": 0.77,
    "weekend_preference_level": 0.31,
    "evening_preference_level": 0.55,
    "resident_focus_level": 0.44,
    "worker_focus_level": 0.73,
    "rent_sensitivity_level": 0.28,
    "competition_tolerance_level": 0.67
  },
  "category_user_profile": {
    "user_id": "survey_a_category",
    "profile_name": "설문 결과 프로필",
    "target_category_code": null,
    "stability_level": 0.62,
    "competition_tolerance_level": 0.57,
    "weekend_preference_level": 0.48,
    "lunch_preference_level": 0.71,
    "evening_preference_level": 0.39,
    "late_night_preference_level": 0.11,
    "target_age_10_level": 0.08,
    "target_age_20_level": 0.22,
    "target_age_30_level": 0.31,
    "target_age_40_level": 0.24,
    "target_age_50_plus_level": 0.15,
    "female_preference_level": 0.64,
    "avg_ticket_preference": 0.58,
    "traffic_volume_preference": 0.74,
    "franchise_affinity_level": 0.19,
    "labor_intensity_tolerance": 0.45,
    "space_efficiency_preference": 0.53
  },
  "category_recommendations": [
    {
      "rank": 1,
      "score": 0.82,
      "service_category_code": "CS100005",
      "service_category_name": "제과점",
      "category_group": "외식",
      "stability_prior_score": 0.74,
      "competition_pressure_score": 0.33,
      "weekend_sales_ratio": 0.48,
      "evening_sales_ratio": 0.39,
      "late_night_sales_ratio": 0.07,
      "female_sales_ratio": 0.61,
      "franchise_ratio": 0.22
    }
  ],
  "created_at": "2026-06-22T14:30:00Z"
}
```

## `GET /surveys/results/{result_code}`

결과 페이지 기본 데이터 조회다.
응답 shape은 `POST /surveys/active/preview`와 같다.
여기서는 업종 없는 성향 결과, 두 유저타워, 업종 추천 리스트만 반환한다.

## `GET /surveys/results/{result_code}/area-recommendations`

상권 추천은 이 경로에서만 조회한다.
같은 성향 결과와 같은 업종 조합이면 DB 캐시를 재사용한다.
응답은 `SurveyAreaRecommendationResponse`다.

쿼리:

```text
category_code: 조회할 업종 코드
top_k: 기본값 5, 최소 1, 최대 10
```

응답 body:

```json
{
  "result_code": "r0a1b2c3d4e5f6g",
  "selected_category_code": "CS100005",
  "share_path": "/onboarding/result/r0a1b2c3d4e5f6g",
  "share_url": "http://localhost:3000/onboarding/result/r0a1b2c3d4e5f6g",
  "prediction": {
    "trained_at": "2026-06-22T12:34:56Z",
    "model_signature": "onboarding_two_tower:2026-06-22T12:34:56Z:minmax_zero_to_one_v1",
    "top_k": 5,
    "user_profile": {
      "user_id": "survey_a_area",
      "profile_name": "설문 결과 프로필",
      "preferred_category_code": "CS100005",
      "budget_level": 0.42,
      "stability_level": 0.81,
      "subway_dependency_level": 0.77,
      "weekend_preference_level": 0.31,
      "evening_preference_level": 0.55,
      "resident_focus_level": 0.44,
      "worker_focus_level": 0.73,
      "rent_sensitivity_level": 0.28,
      "competition_tolerance_level": 0.67
    },
    "recommendations": [
      {
        "rank": 1,
        "score": 0.81,
        "item_id": "11740",
        "area_name": "성수역 상권",
        "service_category_name": "제과점",
        "area_profile_type": "station_area",
        "sales_amount": 154000000.0,
        "weekend_sales_ratio": 0.48,
        "evening_sales_ratio": 0.41,
        "resident_population": 21543,
        "worker_population": 38112,
        "subway_commercial_trend_score": 0.72,
        "category_opportunity_score": 0.66,
        "demand_gap_score": 0.58
      }
    ]
  }
}
```

## `GET /surveys/me/profile/status`

기본 성향 프로필 존재 여부만 빠르게 확인한다.

```json
{
  "has_default_profile": true,
  "default_result_code": "r0a1b2c3d4e5f6g"
}
```

기본 프로필이 없으면:

```json
{
  "has_default_profile": false,
  "default_result_code": null
}
```

## `PUT /surveys/me/profile`

로그인 사용자의 기본 성향 프로필을 설정하거나 교체한다.
응답 body는 `GET /surveys/results/{result_code}`와 같다.

요청 body:

```json
{
  "result_code": "r0a1b2c3d4e5f6g"
}
```

이 호출은 저장 목록에도 같은 결과를 `default_profile`로 upsert 한다.

## `GET /surveys/me/profile`

로그인 사용자의 현재 기본 성향 프로필 본체를 반환한다.
응답 body는 `GET /surveys/results/{result_code}`와 같다.

## `POST /surveys/me/saved-results`

로그인 사용자가 특정 결과 코드를 저장 목록에 추가한다.
응답은 `SavedSurveyResultSummary`다.

요청 body:

```json
{
  "result_code": "r0a1b2c3d4e5f6g",
  "saved_label": "관심 결과"
}
```

응답 body:

```json
{
  "result_code": "r0a1b2c3d4e5f6g",
  "profile_name": "설문 결과 프로필",
  "share_path": "/onboarding/result/r0a1b2c3d4e5f6g",
  "share_url": "http://localhost:3000/onboarding/result/r0a1b2c3d4e5f6g",
  "saved_source": "manual_save",
  "saved_label": "관심 결과",
  "result_created_at": "2026-06-22T14:30:00Z",
  "saved_at": "2026-06-22T14:35:00Z"
}
```

## `GET /surveys/me/saved-results`

응답은 `SavedSurveyResultListResponse`다.

```json
{
  "default_result_code": "r0a1b2c3d4e5f6g",
  "results": [
    {
      "result_code": "r0a1b2c3d4e5f6g",
      "profile_name": "설문 결과 프로필",
      "share_path": "/onboarding/result/r0a1b2c3d4e5f6g",
      "share_url": "http://localhost:3000/onboarding/result/r0a1b2c3d4e5f6g",
      "saved_source": "default_profile",
      "saved_label": null,
      "result_created_at": "2026-06-22T14:30:00Z",
      "saved_at": "2026-06-22T14:31:00Z"
    }
  ]
}
```

`saved_source`는 아래 값이 온다.

```text
survey_submit
manual_save
default_profile
```

## `DELETE /surveys/me/saved-results/{result_code}`

성공하면 `204 No Content`다.
응답 body는 없다.

## 주요 파일

- `app/api/routes.py`
- `app/surveys/contracts.py`
- `app/surveys/service.py`
- `app/surveys/definitions.py`
- `app/two_tower/contracts.py`
- `app/models/onboarding_category_tower/contracts.py`

## 참고 문서

- FastAPI Path Parameters: https://fastapi.tiangolo.com/tutorial/path-params/
- FastAPI Query Parameters: https://fastapi.tiangolo.com/tutorial/query-params/
- Pydantic Models: https://docs.pydantic.dev/latest/concepts/models/
