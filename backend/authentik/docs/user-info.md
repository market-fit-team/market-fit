# authentik 사용자 정보 저장과 JWT claim

`backend/authentik/blueprints/pickle-web.yaml`의 `pickle-web` provider는 지금 `openid`, `email`, `profile` scope mapping만 연결한다.

```yaml
property_mappings:
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, openid]]
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, email]]
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, profile]]
  - !KeyOf pickle-web-user-profile-scope
```

현재 브라우저에서 보이는 `nickname` claim은 authentik 사용자 테이블의 전용 컬럼이 아니다.
기본 `profile` scope mapping이 `request.user.username`을 `nickname`과 `preferred_username`으로 내보낸 결과다.

```python
return {
    "name": request.user.name,
    "given_name": request.user.name,
    "preferred_username": request.user.username,
    "nickname": request.user.username,
    "groups": [group.name for group in request.user.groups.all()],
}
```

그래서 `nickname`만 직접 수정하는 설계는 없다.
표시명은 `name`을 바꾸거나 `attributes.display_name` 같은 커스텀 값을 저장한 뒤 scope mapping에서 claim으로 꺼내야 한다.

## User object

authentik 사용자 객체의 기본 필드는 `username`, `email`, `uid`, `name`, `path`, `attributes`다.
커스텀 값은 `attributes`에 넣는 방식이 공식 모델이다.

```text
username
email
uid
name
attributes
```

이 프로젝트에서 추가로 관리할 값은 `attributes`에 둔다.

```json
{
  "attributes": {
    "display_name": "example-user",
    "age": 29,
    "job": "backend-engineer",
    "avatar_seed": "example-user"
  }
}
```

`display_name`을 쓰면 `request.user.name`과 분리된다.
실명 프로필과 서비스 표시명을 따로 가져가야 할 때 이 방식이 맞다.

## PATCH /api/v3/core/users/{pk}/

이 저장소는 `backend/authentik/blueprints/pickle-web.yaml`에서 `svc-msa-user-api` 서비스 계정과 `AUTHENTIK_SERVICE_ROLE_KEY` 토큰을 만든다.
이 토큰은 `authentik_core.change_user` 권한으로 `/api/v3/core/users/{pk}/` 수정 API를 호출한다.

```text
svc-msa-user-api
  -> role: msa-user-api-manager
  -> permissions:
     authentik_core.add_user
     authentik_core.view_user
     authentik_core.change_user
     authentik_core.delete_user
```

MSA는 사용자 JWT로 authentik 사용자를 수정하지 않는다.
JWT는 식별과 인증에만 쓰고, 실제 사용자 프로필 원본은 서비스 롤 키로 수정한다.

```sh
curl -sfS -X PATCH \
  -H "Authorization: Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "display_name": "example-user",
      "age": 29,
      "job": "backend-engineer",
      "avatar_seed": "example-user"
    }
  }' \
  "http://authentik-server:9000/api/v3/core/users/5/"
```

실명까지 함께 수정해야 하면 `name`을 같이 보낸다.

```sh
curl -sfS -X PATCH \
  -H "Authorization: Bearer ${AUTHENTIK_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example User",
    "attributes": {
      "display_name": "example-user",
      "age": 29,
      "job": "backend-engineer",
      "avatar_seed": "example-user"
    }
  }' \
  "http://authentik-server:9000/api/v3/core/users/5/"
```

부분 수정 API라서 필요한 필드만 보내면 된다.
`attributes`는 객체 단위로 보내는 쪽이 안전하다.

## nickname 대신 display_name

현재 `profile` scope는 `nickname == username`이다.
그래서 서비스에서 닉네임을 따로 운영하려면 둘 중 하나로 정해야 한다.

1. `username`을 계속 로그인 식별자로 쓰고, 표시명은 `attributes.display_name`으로 분리한다.
2. `name`을 표시명으로 재정의하고, 실명 개념을 포기한다.

이 저장소는 Google 로그인 이메일을 `username`으로 고정하고 있다.

```python
email = request.context["prompt_data"]["email"]
request.context["prompt_data"]["username"] = email
return False
```

그래서 `username`은 로그인 식별자로 유지하고, 화면 표시는 `attributes.display_name`으로 분리하는 편이 안전하다.

권장 shape:

