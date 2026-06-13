# Community Service Persistence

이 문서는 community-service의 영속성 계층 구현을 설명한다.
데이터베이스 스키마, JPA 엔티티, RLS(Row-Level Security) 적용, 그리고 읽기 전용 View 구현을 다룬다.

## Flyway 마이그레이션

데이터베이스 스키마는 Flyway를 통해 관리된다.
마이그레이션 파일은 `src/main/resources/db/migration/`에 위치한다.

```text
V1__create_users_and_posts.sql
V2__enable_posts_rls.sql
...
V13__create_post_media_attachments.sql
V14__add_scheduled_post_media_attachment_ids.sql
```

스프링 부트 기동 시 자동으로 스키마가 업데이트된다. `build.gradle`에 아래 의존성이 추가되어 있다.

```groovy
implementation 'org.flywaydb:flyway-core'
implementation 'org.flywaydb:flyway-database-postgresql'
```

## Row-Level Security (RLS)

PostgreSQL의 RLS 기능을 사용하여 데이터 접근 권한을 데이터베이스 레벨에서 강제한다.
데이터 변경(INSERT, UPDATE, DELETE) 시 로그인한 사용자의 ID가 일치해야만 작업이 허용된다.

### RLS 정책 구조

마이그레이션 파일에서 RLS 정책을 정의한다.
아래는 `V2__enable_posts_rls.sql`의 일부분이다.

```sql
CREATE POLICY posts_update_own
ON posts
FOR UPDATE
USING (
    app_current_user_id() IS NOT NULL
    AND user_id = app_current_user_id()
)
WITH CHECK (
    app_current_user_id() IS NOT NULL
    AND user_id = app_current_user_id()
);
```

`app_current_user_id()`는 커스텀 데이터베이스 함수로, 트랜잭션 단위로 설정된 `community.current_user_id` 값을 반환한다.

### 세션 변수 설정

`src/main/java/com/example/server/infrastructure/db/DbSessionContext.java`는 트랜잭션이 시작될 때 데이터베이스 세션에 현재 사용자의 ID를 설정한다.

```java
public void setCurrentUserId(Long userId) {
    if (userId != null) {
        jdbcTemplate.update("SELECT set_config('community.current_user_id', ?, true)", userId.toString());
    } else {
        jdbcTemplate.update("SELECT set_config('community.current_user_id', '', true)");
    }
}
```

## Post Summary View

게시글 목록 조회 시 매번 여러 테이블(작성자, 좋아요 개수, 답글 개수, 본인 좋아요 여부)을 조인하는 비용을 줄이기 위해 읽기 전용 View를 사용한다.

### View 정의

`V7__create_post_summary_view.sql`에 정의된 `post_summary_view`이다.
`security_invoker = true`를 사용하여 뷰를 조회할 때도 호출자의 RLS 세션을 따르도록 한다. (예: `liked_by_me` 계산 시 `app_current_user_id()` 사용)

```sql
CREATE OR REPLACE VIEW post_summary_view
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.content,
    p.user_id AS author_id,
    u.name AS author_name,
    u.picture_url AS author_picture_url,
    p.parent_id,
    p.root_id,
    p.depth,
    -- ...
    COUNT(DISTINCT pl.id)::BIGINT AS like_count,
    COUNT(DISTINCT reply.id)::BIGINT AS reply_count,
    EXISTS (
        SELECT 1
        FROM post_likes mine
        WHERE mine.post_id = p.id
          AND mine.user_id = app_current_user_id()
    ) AS liked_by_me
FROM posts p
JOIN app_users u ON u.id = p.user_id
LEFT JOIN post_likes pl ON pl.post_id = p.id
LEFT JOIN posts reply ON reply.parent_id = p.id AND reply.deleted_at IS NULL
GROUP BY ...
```

### View 매핑 엔티티

JPA를 통해 View를 읽기 위해 `src/main/java/com/example/server/infrastructure/persistence/post/query/PostSummaryView.java` 엔티티를 사용한다.
수정을 방지하기 위해 `@Immutable` 어노테이션을 사용한다.

```java
@Entity
@Table(name = "post_summary_view")
@Immutable
public class PostSummaryView {
    @Id
    private Long id;
    private String content;
    @Column(name = "author_id")
    private Long authorId;
    @Column(name = "liked_by_me")
    private Boolean likedByMe;
    // ...
}
```

## 스레드형 게시판 모델

게시글(`posts` 테이블)은 단일 테이블에서 부모/자식 관계를 가진다.
무한 깊이의 스레드를 구성하기 위해 `parent_id`, `root_id`, `depth` 컬럼을 사용한다.

```sql
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT NULL,
    root_id BIGINT NOT NULL,
    depth INT NOT NULL DEFAULT 0,
    -- ...
);
```

- `root_id`: 최상위 게시글 ID를 가리켜, 전체 스레드를 한 번에 조회할 수 있게 한다.
- `parent_id`: 바로 위 부모 게시글 ID를 가리킨다.

## JPA 엔티티와 리포지토리

엔티티 클래스는 `src/main/java/com/example/server/core/` 하위에 위치하며 데이터베이스 테이블과 매핑된다.
예약어가 될 수 있는 테이블 이름은 별도로 매핑한다.

```java
@Entity
@Table(name = "app_users")
public class User {
    // ...
}
```

JPA 리포지토리는 `src/main/java/com/example/server/infrastructure/persistence/` 하위에 위치하며, `JpaRepository`를 상속하여 구현한다. N+1 문제를 방지하기 위해 필요한 경우 `@EntityGraph`를 사용한다.

```java
public interface PostRepository extends JpaRepository<Post, Long> {
    @EntityGraph(attributePaths = {"user", "parent", "root"})
    Optional<Post> findWithUserById(Long id);
}
```

## 알림(Notification) 및 스케줄링

`notifications`, `notification_delivery_events`, `scheduled_posts` 등 다양한 엔티티들이 존재하며, 각각의 기능에 맞춰 연관 관계 및 RLS 정책이 설정되어 있다.
특히 `scheduled_posts`는 `media_attachment_ids` 컬럼을 `JSONB` 타입으로 저장하여 정규화하지 않고 여러 미디어 ID를 리스트 형태로 담는다.

```sql
ALTER TABLE scheduled_posts
ADD COLUMN media_attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
```

## 참고 문서

- Flyway Database Migrations: `https://flywaydb.org/documentation/`
- PostgreSQL Row-Level Security: `https://www.postgresql.org/docs/current/ddl-rowsecurity.html`
- Spring Data JPA: `https://spring.io/projects/spring-data-jpa`
