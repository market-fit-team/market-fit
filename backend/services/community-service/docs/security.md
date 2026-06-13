# Security

community-service는 Next.js Better Auth가 발급한 JWT를 검증하는 OAuth2 Resource Server로 동작한다.

## Resource Server JWT 검증

Spring Security의 `NimbusJwtDecoder`를 사용해 JWT 서명과 클레임을 검증한다.

```java
@Bean
public JwtDecoder jwtDecoder(
        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
        @Value("${app.auth.jwt.issuer}") String issuer,
        @Value("${app.auth.jwt.audience}") String audience
) {
    NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

    OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
    OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<Collection<String>>(
            JwtClaimNames.AUD,
            audiences -> audiences != null && audiences.contains(audience)
    );

    jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            issuerValidator,
            audienceValidator
    ));

    return jwtDecoder;
}
```

- **jwk-set-uri**: Better Auth의 공개키 엔드포인트(`http://host.docker.internal:3000/api/auth/jwks`)
- **issuer**: 토큰 발급자(`http://localhost:3000`)
- **audience**: 대상 서비스(`frontend-api`)

## API 엔드포인트 권한

`SecurityConfig.java`에서 엔드포인트별 인가 정책을 설정한다.

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
            "/",
            "/error",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    ).permitAll()
    .requestMatchers(HttpMethod.GET, "/api/v1/posts/**").permitAll()
    .requestMatchers(HttpMethod.POST, "/api/v1/posts/**").authenticated()
    .requestMatchers(HttpMethod.PUT, "/api/v1/posts/**").authenticated()
    .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/**").authenticated()
    .anyRequest().authenticated()
)
```

## 사용자 식별과 소유권 검증

검증된 JWT는 `CurrentUserService`를 통해 내부 `app_users` 테이블의 데이터와 동기화된다. 

```java
@Transactional
public User getRequiredUser(Jwt jwt) {
    if (jwt == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
    return findOrCreateBetterAuthUser(jwt);
}
```

쓰기 및 삭제 연산 시 도메인 계층에서 리소스 소유권을 검증한다.

```java
private void validateOwner(Post post, User currentUser) {
    if (!post.isWrittenBy(currentUser.getId())) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자신의 게시글만 수정하거나 삭제할 수 있습니다.");
    }
}
```

## 주요 파일

- `src/main/java/com/example/server/infrastructure/security/SecurityConfig.java`
- `src/main/java/com/example/server/application/auth/CurrentUserService.java`
- `src/test/java/com/example/server/api/post/PostApiAuthorizationTest.java`

## 참고 문서

- Spring Security OAuth 2.0 Resource Server JWT: `https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html`
- Spring Security Authorize HttpServletRequests: `https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html`
