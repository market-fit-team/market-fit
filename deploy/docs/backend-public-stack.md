# backend-public-stack

`deploy/compose/backend-public-stack.yml`은 프론트엔드 standalone 컨테이너와 공개 백엔드 스택을 한 번에 올린다.  
공개 포트는 프론트 `2080`, API/Auth `2081`을 쓴다. API/Auth는 Traefik이 host와 path로 서비스를 나눈다.

```text
market-fit.jongchoi.com
-> frontend standalone

api.market-fit.jongchoi.com
-> Traefik
-> /api/profile     -> profile-service:3001
-> /api/echo        -> echo-service:3002
-> /api/market      -> market-service:8080
-> /api/franchise   -> franchise-service:8080
-> /api/community   -> community-service:8080
-> /api/onboarding  -> onboarding-service:8000
-> /api/agent       -> agent-service:2024
-> /api/post        -> post-service:8080
-> /api/trend       -> trend-service:8000

auth.market-fit.jongchoi.com
-> Traefik
-> authentik-server:9000
```

## deploy/compose/backend-public-stack.yml

이 파일은 프론트엔드 standalone, 공개 게이트웨이, DB, 메시징, 스토리지, 애플리케이션 컨테이너를 한 compose에 둔다.

```yaml
services:
  frontend:
    ports:
      - "${FRONTEND_PUBLIC_PORT:-2080}:3000"

  traefik:
    ports:
      - "${API_PUBLIC_PORT:-2081}:2081"

  authentik-server:
    labels:
      - traefik.http.routers.authentik.rule=Host(`${AUTH_PUBLIC_HOST}`)

  market-service:
    labels:
      - traefik.http.routers.market.rule=Host(`${API_PUBLIC_HOST}`) && PathPrefix(`/api/market`)
```

`backend-db`는 기본 compose에서 dump 파일을 직접 마운트하지 않는다.
덤프 파일은 `deploy/scripts/restore-backend-db-market-franchise.sh`가 `deploy/compose/backend-db-market-franchise.dump.yml`을 덧붙일 때만 `/dump`에 들어간다.

```text
backend-public-stack.yml
-> backend-db data volume만 마운트

backend-public-stack.yml + backend-db-market-franchise.dump.yml
-> /dump/market.dump
-> /dump/franchise.dump
```

`/api/*` prefix는 Traefik strip middleware로 내부 서비스 앞단에서 제거한다.  
예를 들어 `market-service` 컨트롤러는 `/api/v1/status`를 그대로 유지하고, 외부에서는 아래 주소로 보인다.

```text
GET /api/market/api/v1/status
-> market-service GET /api/v1/status
```

## 공개 경로

```text
/api/profile/user-profile
-> profile-service /user-profile

/api/authentik/api/v3/schema/?format=json
-> authentik-server /api/v3/schema/?format=json

/api/echo/echo
-> echo-service /echo

/api/market/api/v1/status
-> market-service /api/v1/status

/api/franchise/api/v1/franchises
-> franchise-service /api/v1/franchises

/api/community/api/v1/posts
-> community-service /api/v1/posts

/api/onboarding/health
-> onboarding-service /health

/api/agent/openapi.json
-> agent-service /openapi.json

/api/agent/api/v1/llm/models
-> agent-service /api/v1/llm/models

/api/post/api/posts
-> post-service /api/posts

/api/trend/health
-> trend-service /health

/api/trend/api/v1/trend/banner
-> trend-service /api/v1/trend/banner
```

## deploy/.env.example

실제 배포 값은 `deploy/.env` 하나에 모은다.
GitHub Actions 배포 워크플로도 `market-fit-deploy/.env`가 아니라 `market-fit-deploy/deploy/.env`만 사용하고 검증한다.
Auth host, API host, frontend origin, frontend Better Auth secret, DB 비밀번호, OAuth secret, LLM key가 여기 들어간다.
트렌드 서비스 DB 비밀번호와 서울 열린데이터 API 키도 같은 파일에서 관리한다.

`CHANGE_ME`, `change_me`, `change-me` 같은 placeholder가 남아 있으면 `deploy/scripts/validate-deploy-env.sh`가 배포와 authentik blueprint refresh를 중단한다.
이 가드는 `AUTHENTIK_CLIENT_SECRET` placeholder가 authentik DB provider secret을 다시 덮어써서 SQL 수동 수정이 무효화되는 일을 막기 위한 것이다.
이미 만들어진 PostgreSQL volume의 role password는 env 변경만으로 자동 갱신되지 않으므로, `make data`는 `deploy/scripts/sync-postgres-passwords.sh`로 현재 `deploy/.env` 값을 DB role에 다시 적용한다.
`deploy-backend-init`은 시작하자마자 `make reset-backend`를 실행해 frontend를 제외한 compose 컨테이너, compose 볼륨, 로컬 backend 이미지를 지운 뒤 다시 배포한다.
`deploy-frontend-init`은 백엔드/DB를 건드리지 않고 `make reset-frontend frontend`로 frontend 컨테이너만 다시 만든다.
두 init 워크플로는 `NO_CACHE=1`로 실행되어 이번 배포 빌드에서 Docker build cache를 재사용하지 않는다.
VPS 전체 BuildKit cache 정리가 필요할 때만 수동으로 `make reset-hard`를 실행한다.

