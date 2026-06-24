# profile-service

`profile-service`는 Authentik access token의 `user_profile` claim을 기준으로 현재 로그인 사용자를 식별한다.
`user_profile.uuid`로 Authentik 사용자를 찾고, 프로필 조회/수정은 내부적으로 `AUTHENTIK_SERVICE_ROLE_KEY`를 사용해 authentik `/api/v3/core/users/` API를 호출한다.

## 엔드포인트

- `GET /health`: 서버 상태 확인
- `GET /v3/api-docs`: OpenAPI 명세 확인
- `GET /user-profile`: 현재 로그인된 사용자의 프로필 조회
  - **헤더 (Headers)**: `Authorization: Bearer <JWT_TOKEN>` 필수
  - **응답 (Response)**:
    ```json
    {
      "uuid": "string (uuid)",
      "display_name": "string | null",
      "age": "integer | null",
      "job": "string | null",
      "avatar_seed": "string | null"
    }
    ```

- `PATCH /user-profile`: 현재 로그인된 사용자의 프로필 수정 (null 전달 시 해당 속성 삭제)
  - **헤더 (Headers)**: `Authorization: Bearer <JWT_TOKEN>` 필수
  - **요청 (Request)**: (수정할 필드만 포함하여 요청)
    ```json
    {
      "display_name": "string | null (optional)",
      "age": "integer | null (optional)",
      "job": "string | null (optional)",
      "avatar_seed": "string | null (optional)"
    }
    ```
  - **응답 (Response)**: 수정이 완료된 후의 프로필 정보 반환 (`GET /user-profile` 응답과 동일)
