# Community Service

사용자 커뮤니티(게시판, 댓글, 좋아요, 알림 등) 기능을 제공하는 Spring Boot 기반 백엔드 서비스다.
Next.js 프론트엔드가 BFF(proxy)를 거쳐 이 API를 호출한다.

## 폴더 구조

```text
backend/services/community-service/
├── build.gradle
├── docs/
│   ├── README.md
│   └── api.md
├── src/main/java/com/example/server/
│   ├── api/             # HTTP 라우팅 (Controller, DTO)
│   ├── application/     # 유스케이스 로직 (Query Service, Facade, SSE)
│   ├── core/            # 도메인 모델과 비즈니스 로직 (Entity, Command Service)
│   └── infrastructure/  # 외부 연동 (JPA, Redis, RabbitMQ, S3, Security)
└── src/main/resources/
    ├── application.yaml
    └── db/migration/    # Flyway 스키마 버전 관리
```

## JWT 인증과 보안

이 서비스는 프론트엔드(Better Auth)가 발급한 JWT를 받아 인증한다.

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: http://profile-service:8080authentik certs endpoint
app:
  auth:
    jwt:
      issuer: "pickly-frontend"
      audience: "pickle-web"
```

인증 흐름은 아래와 같다.

```text
Next.js BFF
  -> authorization: Bearer <token>
  -> Traefik
  -> community-service
  -> SecurityConfig (NimbusJwtDecoder)
  -> CurrentUserService.getRequiredUser(jwt)
  -> DB에 user가 없으면 jwt claim(email, name)으로 자동 생성
```

데이터베이스 접근에는 RLS(Row Level Security)를 사용해 사용자 데이터 격리를 보장한다.
`DbSessionContext`가 JPA를 통해 DB 세션에 로그인 사용자의 ID를 주입한다.

```sql
select set_config('app.current_user_id', :userId, true)
```

## 주요 기능

- **Post**: 계층형 게시글 구조(root_id, parent_id). 페이징 및 커서 기반 조회 지원.
- **Media**: AWS S3(또는 MinIO) 기반 이미지 파일 업로드.
- **PostLike**: 사용자의 게시글 좋아요 상태 및 갯수 관리.
- **Notification**: RabbitMQ로 이벤트를 전달받아 SSE(Server-Sent Events)로 알림 실시간 푸시.
- **ScheduledPost**: 발행 시간을 지정해 두면, Spring Scheduler와 RabbitMQ를 통해 지연 발행.

## 주요 파일

- `src/main/resources/application.yaml`
- `src/main/java/com/example/server/infrastructure/security/SecurityConfig.java`
- `src/main/java/com/example/server/application/auth/CurrentUserService.java`
- `src/main/java/com/example/server/infrastructure/persistence/session/DbSessionContext.java`

## 참고 문서

- Spring Security OAuth2: `https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html`
- Flyway: `https://documentation.red-gate.com/fd`
