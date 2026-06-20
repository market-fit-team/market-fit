# JWT Claim 및 사용자 정보 연동 안내

이 문서는 프론트엔드 및 각 마이크로서비스(MSA)에서 Authentik이 발급한 JWT 토큰을 어떻게 활용해야 하는지에 대한 실무적인 가이드입니다.

## 1. JWT 토큰 구조 (Payload)

로그인 완료 후 클라이언트가 전달받는 Access Token(JWT)의 Payload는 대략 다음과 같은 형태를 가집니다.

```json
{
  "iss": "http://localhost:9000/application/o/pickle-web/",
  "sub": "dummy-sub-id-1234567890abcdef",
  "aud": "pickle-web",
  "exp": 1781985011,
  "iat": 1781981411,
  "auth_time": 1781979114,
  "acr": "goauthentik.io/providers/oauth2/default",
  "sid": "dummy-session-id-1234567890abcdef",
  "jti": "dummy-jti-token-1234567890",
  "email": "example@example.com",
  "email_verified": false,
  "name": "홍길동",
  "given_name": "홍길동",
  "preferred_username": "example@example.com",
  "nickname": "example@example.com",
  "groups": [],
  "user_profile": {
    "uuid": "00000000-0000-0000-0000-000000000000",
    "display_name": null,
    "age": null,
    "job": null,
    "avatar_seed": null
  },
  "azp": "pickle-web",
  "uid": "dummy-uid-1234567890",
  "scope": "email profile offline_access user_profile openid"
}
```

## 2. 사용자 식별자 (Foreign Key)

JWT 내부의 **`user_profile.uuid`**는 Authentik의 고유 사용자 식별자인 `authentik_user_uuid`와 동일합니다. 
각 MSA(게시판, 결제 등 다른 서비스)에서 해당 사용자가 작성한 데이터를 DB에 저장할 때는 이 **`user_profile.uuid`를 Foreign Key(FK)로 사용**해야 합니다. 
(예: DB 테이블 설계 시 `author_id` 등의 컬럼을 이 uuid 값을 저장할 수 있도록 구성)

## 3. 프로필 정보 조회 및 활용 (`profile-service`)

MSA나 프론트엔드에서 현재 로그인된 사용자의 프로필 정보(`display_name`, `age`, `job`, `avatar_seed` 등)가 필요할 때는 JWT를 파싱해 사용하는 것도 가능하지만, **`profile-service`의 API를 호출**하여 안전하게 최신 정보를 응답으로 받아오는 방식이 권장됩니다.

### 프로필 조회 API 활용
프론트엔드에서 헤더에 토큰을 담아 `profile-service`로 `GET /user-profile`을 호출하면 다음과 같은 응답을 반환받을 수 있습니다.

- **요청**: `GET /user-profile`
  - **헤더**: `Authorization: Bearer <JWT_TOKEN>` 필수
- **응답 (Response)**:
  ```json
  {
    "uuid": "string (uuid) - user_profile.uuid와 동일",
    "display_name": "string | null",
    "age": "integer | null",
    "job": "string | null",
    "avatar_seed": "string | null"
  }
  ```

이 응답 객체를 바탕으로 화면에 프로필 정보를 표시하거나, 서비스 내부 로직에서 활용하면 됩니다.

---
> 💡 **참고**: 프로필 정보 수정 역시 이와 유사한 형태의 Payload를 담아 `PATCH /user-profile` 로 요청할 수 있으며, 이 경우 Authentik DB에 안전하게 반영됩니다.
