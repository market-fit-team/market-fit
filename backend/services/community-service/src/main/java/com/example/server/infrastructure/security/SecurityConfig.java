package com.example.server.infrastructure.security;

import java.io.IOException;
import java.util.Collection;

import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
                                PathPatternRequestMatcher.withDefaults().matcher("/api/**")
                        )
                        .defaultAccessDeniedHandlerFor(
                                (request, response, accessDeniedException) -> {
                                    log.warn(
                                            "Access denied. method={}, path={}",
                                            request.getMethod(),
                                            request.getRequestURI()
                                    );
                                    writeJsonError(
                                            response,
                                            HttpServletResponse.SC_FORBIDDEN,
                                            "접근 권한이 없습니다."
                                    );
                                },
                                PathPatternRequestMatcher.withDefaults().matcher("/api/**")
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
         * NOTE: [Auth Migration]
         * community-service도 profile-service와 동일하게 Better Auth JWT를 검증합니다.
         * - jwkSetUri: Next.js Better Auth의 /api/auth/jwks 공개키
         * - issuer:   frontend .env의 JWT_ISSUER와 동일해야 함
         * - audience: frontend .env의 JWT_AUDIENCE와 동일해야 함
         *
         * Spring Boot의 jwk-set-uri 기본 설정은 서명/만료 검증에는 충분하지만,
         * issuer/audience까지 명시적으로 맞춰야 다른 issuer의 토큰이 섞이는 문제를 막을 수 있습니다.
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
            writeJsonError(
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "로그인이 필요합니다."
            );
        };
    }

    private void writeJsonError(
            HttpServletResponse response,
            int status,
            String message
    ) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":" + status + ",\"message\":\"" + message + "\"}"
        );
    }


}
