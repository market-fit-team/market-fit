# 로컬 개발 환경 설정 (Local Dev)

```text
src/main/
├── resources/
│   ├── application.yaml
│   └── db/migration/*.sql
└── java/com/example/server/infrastructure/
    ├── messaging/config/RabbitConfig.java
    └── storage/config/S3Config.java
```

## 백엔드 지원 서비스 (Backing Services)

서비스 실행을 위해 여러 외부 시스템에 의존한다. 루트 디렉토리의 `docker-compose.yml`을 활용하여 인프라를 로컬 컨테이너로 띄운다.

- **PostgreSQL (`community-db`)**: 5663 포트, Flyway 스키마 적용 대상
- **Redis (`community-redis`)**: 6379 포트, 캐싱(단건 조회, 좋아요 수) 용도
- **RabbitMQ (`community-rabbitmq`)**: 5672/15672 포트, 알림 이벤트 브로드캐스트
- **MinIO (`community-minio`)**: 8900 포트, AWS S3 호환 미디어 스토리지

이 설정값은 `application.yaml`에 환경 변수 템플릿(예: `${REDIS_HOST:localhost}`) 형태로 선언되어 있어, 도커 컨테이너가 아닌 로컬 IDE에서 직접 실행할 때는 기본값(`localhost`)으로 매핑된다.

## `.env` 파일과 JWT 검증 환경

이 서비스는 자체적으로 로그인을 처리하지 않고 Next.js(Better Auth) 프론트엔드가 발급한 JWT를 사용한다. 

- `application.yaml`의 `spring.config.import: optional:file:.env` 설정에 의해 앱 기동 시 `.env` 파일을 자동으로 읽는다.
- `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` 값이 일치해야 인증 필터에서 401 에러를 뱉지 않는다.

```yaml
app:
  auth:
    jwt:
      issuer: ${JWT_ISSUER:http://localhost:9000/application/o/pickle-web/}
      audience: ${JWT_AUDIENCE:pickle-web}
```

## 애플리케이션 실행

Docker로 백업 서비스가 뜬 상태에서 아래 Gradle Wrapper 명령어로 서버를 구동한다. 포트는 기본적으로 `8080`을 사용한다.

```bash
./gradlew bootRun
```

실행 시 `Flyway`가 `src/main/resources/db/migration/*.sql` 스크립트 기반으로 로컬 DB에 테이블 및 RLS(Row Level Security) 정책 마이그레이션을 자동으로 수행한다.

## Swagger UI 활용

Springdoc OpenAPI가 포함되어 있어, 브라우저를 통해 실시간 문서 및 API 테스트 도구에 접근할 수 있다.

- 접속 주소: `http://localhost:8080/swagger-ui.html`
- **인증 테스트**: 프론트엔드 또는 Postman 등에서 유효한 토큰을 획득한 뒤, 우측 상단 `Authorize` 버튼(Bearer 타입)에 토큰을 등록하면 게시글 작성(`POST /api/v1/posts`) 등 인증이 필요한 API를 브라우저에서 바로 테스트할 수 있다.

## 주요 파일

- `docker-compose.yml` (프로젝트 루트)
- `src/main/resources/application.yaml`
- `build.gradle`
- `src/main/java/com/example/server/infrastructure/storage/config/S3Config.java`
- `src/main/java/com/example/server/infrastructure/messaging/config/RabbitConfig.java`
