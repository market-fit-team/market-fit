package com.example.server.application.auth;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.server.core.user.User;
import com.example.server.infrastructure.persistence.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Service // NOTE: [Spring] 서비스 클래스로 지정
@RequiredArgsConstructor // NOTE: [Lombok] final 필드 생성자 주입
@Transactional(readOnly = true) // NOTE: 기본은 조회 전용. 사용자 자동 생성 메서드는 아래에서 별도 쓰기 트랜잭션 적용.
public class CurrentUserService {

    /**
     * NOTE: [Keycloak Migration]
     * jwt.getSubject()는 Keycloak realm user id입니다.
     * Better Auth는 Next.js session facade로만 남고, backend user identity provider는 keycloak으로 고정합니다.
     */
    private static final String KEYCLOAK_PROVIDER = "keycloak";

    private final UserRepository userRepository;

    /**
     * 인증이 반드시 필요한 API에서 사용합니다.
     *
     * JWT가 없으면 401을 반환하고, JWT가 유효하지만 community DB에 사용자가 없으면 자동 생성합니다.
     * 이렇게 해야 첫 로그인 사용자가 posts/likes/media/notifications처럼 내부 user_id FK가 필요한 도메인을
     * 바로 사용할 수 있습니다.
     */
    @Transactional // NOTE: JWT 유효 + app_users 미존재 시 신규 User를 저장해야 하므로 readOnly=false 필요.
    public User getRequiredUser(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "로그인이 필요합니다."
            );
        }

        return findOrCreateKeycloakUser(jwt);
    }

    /**
     * 공개 조회 API에서 사용합니다.
     *
     * 예: GET /api/v1/posts/** 는 SecurityConfig에서 permitAll로 열려 있습니다.
     * 비로그인 사용자는 Optional.empty()로 두고, 로그인 사용자는 User를 찾아 likedByMe 같은 개인화 필드에 사용합니다.
     */
    @Transactional // NOTE: 로그인 상태로 공개 조회를 처음 호출해도 User 자동 생성이 가능해야 함.
    public Optional<User> getOptionalUser(Jwt jwt) {
        if (jwt == null) {
            return Optional.empty();
        }

        return Optional.of(findOrCreateKeycloakUser(jwt));
    }

    private User findOrCreateKeycloakUser(Jwt jwt) {
        String providerSubject = requireSubject(jwt);

        return userRepository
                .findByProviderAndProviderSubject(KEYCLOAK_PROVIDER, providerSubject)
                .map(existingUser -> updateProfileIfNeeded(existingUser, jwt))
                .orElseGet(() -> userRepository.save(User.createExternalUser(
                        KEYCLOAK_PROVIDER,
                        providerSubject,
                        requireEmail(jwt),
                        true,
                        resolveName(jwt),
                        resolvePictureUrl(jwt)
                )));
    }

    private User updateProfileIfNeeded(User user, Jwt jwt) {
        /**
         * NOTE: Keycloak 프로필 정보가 바뀌었을 때 community DB도 최신 표시명을 따라가도록 갱신합니다.
         * provider/providerSubject는 로그인 식별자이므로 변경하지 않습니다.
         */
        user.updateExternalProfile(
                requireEmail(jwt),
                true,
                resolveName(jwt),
                resolvePictureUrl(jwt)
        );
        return user;
    }

    private String requireSubject(Jwt jwt) {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "JWT subject가 없습니다."
            );
        }
        return subject;
    }

    private String requireEmail(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "JWT email claim이 없습니다."
            );
        }
        return email;
    }

    private String resolveName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name != null && !name.isBlank()) {
            return name;
        }

        /**
         * NOTE: name claim이 없는 토큰도 서비스 사용은 가능해야 합니다.
         * app_users.name은 NOT NULL이므로 email을 표시명 fallback으로 사용합니다.
         */
        return requireEmail(jwt);
    }

    private String resolvePictureUrl(Jwt jwt) {
        /**
         * NOTE: Keycloak profile/userinfo mapper가 picture 또는 image claim을 넣을 수 있으므로 양쪽 키를 허용합니다.
         */
        String picture = jwt.getClaimAsString("picture");
        if (picture != null && !picture.isBlank()) {
            return picture;
        }
        return jwt.getClaimAsString("image");
    }
}
