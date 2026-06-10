package com.example.server.core.user;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity // NOTE: [JPA] DB 테이블과 매핑되는 객체
@Table(
        name = "app_users", // NOTE: [JPA] 매핑할 테이블 이름 (user는 DB 예약어일 수 있으므로 app_users 사용)
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_provider_subject",
                        columnNames = {"provider", "provider_subject"}
                ) // NOTE: [JPA] 복합 유니크 제약 조건 설정 (동일 프로바이더 내에서 서브젝트는 유일해야 함)
        }
)
@Getter // NOTE: [Lombok] Getter 메서드 자동 생성
@NoArgsConstructor(access = AccessLevel.PROTECTED) // NOTE: [Lombok] 안전한 기본 생성자 생성 (접근제한 PROTECTED)
public class User {

    @Id // NOTE: [JPA] 테이블의 기본 키(PK)로 지정
    @GeneratedValue(strategy = GenerationType.IDENTITY) // NOTE: [JPA] 기본 키 생성을 DB에 위임 (자동 증가)
    private Long id;

    // 예: better-auth, google
    // NOTE: 인증 provider 이름입니다. 현재 런타임은 Next.js Better Auth JWT를 사용하므로 better-auth가 기본입니다.
    @Column(nullable = false, length = 50) // NOTE: [JPA] DB 컬럼 설정 (null 불가, 길이 50)
    private String provider;

    // NOTE: provider 안에서 유일한 사용자 식별자입니다. Better Auth JWT 기준으로는 jwt.sub = user.id 입니다.
    @Column(name = "provider_subject", nullable = false, length = 100) // NOTE: [JPA] DB 컬럼 설정
    private String providerSubject;

    @Column(nullable = false) // NOTE: [JPA] DB 컬럼 설정
    private String email;

    @Column(nullable = false) // NOTE: [JPA] DB 컬럼 설정
    private boolean emailVerified;

    @Column(nullable = false) // NOTE: [JPA] DB 컬럼 설정
    private String name;

    @Column(name = "picture_url") // NOTE: [JPA] snake_case 형식의 테이블 컬럼과 매핑 명시
    private String pictureUrl;

    @Enumerated(EnumType.STRING) // NOTE: [JPA] Enum 값을 문자열로 DB에 저장
    @Column(nullable = false, length = 30) // NOTE: [JPA] DB 컬럼 설정
    private UserRole role;

    // NOTE: [Java] 생성자 (외부에서 직접 호출 불가, 팩토리 메서드 사용 권장)
    private User(
            String provider,
            String providerSubject,
            String email,
            boolean emailVerified,
            String name,
            String pictureUrl
    ) {
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.email = email;
        this.emailVerified = emailVerified;
        this.name = name;
        this.pictureUrl = pictureUrl;
        this.role = UserRole.USER; // NOTE: 기본 권한은 USER로 설정
    }

    /**
     * NOTE: [Auth Migration]
     * 외부 인증 시스템에서 검증된 사용자를 community-service 내부 User로 생성합니다.
     * 현재 운영 흐름은 Better Auth JWT를 사용하므로 provider="better-auth", providerSubject=jwt.sub 형태로 저장합니다.
     */
    public static User createExternalUser(
            String provider,
            String providerSubject,
            String email,
            boolean emailVerified,
            String name,
            String pictureUrl
    ) {
        return new User(
                provider,
                providerSubject,
                email,
                emailVerified,
                name,
                pictureUrl
        );
    }

    /**
     * NOTE: [Backward Compatibility]
     * 기존 테스트/시드 코드가 Google user 생성 메서드를 사용하고 있어 유지합니다.
     * 런타임 인증 매핑은 CurrentUserService에서 createExternalUser("better-auth", ...)를 사용합니다.
     */
    public static User createGoogleUser(
            String providerSubject,
            String email,
            boolean emailVerified,
            String name,
            String pictureUrl
    ) {
        return createExternalUser(
                "google",
                providerSubject,
                email,
                emailVerified,
                name,
                pictureUrl
        );
    }

    // NOTE: [Java] 외부 인증 프로필 정보 갱신을 위한 범용 메서드
    public void updateExternalProfile(
            String email,
            boolean emailVerified,
            String name,
            String pictureUrl
    ) {
        this.email = email;
        this.emailVerified = emailVerified;
        this.name = name;
        this.pictureUrl = pictureUrl;
    }

    /**
     * NOTE: [Backward Compatibility]
     * 기존 Google 기준 호출부를 깨지 않기 위한 위임 메서드입니다.
     */
    public void updateGoogleProfile(
            String email,
            boolean emailVerified,
            String name,
            String pictureUrl
    ) {
        updateExternalProfile(email, emailVerified, name, pictureUrl);
    }
}
