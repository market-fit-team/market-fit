package com.example.server.api.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;

/**
 * [Spring Boot + Redis Cache] 게시글 단건 및 좋아요 관련 캐시 정책 통합 테스트 클래스
 * 페이지네이션 도입에 따라 유저별로 다르게 렌더링되어야 하는 게시글 목록(posts) 조회가 캐싱되지 않는지 검증하고,
 * 단건 게시글 조회(post) 및 좋아요 변경 시 캐시 무효화가 정상 동작하는지 테스트합니다.
 */
class PostCacheTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper; // NOTE: 구글 유저 및 글, 좋아요 더미 세팅용 헬퍼 주입

    @Autowired
    private StringRedisTemplate redisTemplate; // NOTE: Redis 캐시 저장 내역을 검증하기 위한 템플릿 주입

    @Test
    void 페이지네이션_목록_조회_시에는_posts_all_캐시가_생성되지_않는다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        testDataHelper.createPost(alice, "페이징 캐시 테스트 글");

        // NOTE: 페이징 목록 조회 API 수행 (인증 필수 조건 탑재)
        mockMvc.perform(get("/api/v1/posts")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk());

        // NOTE: 페이지네이션 데이터는 사용자마다 likedByMe 상태가 상이하여 목록 캐싱 대상에서 배제하므로 키가 없어야 함
        Set<String> keys = redisTemplate.keys("posts::*");
        assertThat(keys).isEmpty();
    }

    @Test
    void 단건_조회_후_post_id_캐시가_생성된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "단건 캐시 테스트 글");

        // NOTE: 최초 게시글 단건 조회 요청
        mockMvc.perform(get("/api/v1/posts/{id}", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk());

        // NOTE: 두 번째 조회도 캐시 역직렬화 문제 없이 정상 응답해야 함
        mockMvc.perform(get("/api/v1/posts/{id}", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk());

        // NOTE: Redis 상에 post::{id} 캐시 키가 정상 생성되었는지 확인
        Set<String> keys = redisTemplate.keys("post::" + postId);
        assertThat(keys).isNotNull();
        assertThat(keys).contains("post::" + postId);
    }

    @Test
    void 좋아요를_누르면_해당_게시글_단건_캐시는_무효화_삭제된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "좋아요 캐시 삭제 테스트 글");

        // NOTE: 먼저 단건 조회하여 post::{id} 캐시 생성 유도
        mockMvc.perform(get("/api/v1/posts/{id}", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk());

        assertThat(redisTemplate.keys("post::" + postId)).contains("post::" + postId);

        // NOTE: 좋아요 API 호출 (성공적인 캐시 Eviction 유도)
        mockMvc.perform(post("/api/v1/posts/{postId}/likes", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        // NOTE: 좋아요 추가로 인한 데이터 일관성 유지를 위해 post::{id} 캐시 키가 안전하게 삭제되었는지 확인
        assertThat(redisTemplate.keys("post::" + postId)).doesNotContain("post::" + postId);
    }

    @Test
    void 좋아요를_취소하면_해당_게시글_단건_캐시는_무효화_삭제된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "좋아요 취소 캐시 삭제 테스트 글");
        testDataHelper.likePost(alice, postId); // NOTE: 먼저 좋아요가 눌러진 상태 빌드

        // NOTE: 먼저 단건 조회하여 post::{id} 캐시 생성 유도
        mockMvc.perform(get("/api/v1/posts/{id}", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk());

        assertThat(redisTemplate.keys("post::" + postId)).contains("post::" + postId);

        // NOTE: 좋아요 취소 API 호출 (성공적인 캐시 Eviction 유도)
        mockMvc.perform(delete("/api/v1/posts/{postId}/likes", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        // NOTE: 좋아요 취소로 인한 데이터 일관성 유지를 위해 post::{id} 캐시 키가 안전하게 삭제되었는지 확인
        assertThat(redisTemplate.keys("post::" + postId)).doesNotContain("post::" + postId);
    }
}
