package com.example.server.infrastructure.openapi;

import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

@Configuration
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER,
        description = """
                Better Auth가 발급한 JWT를 Authorization: Bearer <token> 형태로 전달합니다.
                Swagger UI의 Authorize 버튼에서 토큰을 넣으면 인증이 필요한 API 호출에 자동으로 헤더가 붙습니다.
                """
)
public class OpenApiConfig {
    // NOTE: springdoc이 Swagger UI에 JWT bearerAuth 스키마를 노출하도록 하는 문서화 전용 설정입니다.
    // 실제 JWT 검증은 SecurityConfig / JwtDecoder가 계속 담당합니다.
}