```dotenv
FRONTEND_PUBLIC_ORIGIN=https://market-fit.jongchoi.com
API_PUBLIC_ORIGIN=https://api.market-fit.jongchoi.com
AUTH_PUBLIC_ORIGIN=https://auth.market-fit.jongchoi.com
BETTER_AUTH_SECRET=CHANGE_ME_32+_CHARS_RANDOM_VALUE
TREND_DB_PASSWORD=CHANGE_ME_TREND_DB_PASSWORD
TREND_SERVICE_SEOUL_API_KEY=

AUTHENTIK_CLIENT_ID=pickle-web
AUTHENTIK_CLIENT_SECRET=CHANGE_ME_AUTHENTIK_CLIENT_SECRET
AUTHENTIK_BETTER_AUTH_CALLBACK_URL=https://market-fit.jongchoi.com/api/auth/oauth2/callback/authentik
```

`agent-service`는 `langgraph.json`의 `"env": ".env"`를 읽는다.  
compose는 `deploy/.env`를 `/app/.env`로 마운트해서 별도 agent 전용 env 파일을 만들지 않는다.
프론트 standalone의 Better Auth는 `AUTH_PUBLIC_ORIGIN` 기준 discovery 문서를 읽는다.

Nginx Proxy Manager 같은 상위 프록시 뒤에 둘 때는 Traefik과 Authentik이 `X-Forwarded-*` 헤더를 신뢰하도록 trusted proxy CIDR도 함께 잡아야 한다.

```dotenv
TRAEFIK_FORWARDED_HEADERS_TRUSTED_IPS=127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,100.64.0.0/10
AUTHENTIK_TRUSTED_PROXY_CIDRS=127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,100.64.0.0/10
```

```json
{
  "env": ".env"
}
```

## deploy/authentik/pickle-web.yaml

프로덕션용 Authentik blueprint는 `deploy/authentik/pickle-web.yaml`에 따로 둔다.  
기존 `backend/authentik/blueprints/pickle-web.yaml`을 직접 건드리지 않고, 배포 쪽에서 공개 URL만 오버레이한다.

```yaml
redirect_uris:
  - url: !Env AUTHENTIK_BETTER_AUTH_CALLBACK_URL
    matching_mode: strict

launch_url: !Env FRONTEND_PUBLIC_ORIGIN
```

이 값 때문에 프론트 callback URL과 Authentik provider 설정이 `deploy/.env` 기준으로 맞춰진다.

## deploy/Makefile

배포 순서는 `gateway -> data -> restore-db -> services -> train-models`로 고정했다.

```make
up: gateway data restore-db services train-models
```

개별 단계는 아래 target으로 나뉜다.

```text
make gateway
-> Traefik만 시작

make data
-> PostgreSQL / Redis / RabbitMQ / MinIO 시작
-> trend-db 포함

make restore-db
-> market.dump / franchise.dump 복원

make services
-> Authentik + backend service 시작
-> trend-service 포함

make frontend
-> frontend api:gen
-> frontend standalone 빌드 / 시작

make train-models
-> onboarding-service 모델 학습
-> trend-service 배치 실행
```

덤프 복원과 모델 학습은 플래그로 생략할 수 있다.

```bash
SKIP_RESTORE=1 make up
SKIP_TRAIN=1 make up
SKIP_RESTORE=1 SKIP_TRAIN=1 make up
```

Apple Silicon Mac에서 amd64 이미지 경고를 피하거나 동일 플랫폼으로 강제하고 싶으면 아래 타깃을 쓴다.

```bash
make up-mac
```

`make up-mac`은 `deploy/compose/backend-public-stack.mac.yml` 오버라이드를 함께 사용한다.  
현재는 `backend-db`만 `platform: linux/amd64`로 고정해서 Apple Silicon에서 PostGIS를 안정적으로 띄운다.

## deploy/scripts/restore-backend-db-market-franchise.sh

이 스크립트는 compose service 이름 `backend-db`에 붙어서 `pg_restore`를 실행한다.  
공개 배포 스택에서는 `backend-public-stack.yml`에 `backend-db-market-franchise.dump.yml`을 덧붙여 `backend-db`를 dump 마운트 구성으로 먼저 맞춘 뒤 복원을 진행한다.

```text
docker compose up -d backend-db
-> dump mount 포함
-> backend-db 재기동 또는 재생성 가능

docker compose exec backend-db psql
-> market role 생성/갱신
-> franchise role 생성/갱신
-> market DB 생성
-> franchise DB 생성
-> pg_restore --clean --if-exists /dump/market.dump
-> pg_restore --clean --if-exists /dump/franchise.dump
```

덤프 파일은 `deploy/.local/backend-db-market-franchise/`에 둔다.

