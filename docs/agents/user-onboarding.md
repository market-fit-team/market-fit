# user-onboarding.md

## 실행 명령어 (Makefile)

전체 서비스를 기동하기 위해 프로젝트 루트에서 다음 명령어를 실행한다. 도커 데몬이 필요하다.

```bash
make dev
```

`make dev` 명령어는 `docker-compose.yml`의 인프라(authentik, Traefik, PostgreSQL, Redis, RabbitMQ, MinIO 등)를 빌드하고 구동한 뒤, 프론트엔드 데이터베이스 마이그레이션 및 Next.js 개발 서버를 실행한다.

서버가 실행된 후 Next.js의 스키마와 타입들을 초기화하기 위해서 아래의 명령어를 실행한다.

```bash
make api-gen
```

인프라를 종료하고 데이터 볼륨을 정리할 때는 다음 명령어를 실행한다.

```bash
make clean
```

## 데이터베이스 초기화

### 프론트엔드 데이터베이스

Better Auth 관련 테이블 생성을 위해 `frontend` 디렉터리에서 마이그레이션을 실행한다. (루트에서 `make dev` 실행 시 자동으로 함께 수행된다.)

```bash
cd frontend
npm run db:migrate
```

## 환경 변수 설정 (.env)

각 구성 요소마다 `.env.example` 파일을 복사하여 `.env` 파일을 생성하고 설정값을 입력한다.

- **루트 디렉터리**: `.env.example`을 복사하여 `.env` 생성
  - Google Identity Provider 연동을 위한 Client ID 및 Client Secret 설정
- **`frontend`**: `frontend/.env.example`을 복사하여 `frontend/.env` 생성
  - Better Auth Secret, 데이터베이스 연결 URL, authentik Secret 설정
- **`backend/services/agent-service`**: `backend/services/agent-service/.env.example`을 복사하여 `backend/services/agent-service/.env` 생성
  - 필요한 외부 AI API Key(Gemini 등) 설정

## 권장 VSCODE 확장 목록

개발 환경 구성을 위해 다음 필수 IDE 확장 기능들이 설치되어있는지 확인하고 사용자에게 안내한다.

### Java 관련 (7개 패키지)

- `redhat.java` (Language Support for Java)
- `vscjava.vscode-java-pack` (Java Extension Pack)
- `vscjava.vscode-java-debug` (Debugger for Java)
- `vscjava.vscode-java-dependency` (Project Manager for Java)
- `vscjava.vscode-java-test` (Test Runner for Java)
- `vscjava.vscode-maven` (Maven)
- `vscjava.vscode-gradle` (Gradle)

### Python 관련

- `ms-python.python` (Python)
- `ms-pyright.pyright` (Pyright)

### 프론트엔드 및 포맷터 관련

- `bradlc.vscode-tailwindcss` (Tailwind CSS)
- `esbenp.prettier-vscode` (Prettier)
- `dbaeumer.vscode-eslint` (ESLint)

## 개발 환경 요구 사양

### 언어 및 런타임 버전

- **Java**: Java 21 (JDK 21) 필수 (market-service, franchise-service, post-service 등)
- **Python**: Python 3.13 이상 필수 (agent-service 등)
- `frontend/package-lock.json` 파일은 Node.js v22.18.0, npm 10.9.3 환경을 기준으로 생성되었으며, lockfileVersion 3 형식을 사용한다.

### 필수 도구

- **Docker**: 로컬 인프라(PostgreSQL, RabbitMQ, MinIO 등) 구동 및 통합 테스트 실행을 위해 Docker 데몬(Daemon) 실행이 필수적이다.
- **uv**: 파이썬 의존성 및 가상환경 관리(agent-service)를 위해 `uv` 설치가 필수적이다.
