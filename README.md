# nginx-msa

authentik을 이용한 OIDC/JWT 발급 및 Traefik을 이용한 MSA 보일러플레이트입니다.

## 인증 구조

```txt
Google
  -> authentik Google OAuth Source
  -> authentik OAuth2/OIDC Provider (pickle-web)
  -> Better Auth genericOAuth
  -> frontend Bearer access token
  -> backend services JWKS/issuer/audience 검증
```

앱은 Google을 직접 신뢰하지 않습니다. Google은 authentik 내부 Source로만 사용하고, 프론트엔드와 백엔드는 authentik OIDC provider만 바라봅니다.

## 주요 서비스

- `authentik-server` / `authentik-worker`: OIDC IdP 및 Google social login source 관리
- `frontend`: Next.js + Better Auth genericOAuth
- `traefik`: API gateway / CORS
- `profile-service`, `agent-service`, `community-service`: authentik access token 검증

## 로컬 시작

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
# .env의 AUTHENTIK_SECRET_KEY, PG_PASS, Google OAuth 값을 교체한 뒤 실행
docker compose up -d
```

초기 설정 및 Google Source 연결은 `backend/authentik/README.md`를 확인하세요.