```text
deploy/.local/backend-db-market-franchise/market.dump
deploy/.local/backend-db-market-franchise/franchise.dump
```

## deploy/scripts/train-onboarding-models.sh

학습은 `onboarding-service` 컨테이너 안에서 두 스크립트를 직접 호출한다.

```bash
python -m app.models.onboarding_two_tower.train --epochs 20
python -m app.models.onboarding_category_tower.train --epochs 24 --data-mode sample
```

학습 결과는 host의 `.local` 아래로 남긴다.

```text
deploy/.local/onboarding-service-artifacts
-> /app/.artifacts
```

`SKIP_TRAIN=1`은 학습 명령만 생략한다.  
`onboarding-service`는 artifact가 없을 때 첫 runtime load에서 `train_and_save()`를 호출하므로, artifact가 비어 있으면 첫 요청에서 bootstrap 학습이 일어날 수 있다.

```text
load_model()
-> metadata.json 없음
-> train_and_save()
```

관련 코드는 아래 파일에 있다.

```text
backend/services/onboarding-service/app/models/onboarding_two_tower/train.py
backend/services/onboarding-service/app/models/onboarding_category_tower/train.py
```

## deploy/scripts/train-trend-models.sh

이 스크립트는 `trend-db`, `trend-service`를 맞춰 띄운 뒤 `python -m app.batch`를 실행한다.
`.raw/hdong_code_name.sample.csv`가 있으면 `--ingest --force`를 사용하고, 없으면 `--force`만 사용한다.

```text
docker compose up -d --build trend-db trend-service
-> trend-service python -m app.batch --ingest --force
-> 또는 .raw 없음 -> python -m app.batch --force
```

## trend-service 운영 모드

`trend-service`는 배포에서 추가 학습을 수행하지 않고, 기존 `backend/services/trend-service/.artifacts` 산출물을 그대로 읽는다.
DB 모드는 `deploy/.env`의 `TREND_SERVICE_DATA_MODE=db`로 고정한다.

```text
backend/services/trend-service/.artifacts
-> /app/.artifacts

backend/services/trend-service/.raw
-> /app/.raw
```

`.raw`는 선택 자산이다.
있으면 trend 배치가 행정동 이름 CSV를 함께 재적재하고, 없어도 기존 DB 이름 매핑을 유지한 채 점수·배너 스냅샷은 갱신한다.

배포 워크플로는 self-hosted runner의 배포용 작업 저장소 `market-fit-deploy` 안에 있는 ignored 로컬 자산을 그대로 사용한다.
워크플로는 `git reset --hard`와 `git clean -fd`로 tracked/untracked 작업 트리만 배포 브랜치에 맞춘다.
`git clean -fd`는 `.gitignore` 대상인 `deploy/.env`, `deploy/.local`, `.raw`, `.artifacts`를 지우지 않는다.
워크플로는 이 자산을 임시 디렉터리로 복사하거나, 기존 경로를 지운 뒤 다시 복원하지 않는다.

```text
/home/ubuntu/code-server/volumes/home/project/market-fit-deploy
-> deploy/.env
-> deploy/.local/backend-db-market-franchise
-> deploy/.local/post-db
-> backend/services/onboarding-service/.raw
-> backend/services/trend-service/.artifacts
-> backend/services/trend-service/.raw
```

## deploy/scripts/generate-frontend-api-clients.sh

`make frontend`는 `deploy/scripts/generate-frontend-api-clients.sh`를 먼저 실행한다.
이 스크립트는 `deploy/.env`를 읽어 `NEXT_PUBLIC_API_ORIGIN`을 `API_PUBLIC_ORIGIN`으로 맞추고, root `docker-compose.yml` label을 기준으로 `frontend/.orval/service-catalog.json`과 `src/shared/api/generated` 산출물을 다시 만든다.

```text
deploy/.env
-> API_PUBLIC_ORIGIN
-> MARKET_DB_USER / FRANCHISE_DB_USER
-> AUTHENTIK_SERVICE_ROLE_KEY

generate-frontend-api-clients.sh
-> cd frontend
-> npm ci
-> npm run api:gen

make frontend
-> docker compose up -d --build frontend
```

## 주요 파일

- `deploy/compose/backend-public-stack.yml`
- `deploy/compose/backend-db-market-franchise.dump.yml`
- `deploy/.env.example`
- `deploy/Makefile`
- `deploy/authentik/pickle-web.yaml`
- `deploy/postgres/init-service-databases.sh`
- `deploy/scripts/generate-frontend-api-clients.sh`
- `deploy/scripts/restore-backend-db-market-franchise.sh`
- `deploy/scripts/train-onboarding-models.sh`
- `deploy/scripts/train-trend-models.sh`

## 참고 문서

- Docker Compose file reference: `https://docs.docker.com/reference/compose-file/`
- Traefik Docker provider: `https://doc.traefik.io/traefik/providers/docker/`
- Authentik blueprints: `https://docs.goauthentik.io/customize/blueprints/`
- PostgreSQL `pg_restore`: `https://www.postgresql.org/docs/current/app-pgrestore.html`
