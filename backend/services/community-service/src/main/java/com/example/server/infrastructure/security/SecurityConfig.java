package com.example.server.infrastructure.security;

import java.io.IOException;
import java.net.URI;
import java.util.Collection;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

import lombok.RequiredArgsConstructor;

@Configuration // NOTE: [Spring] 설정 클래스로 지정
@RequiredArgsConstructor // NOTE: [Lombok] final 필드 생성자 주입
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);
    private static final String API_PATH_PATTERN = "/api/**";

    private final ObjectMapper objectMapper;


    @Bean // NOTE: [Spring Security] 보안 필터 체인 빈 등록
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        return http
                .csrf(csrf -> csrf.disable()) // NOTE: JWT 기반 Stateless API이므로 CSRF 비활성화

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/error",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll() // NOTE: [Spring Security] 해당 경로는 인증 없이 허용
                        .requestMatchers(HttpMethod.GET, "/api/v1/posts/**").permitAll() // NOTE: [Spring Security] 게시글 조회는 전체 허용
                        .requestMatchers(HttpMethod.POST, "/api/v1/posts/**").authenticated() // NOTE: [Spring Security] 게시글 작성/댓글/좋아요는 인증 필요
                        .requestMatchers(HttpMethod.PUT, "/api/v1/posts/**").authenticated() // NOTE: [Spring Security] 게시글 수정은 인증 필요
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/posts/**").authenticated() // NOTE: [Spring Security] 게시글 삭제/좋아요 취소는 인증 필요
                        .anyRequest().authenticated() // NOTE: [Spring Security] 그 외 모든 요청은 인증 필요
                )

                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .defaultAuthenticationEntryPointFor(
                                apiAuthenticationEntryPoint(),
                                PathPatternRequestMatcher.withDefaults().matcher(API_PATH_PATTERN)
                        )
                        .defaultAccessDeniedHandlerFor(
                                (request, response, accessDeniedException) -> {
                                    log.warn(
                                            "Access denied. method={}, path={}",
                                            request.getMethod(),
                                            request.getRequestURI()
                                    );
                                    writeProblemDetail(
                                            request,
                                            response,
                                            HttpStatus.FORBIDDEN,
                                            "접근 권한이 없습니다."
                                    );
                                },
                                PathPatternRequestMatcher.withDefaults().matcher(API_PATH_PATTERN)
                        )
                )

                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
            @Value("${app.auth.jwt.issuer}") String issuer,
            @Value("${app.auth.jwt.audience}") String audience
    ) {
        /**
         * NOTE: [authentik OIDC]
         * community-service는 authentik access token만 신뢰합니다.
         * - jwkSetUri: authentik OIDC JWKS endpoint
         * - issuer:   access token의 iss claim
         * - audience: authentik OAuth2/OIDC provider가 발급하는 aud claim
         *
         * jwk-set-uri만으로는 issuer/audience 경계가 충분하지 않으므로
         * issuer/audience validator를 명시적으로 같이 둡니다.
         */
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

    private AuthenticationEntryPoint apiAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            log.warn(
                    "Unauthorized request. method={}, path={}",
                    request.getMethod(),
                    request.getRequestURI()
            );
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
            writeProblemDetail(
                    request,
                    response,
                    HttpStatus.UNAUTHORIZED,
                    "로그인이 필요합니다."
            );
        };
    }

    private void writeProblemDetail(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String message
    ) throws IOException {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, message);
        problemDetail.setInstance(URI.create(request.getRequestURI()));

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problemDetail);
    }


}
