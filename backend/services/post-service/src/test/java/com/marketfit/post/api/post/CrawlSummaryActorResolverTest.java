package com.marketfit.post.api.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

class CrawlSummaryActorResolverTest {

    private final Environment environment = org.mockito.Mockito.mock(Environment.class);
    private final CrawlSummaryActorResolver resolver = new CrawlSummaryActorResolver(environment);

    @Test
    void JWT_subject를_헤더보다_우선한다() {
        Jwt jwt = org.mockito.Mockito.mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("jwt-user");

        assertThat(resolver.resolve(jwt, "header-user")).isEqualTo("jwt-user");
    }

    @Test
    void local_profile에서만_X_User_Id를_허용한다() {
        when(environment.acceptsProfiles(org.mockito.ArgumentMatchers.any(Profiles.class)))
                .thenReturn(true);

        assertThat(resolver.resolve(null, " local-user ")).isEqualTo("local-user");
    }

    @Test
    void 운영_profile에서는_X_User_Id만으로_생성할_수_없다() {
        when(environment.acceptsProfiles(org.mockito.ArgumentMatchers.any(Profiles.class)))
                .thenReturn(false);

        assertThatThrownBy(() -> resolver.resolve(null, "forged-user"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(
                        ((ResponseStatusException) exception).getStatusCode()
                ).isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
