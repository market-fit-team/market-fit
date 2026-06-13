# 테스트 환경 및 전략

```text
src/test/java/com/example/server/
├── api/
│   ├── post/
│   │   ├── PostApiAuthorizationTest.java
│   │   ├── PostCacheTest.java
│   │   ├── PostQueryApiTest.java
│   │   └── PostValidationTest.java
│   └── scheduledpost/
│       └── ScheduledPostApiTest.java
├── db/
│   ├── FlywayMigrationTest.java
│   └── PostRlsPolicyTest.java
└── support/
    ├── IntegrationTestSupport.java
    └── TestDataHelper.java
```

## 통합 테스트 (`IntegrationTestSupport`)

API부터 DB, 인프라 계층까지 실제 운영 환경과 유사한 컨텍스트를 로드하기 위해 `@SpringBootTest`를 사용한다. 모든 API 및 DB 통합 테스트 클래스는 `IntegrationTestSupport` 추상 클래스를 상속받아 테스트 컨텍스트를 공유하고 재사용한다. 

- `@AutoConfigureMockMvc`: HTTP 통신 없이 컨트롤러 계층을 테스트
- `@ActiveProfiles("test")`: `application-test.yml` 설정 적용

## Testcontainers

`IntegrationTestSupport` 내부에서 Testcontainers를 사용해 PostgreSQL, RabbitMQ, Redis 컨테이너를 구동한다. 개발자의 로컬 환경 세팅에 의존하지 않고 일관된 통합 테스트 인프라를 보장한다.

- `PostgreSQLContainer`: DB 저장 및 RLS(Row Level Security) 마이그레이션 테스트
- `RabbitMQContainer`: 비동기 알림 전송 및 큐 매핑 테스트
- `GenericContainer` (Redis): 페이지네이션 및 좋아요 캐시 무효화(`PostCacheTest`) 테스트

## MockMvc 활용

`MockMvc`를 사용해 엔드포인트의 HTTP 상태 코드와 JSON 응답 구조를 검증한다. 테스트에 필요한 데이터는 `TestDataHelper`를 통해 DB에 직접 세팅한 뒤 API 호출을 수행한다.

```java
@Test
void 작성자는_본인_게시글을_수정할_수_있다() throws Exception {
    User alice = testDataHelper.createBetterAuthUser("better-auth-user-alice", "alice@example.com");
    Long postId = testDataHelper.createPost(alice, "수정 전");

    mockMvc.perform(put("/api/v1/posts/{id}", postId)
                    .with(jwtFor(alice))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"content\":\"수정 후\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").value("수정 후"));
}
```

## Spring Security Test와 JWT 모의

이 서비스는 외부 Better Auth 서버에서 발급한 JWT를 검증한다. 통합 테스트 중에는 실제 인증 서버와 통신할 수 없으므로, `spring-security-test` 라이브러리의 `SecurityMockMvcRequestPostProcessors.jwt()`를 활용하여 가짜 JWT를 주입한다.

`IntegrationTestSupport.jwtFor(User)` 메서드가 DB에 생성된 사용자 정보를 바탕으로 모의 토큰을 만든다.

```java
protected RequestPostProcessor jwtFor(User user) {
    Jwt jwt = Jwt.withTokenValue("mock-token")
            .header("alg", "none")
            .subject(user.getProviderSubject())
            .claim("email", user.getEmail())
            .claim("name", user.getName())
            .claim("picture", user.getProfileImageUrl())
            .build();
    return SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt);
}
```

## 주요 파일

- `src/test/java/com/example/server/support/IntegrationTestSupport.java`
- `src/test/java/com/example/server/support/TestDataHelper.java`
- `src/test/java/com/example/server/api/post/PostApiAuthorizationTest.java`
- `src/test/java/com/example/server/api/post/PostQueryApiTest.java`
- `src/test/java/com/example/server/db/PostRlsPolicyTest.java`

## 참고 문서

- Spring Boot Testing: `https://docs.spring.io/spring-boot/reference/testing/index.html`
- MockMvc: `https://docs.spring.io/spring-framework/reference/testing/mockmvc.html`
- Spring Security Testing: `https://docs.spring.io/spring-security/reference/servlet/test/index.html`
- Testcontainers JUnit 5: `https://java.testcontainers.org/test_framework_integration/junit_5/`
