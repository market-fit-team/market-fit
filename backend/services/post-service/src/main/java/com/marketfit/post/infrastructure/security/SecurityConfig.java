package com.marketfit.post.infrastructure.security;

import java.util.Collection;

import java.util.List;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

        @Bean
        SecurityFilterChain securityFilterChain(
                        HttpSecurity http,
                        Environment environment
        ) throws Exception {
                boolean localDevelopment = environment.acceptsProfiles(Profiles.of("local", "dev"));
                return http
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .authorizeHttpRequests(authorize -> authorize
                                                .requestMatchers("/", "/error", "/v3/api-docs/**", "/swagger-ui/**")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/posts/main").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/posts/crawl-preview")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/posts/main-carousel")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/posts/*/comments")
                                                .permitAll()
                                                .requestMatchers("/api/notifications/**")
                                                .authenticated()
                                                .requestMatchers(HttpMethod.GET, "/api/posts/me/**").authenticated()
                                                .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/posts/crawl-summary")
                                                .access((authentication, context) -> new org.springframework.security.authorization.AuthorizationDecision(
                                                                localDevelopment
                                                                                || (authentication.get() != null
                                                                                                && authentication.get().getPrincipal() instanceof Jwt)
                                                ))
                                                .requestMatchers("/api/posts/**").authenticated()
                                                .anyRequest().authenticated())
                                .oauth2ResourceServer(resourceServer -> resourceServer.jwt(jwt -> {
                                }))
                                .build();
        }

        @Bean
        JwtDecoder jwtDecoder(
                        @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
                        @Value("${app.auth.issuer}") String issuer,
                        @Value("${app.auth.audience}") String audience) {
                NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
                OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
                OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<Collection<String>>(
                                JwtClaimNames.AUD,
                                audiences -> audiences != null && audiences.contains(audience));
                decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuerValidator, audienceValidator));
                return decoder;
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(List.of(
                                "http://localhost:3000",
                                "http://127.0.0.1:3000"));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setExposedHeaders(List.of("*"));
                configuration.setAllowCredentials(false);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

}
