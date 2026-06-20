# profile-service

`profile-service`는 authentik access token의 `user_profile` claim을 읽어 현재 사용자 프로필을 반환한다.
프로필 수정은 사용자 JWT로 사용자를 식별하고, 내부적으로 `AUTHENTIK_SERVICE_ROLE_KEY`로 authentik `/api/v3/core/users/` API를 호출한다.

## 엔드포인트

- `GET /health`
- `GET /v3/api-docs`
- `GET /me`
- `PATCH /me`
