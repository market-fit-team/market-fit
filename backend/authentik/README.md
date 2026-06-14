# authentik boilerplate

본 프로젝트는 authentik을 단일 OIDC 인증 서버로 사용.
Google 로그인은 애플리케이션 직접 연동 대신 authentik의 Google OAuth Source로 연결.

## 로컬 URL

- authentik: http://localhost:9000
- Better Auth callback: http://localhost:3000/api/auth/oauth2/callback/authentik
- authentik OIDC discovery: http://localhost:9000/application/o/pickle-web/.well-known/openid-configuration
- authentik JWKS: http://localhost:9000/application/o/pickle-web/jwks/
- Google OAuth callback: http://localhost:9000/source/oauth/callback/google/

## Blueprint 자동화 아키텍처

수동 UI 설정 없이 **Authentik Blueprint**를 활용하여 OIDC Provider, Application, Google OAuth Source 객체를 선언적으로 관리.

### 💡 주요 설계 및 공식 문서 기반 규칙

- **자동 인스턴스화 (Auto-instantiation)**
  Blueprint 백그라운드 자동 적용을 위해 `metadata.labels`에 `blueprints.goauthentik.io/instantiate: "true"` 선언. `authentik-worker` 프로세스의 파일 시스템 이벤트 감지를 통한 트리거.
- **Worker 환경 변수 주입 (`!Env`)**
  Blueprint 내에서 `!Env GOOGLE_CLIENT_ID` 태그로 시크릿 로드. Blueprint 엔진의 `authentik-worker` 컨테이너 내 실행 특성상, `docker-compose.yml`을 통한 명시적 환경 변수 주입으로 전체 트랜잭션 롤백 방지.
- **명시적 Grant Types (Authentik 2026.5+)**
  Authentik 2026.5 버전부터 OAuth2 Provider의 `grant_types` 명시 필수. `authorization_code`, `refresh_token` 추가로 Better Auth 등 OIDC 클라이언트의 권한 부여 코드 흐름(Authorization Code Flow) 구성.
- **Google OAuth Source Slug 일치**
  Google Cloud Console의 승인된 리디렉션 URI(`http://localhost:9000/source/oauth/callback/google/`)에 맞춰 Blueprint 내부 Source 객체 `slug`를 `google`로 고정, 엔드포인트 라우팅 일치.

## 권장 OIDC 계약

```env
JWKS_URL=http://authentik-server:9000/application/o/pickle-web/jwks/
JWT_ISSUER=http://localhost:9000/application/o/pickle-web/
JWT_AUDIENCE=pickle-web
```

`JWKS_URL`은 컨테이너 내부 주소, `JWT_ISSUER`는 토큰의 `iss` claim과 정확히 일치 필수.