```json
{
  "name": "example user",
  "attributes": {
    "display_name": "example-user",
    "age": 29,
    "job": "backend-engineer",
    "avatar_seed": "example-user"
  }
}
```

## JWT claim

`attributes`에 저장한 값은 자동으로 JWT에 들어가지 않는다.
OAuth2 scope mapping을 추가해서 claim으로 노출해야 한다.

```python
return {
    "authentik_user_pk": request.user.pk,
    "authentik_user_uuid": str(request.user.uuid),
    "display_name": request.user.attributes.get("display_name"),
    "age": request.user.attributes.get("age"),
    "job": request.user.attributes.get("job"),
    "avatar_seed": request.user.attributes.get("avatar_seed"),
}
```

`nickname` claim을 기존 클라이언트 호환용으로 유지해야 하면 커스텀 mapping에서 같이 반환한다.

```python
return {
    "authentik_user_pk": request.user.pk,
    "authentik_user_uuid": str(request.user.uuid),
    "nickname": request.user.attributes.get("display_name", request.user.username),
    "display_name": request.user.attributes.get("display_name"),
    "age": request.user.attributes.get("age"),
    "job": request.user.attributes.get("job"),
    "avatar_seed": request.user.attributes.get("avatar_seed"),
}
```

새 scope mapping을 provider에 연결해야 토큰에 포함된다.

```yaml
property_mappings:
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, openid]]
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, email]]
  - !Find [authentik_providers_oauth2.scopemapping, [scope_name, profile]]
  - !KeyOf pickle-web-user-profile-scope
```

클라이언트가 명시적으로 scope를 요청하지 않는 현재 구성에서는 provider에 연결된 scope들이 기본 요청에 함께 적용된다.
다른 MSA의 장기 FK는 `authentik_user_uuid`를 사용한다.
`authentik_user_pk`는 authentik REST 상세 조회와 PATCH 호출용 보조 키로만 사용한다.

## Google OAuth Source

Google OAuth Source는 소스 property mapping으로 사용자 속성을 만들 수 있다.
다만 Google 기본 프로필만으로는 `age`, `job` 값을 안정적으로 받지 못한다.

```python
return {
    "name": data.get("displayName"),
    "attributes": {
        "avatar_seed": data.get("email"),
    },
}
```

소스 property mapping은 외부 IdP가 주는 값만 초기 입력으로 가져오는 용도다.
이 프로젝트에서 `age`, `job`, `display_name`은 첫 로그인 후 MSA가 서비스 롤 키로 저장하는 흐름이 맞다.

## 요청 흐름

```text
Browser
  -> 로그인 완료
  -> access token 수신
MSA
  -> JWT 검증
  -> authentik_user_pk 또는 uuid 식별
  -> GET /api/v3/core/users/{pk}/
  -> profile 초기값 확인
  -> PATCH /api/v3/core/users/{pk}/
     attributes.display_name
     attributes.age
     attributes.job
     attributes.avatar_seed
```

JWT만으로는 authentik 사용자 row를 수정하지 않는다.
수정은 항상 `AUTHENTIK_SERVICE_ROLE_KEY`로 호출한다.

## 주요 파일

- `backend/authentik/blueprints/pickle-web.yaml`
- `backend/authentik/docs/msa-user-api.md`
- `backend/authentik/docs/user-info.md`
- `frontend/scripts/fetch-service-catalog.mjs`
- `frontend/orval.config.ts`

## 참고 문서

- User properties and attributes: https://docs.goauthentik.io/users-sources/user/user_ref/
- Manage users: https://docs.goauthentik.io/users-sources/user/user_basic_operations/
- Users partial update: https://api.goauthentik.io/reference/core-users-partial-update/
- Users retrieve: https://api.goauthentik.io/reference/core-users-retrieve/
- Service accounts: https://docs.goauthentik.io/sys-mgmt/service-accounts/
- API overview: https://api.goauthentik.io/
- Source property mappings: https://docs.goauthentik.io/users-sources/sources/property-mappings/
- Provider property mappings: https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/
- OAuth 2.0 provider: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Prompt stage: https://docs.goauthentik.io/add-secure-apps/flows-stages/stages/prompt/
- User write stage: https://docs.goauthentik.io/add-secure-apps/flows-stages/stages/user_write/
- authentik default OAuth scope blueprint: https://github.com/goauthentik/authentik/blob/main/blueprints/system/providers-oauth2.yaml
