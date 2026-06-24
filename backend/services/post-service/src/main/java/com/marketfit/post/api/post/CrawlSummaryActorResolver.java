package com.marketfit.post.api.post;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class CrawlSummaryActorResolver {

    private static final Profiles LOCAL_PROFILES = Profiles.of("local", "dev");

    private final Environment environment;

    public String resolve(Jwt jwt, String localUserId) {
        if (jwt != null && hasText(jwt.getSubject())) {
            return jwt.getSubject().trim();
        }
        if (environment.acceptsProfiles(LOCAL_PROFILES) && hasText(localUserId)) {
            log.warn("[PostSecurity] Using local X-User-Id override in local/dev profile.");
            return localUserId.trim();
        }
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "AI 리포트 저장에는 인증이 필요합니다."
        );
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
