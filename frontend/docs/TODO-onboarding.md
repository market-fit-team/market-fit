`frontend/src/app/onboarding/result/[code]/page.tsx`의 `code`는 이제 업종이 없는 공개 결과 코드다.
`code`만으로는 상권 추천이 완성되지 않는다.
상권 추천은 항상 `code + category_code`로 조회한다.

## 경로

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

## `GET /surveys/active`

```json
{
  "id": 1,
  "slug": "founder-fit-12-final",
  "version": 1,
  "survey_code": "A",
  "scoring_version": "founder_fit_v2",
  "title": "창업 성향 설문 12문항",
  "description": "업종 추천과 상권 추천을 함께 만들기 위한 설문",
  "question_count": 12,
  "questions": []
}
```

## `POST /surveys/active/preview`

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
    "description": "업종 추천과 상권 추천을 함께 만들기 위한 설문",
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

`preview` 호출 시 결과 본체가 DB에 즉시 저장된다.
인증 사용자가 Bearer 토큰을 같이 보내면 이 결과는 저장 목록에도 자동으로 들어간다.

## `GET /surveys/results/{result_code}`

결과 페이지 기본 데이터 조회다.
응답 shape은 `POST /surveys/active/preview`와 같다.
여기서는 업종 없는 성향 결과, 두 유저타워, 업종 추천 리스트만 반환한다.

## `GET /surveys/results/{result_code}/area-recommendations?category_code=...&top_k=5`

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
    "recommendations": []
  }
}
```

상권 추천은 여기서만 조회한다.
같은 성향 결과와 같은 업종 조합이면 DB 캐시를 재사용한다.

## `GET /surveys/me/profile/status`

응답 body:

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

요청 body:

```json
{
  "result_code": "r0a1b2c3d4e5f6g"
}
```

응답 body는 `GET /surveys/results/{result_code}`와 같다.
이 호출은 로그인 사용자의 기본 성향 프로필을 설정하거나 교체한다.

## `GET /surveys/me/profile`

응답 body는 `GET /surveys/results/{result_code}`와 같다.
로그인 사용자의 현재 기본 성향 프로필 본체를 반환한다.

## `POST /surveys/me/saved-results`

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

응답 body:

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

`saved_source`는 아래 값이 올 수 있다.

```text
survey_submit
manual_save
default_profile
```

## `DELETE /surveys/me/saved-results/{result_code}`

응답 body는 없다.
성공하면 `204 No Content`다.

## 제약

```text
result_code는 업종이 없는 공개 결과 코드다.
업종은 result_code에 인코딩되지 않는다.
상권 추천은 result_code + category_code 조합으로 조회한다.
preview는 결과 본체를 즉시 저장한다.
preview/결과 조회는 업종 추천까지 반환한다.
상권 추천 조회는 area-recommendations 경로만 사용한다.
기본 업종 확정 단계는 없다.
confirm-category 경로는 없다.
```
