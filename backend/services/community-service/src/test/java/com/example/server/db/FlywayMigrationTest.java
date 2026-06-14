package com.example.server.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.example.server.support.IntegrationTestSupport;

/**
 * [Spring Boot + Flyway + Testcontainers] DB 스키마 마이그레이션 검증 및 RLS 활성화 상태 검증 통합 테스트 클래스
 * V1~V9 마이그레이션 이력과 post_summary_view/notifications 전환 상태를 검증합니다.
 */
class FlywayMigrationTest extends IntegrationTestSupport {

    @Test
    void flyway_migration이_정상_적용된다() {
        // NOTE: flyway_schema_history로부터 적용 완료된 모든 마이그레이션 리스트 정보 조회
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select version, description, success
                from flyway_schema_history
                order by installed_rank
                """);

        // NOTE: 모든 마이그레이션들이 에러 없이 완벽하게 성공(success = true)했는지 확인
        assertThat(rows)
                .extracting(row -> row.get("success"))
                .containsOnly(true);

        // NOTE: V1~V9 마이그레이션이 모두 순차 탑재되었는지 확인
        assertThat(rows)
                .extracting(row -> row.get("version"))
                .contains("1", "2", "3", "4", "5", "6", "7", "8", "9");
    }

    @Test
    void posts_테이블에_rls가_활성화되어_있다() {
        // NOTE: posts 테이블의 pg_class 로우 보안 레벨 정보 조회
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select relrowsecurity, relforcerowsecurity
                from pg_class
                where relname = 'posts'
                """);

        // NOTE: posts 테이블 RLS 및 FORCE 옵션 설정 여부 검증
        assertThat(row.get("relrowsecurity")).isEqualTo(true);
        assertThat(row.get("relforcerowsecurity")).isEqualTo(true);
    }

    @Test
    void posts_rls_policy가_생성되어_있다() {
        // NOTE: posts 테이블의 pg_policies 정책 4개 조회
        List<String> policies = jdbcTemplate.queryForList("""
                select policyname
                from pg_policies
                where tablename = 'posts'
                order by policyname
                """, String.class);

        // NOTE: 정의한 4가지 소유자 권한 제어 정책 확인
        assertThat(policies).contains(
                "posts_select_all",
                "posts_insert_owner",
                "posts_update_owner",
                "posts_delete_owner"
            );
    }

    @Test
    void post_likes_테이블에_rls가_활성화되어_있다() {
        // NOTE: 새로이 생성한 post_likes 테이블의 pg_class 로우 보안 레벨 정보 조회
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select relrowsecurity, relforcerowsecurity
                from pg_class
                where relname = 'post_likes'
                """);

        // NOTE: post_likes 테이블 RLS 및 FORCE 옵션 강제 설정 여부 검증
        assertThat(row.get("relrowsecurity")).isEqualTo(true);
        assertThat(row.get("relforcerowsecurity")).isEqualTo(true);
    }

    @Test
    void post_likes_rls_policy가_생성되어_있다() {
        // NOTE: post_likes 테이블에 부여된 pg_policies 조회
        List<String> policies = jdbcTemplate.queryForList("""
                select policyname
                from pg_policies
                where tablename = 'post_likes'
                order by policyname
                """, String.class);

        // NOTE: V4 스크립트에서 선언한 3가지 좋아요 RLS 보안 정책 실재 여부 검증
        assertThat(policies).contains(
                "post_likes_select_all",
                "post_likes_insert_own",
                "post_likes_delete_own"
        );
    }

    @Test
    void post_summary_view가_생성되어_있다() {
        // NOTE: 데이터베이스 information_schema 정보로부터 post_summary_view 뷰 생성 상태 조회
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.views
                where table_schema = 'public'
                  and table_name = 'post_summary_view'
                """, Integer.class);

        // NOTE: 1개의 post_summary_view가 정상 존재함을 검증
        assertThat(count).isEqualTo(1);
    }

    @Test
    void 기존_post_list_view는_제거되어_있다() {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.views
                where table_schema = 'public'
                  and table_name = 'post_list_view'
                """, Integer.class);

        assertThat(count).isZero();
    }

    @Test
    void notifications_테이블에_rls가_활성화되어_있다() {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select relrowsecurity, relforcerowsecurity
                from pg_class
                where relname = 'notifications'
                """);

        assertThat(row.get("relrowsecurity")).isEqualTo(true);
        assertThat(row.get("relforcerowsecurity")).isEqualTo(true);
    }

    @Test
    void notifications_rls_policy가_생성되어_있다() {
        List<String> policies = jdbcTemplate.queryForList("""
                select policyname
                from pg_policies
                where tablename = 'notifications'
                order by policyname
                """, String.class);

        assertThat(policies).contains(
                "notifications_select_recipient_or_actor",
                "notifications_insert_actor",
                "notifications_update_recipient"
        );
    }
}

