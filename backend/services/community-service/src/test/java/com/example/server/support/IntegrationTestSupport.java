package com.example.server.support;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;

import com.example.server.core.user.User;

/**
 * [Spring Boot + Testcontainers] 통합 테스트를 위한 공통 지원 클래스입니다.
 * PostgreSQL과 Redis 컨테이너를 도커 상에 띄우고 Spring Boot 컨텍스트와 연동합니다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestSupport {

    private static final String APP_DB_USER = "app_user";
    private static final String APP_DB_PASSWORD = "app_user_pw";

    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18-alpine")
            .withDatabaseName("test")
            .withUsername("postgres")
            .withPassword("postgres")
            .withInitScript("db/testcontainers/init-postgres-role.sql");

    @SuppressWarnings("resource")
    private static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @SuppressWarnings("resource")
    private static final RabbitMQContainer rabbitmq = new RabbitMQContainer("rabbitmq:4-management-alpine");

    static {
        // NOTE: Spring Test Context 캐시가 켜진 상태에서 컨테이너 포트가 바뀌면
        // 이전 포트를 참조해 Connection refused가 날 수 있으므로, 테스트 JVM에서 1회만 기동한다.
        redis.start();
        postgres.start();
        rabbitmq.start();
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected TransactionTemplate transactionTemplate;

    @Autowired
    protected StringRedisTemplate redisTemplate;

    @DynamicPropertySource
    static void registerDatasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", () -> APP_DB_USER);
        registry.add("spring.datasource.password", () -> APP_DB_PASSWORD);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", () -> APP_DB_USER);
        registry.add("spring.flyway.password", () -> APP_DB_PASSWORD);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.rabbitmq.host", rabbitmq::getHost);
        registry.add("spring.rabbitmq.port", rabbitmq::getAmqpPort);
    }

    // NOTE: RLS(Row Level Security)를 우회하여 모든 테이블의 데이터를 격리하기 위해 TRUNCATE 실행
    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("TRUNCATE TABLE notifications, post_likes, post_media_attachments, scheduled_posts, posts, app_users RESTART IDENTITY CASCADE");
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    protected RequestPostProcessor jwtFor(User user) {
        return SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(jwt -> jwt
                        .subject(user.getProviderSubject())
                        .audience(List.of("pickle-api"))
                        .claim("email", user.getEmail())
                        .claim("name", user.getName()));
    }
}
