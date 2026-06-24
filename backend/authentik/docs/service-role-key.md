# authentik MSA 사용자 API 서비스롤키

## 목적

`.env`의 `AUTHENTIK_SERVICE_ROLE_KEY`는 내부 MSA가 authentik 사용자 DB를 생성/조회/수정/삭제할 때 사용하는 서비스롤키다.
이 값은 일반 로그인용 OIDC client secret이 아니다.

`AUTHENTIK_CLIENT_SECRET`은 `pickle-web` OIDC authorization code 교환용 client secret이고,
`AUTHENTIK_SERVICE_ROLE_KEY`는 내부 서버 간 REST API 호출용 Bearer token이다.

```env
AUTHENTIK_SERVICE_ROLE_KEY=...
```

MSA는 이 값을 다음처럼 사용한다.

```http
Authorization: Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}
```

## 부트스트랩 방식

서비스롤키 부트스트랩은 Python 스크립트나 수동 API 호출로 하지 않는다.
`backend/authentik/blueprints/pickle-web.yaml`이 authentik blueprint로 다음 리소스를 모두 만든다.

- `msa-user-api-manager` role
- `svc-msa-user-api` service account
- `msa-user-api-token` API token
- 사용자 생성/조회/수정/삭제 global permissions

`docker-compose.yml`은 `AUTHENTIK_SERVICE_ROLE_KEY`를 `authentik-server`와 `authentik-worker`에 주입한다.
blueprint 파일은 `/blueprints/pickle-web.yaml`로 마운트된다.

```yaml
AUTHENTIK_SERVICE_ROLE_KEY: "${AUTHENTIK_SERVICE_ROLE_KEY:?AUTHENTIK_SERVICE_ROLE_KEY를 .env에 설정하세요}"
```

`backend/authentik/blueprints/pickle-web.yaml`은 `!Env AUTHENTIK_SERVICE_ROLE_KEY`로 `.env` 값을 읽고,
그 값을 `msa-user-api-token.key`로 등록한다.

```yaml
key: !Env AUTHENTIK_SERVICE_ROLE_KEY
```

따라서 아래 파일과 명령은 사용하지 않는다.

```text
backend/authentik/scripts/bootstrap-msa-user-api.py
make authentik-bootstrap-msa-user-api
```

## 권한 구조

`svc-msa-user-api` 서비스 계정은 `msa-user-api-manager` role을 가진다.
그 role에는 authentik 사용자 CRUD global permission이 직접 부여된다.

```text
svc-msa-user-api
  -> role: msa-user-api-manager
  -> token: msa-user-api-token
  -> permissions:
     authentik_core.add_user
     authentik_core.view_user
     authentik_core.change_user
     authentik_core.delete_user
```

`authentik_rbac.initialpermissions`는 여기서 사용하지 않는다.
initial permissions는 새로 생성된 객체에 대한 object-level permission을 자동 부여하는 기능이고,
여기서 필요한 것은 `/api/v3/core/users/` 전체에 대한 사용자 CRUD global permission이다.

## Authorization

MSA 컨테이너 안에서는 authentik REST API를 내부 주소로 호출한다.

```http
GET http://authentik-server:9000/api/v3/core/users/?page_size=20
Authorization: Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}
```

브라우저/프론트 개발 환경에서는 Traefik 라벨이 붙은 `/api/authentik` 경로를 쓴다.
`docker-compose.yml`의 `authentik-strip` middleware가 `/api/authentik` prefix를 제거하고 authentik으로 넘긴다.

```text
/api/authentik/core/users/
-> authentik-server:9000/api/v3/core/users/
```

## /core/users/

MSA에서 사용하는 authentik 사용자 DB API는 `/api/v3/core/users/` 아래로 제한한다.
Orval 카탈로그에는 `app.api.name=authentik-users`로 들어간다.

```http
GET    /api/v3/core/users/
POST   /api/v3/core/users/
GET    /api/v3/core/users/{id}/
PATCH  /api/v3/core/users/{id}/
DELETE /api/v3/core/users/{id}/
```

`id`는 authentik REST API의 `pk`다.
서비스 DB에서 장기 외부키로 들고 갈 값은 `uuid`를 우선한다.
`pk`는 REST 상세 호출용 캐시 컬럼으로 둔다.

```json
{
  "pk": 5,
  "uuid": "27bc9058-687c-4dba-a409-0ef1bea8ff24",
  "username": "user@example.com",
  "name": "Example User",
  "email": "user@example.com",
  "is_active": true,
  "attributes": {
    "displayName": "example-user"
  }
}
```

프로필 표시명처럼 서비스 전체에서 공유할 값은 authentik user `attributes`에 둔다.

```http
PATCH /api/v3/core/users/5/
Authorization: Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}
Content-Type: application/json

{
  "attributes": {
    "displayName": "example-user"
  }
}
```

## JWT

현재 `pickle-web` OAuth2 provider는 `sub_mode: hashed_user_id`다.
이 값은 authentik REST user의 `pk`나 `uuid`가 아니다.

```yaml
issuer_mode: per_provider
sub_mode: hashed_user_id
include_claims_in_id_token: true
```

백엔드 서비스가 JWT만으로 authentik user DB row를 찾아야 하면 authentik OAuth scope mapping에 별도 claim을 추가한다.

```json
{
  "sub": "hashed-provider-subject",
  "authentik_user_pk": 5,
  "authentik_user_uuid": "27bc9058-687c-4dba-a409-0ef1bea8ff24"
}
```

JWT 검증은 지금처럼 JWKS/issuer/audience 계약으로 한다.
사용자 프로필 원본 생성/조회/수정/삭제는 `AUTHENTIK_SERVICE_ROLE_KEY`로 `/core/users/`를 호출한다.

```text
Browser
  -> Authorization: Bearer <authentik access token>
  -> MSA verifies JWT with JWKS
  -> MSA reads auth user profile with AUTHENTIK_SERVICE_ROLE_KEY
```

## 주요 파일

- `docker-compose.yml`
- `.env.example`
- `backend/authentik/blueprints/pickle-web.yaml`
- `backend/authentik/docs/msa-user-api.md`
- `backend/authentik/docs/authentik-userdb-without-better-auth.md`
- `frontend/scripts/fetch-service-catalog.mjs`
- `frontend/orval.config.ts`

삭제 대상:

- `backend/authentik/scripts/bootstrap-msa-user-api.py`

## 공식 문서

- Blueprints: https://docs.goauthentik.io/customize/blueprints/
- Blueprint 구조: https://docs.goauthentik.io/customize/blueprints/v1/structure/
- Blueprint 모델: https://docs.goauthentik.io/customize/blueprints/v1/models/
- Blueprint YAML 태그: https://docs.goauthentik.io/customize/blueprints/v1/tags/
- Worker: https://docs.goauthentik.io/worker/
- Service accounts: https://docs.goauthentik.io/sys-mgmt/service-accounts/
- 권한 관리: https://docs.goauthentik.io/users-sources/access-control/manage_permissions/
- Initial permissions: https://docs.goauthentik.io/users-sources/access-control/initial_permissions/
- API authentication: https://api.goauthentik.io/authentication/
- Users list: https://api.goauthentik.io/reference/core-users-list/
- Users create: https://api.goauthentik.io/reference/core-users-create/
- Users retrieve: https://api.goauthentik.io/reference/core-users-retrieve/
- Users partial update: https://api.goauthentik.io/reference/core-users-partial-update/
- Users destroy: https://api.goauthentik.io/reference/core-users-destroy/
- OAuth2 provider: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
