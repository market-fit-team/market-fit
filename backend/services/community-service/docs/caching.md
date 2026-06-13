# 캐싱

단일 게시글(`Post`) 데이터베이스 조회를 줄이기 위해 Redis 캐시를 사용한다.  
피드 목록 조회 시에도 캐싱을 시도할 수 있으나, 현재 구현은 단건 조회(`findById`)에만 `@Cacheable`이 붙어 있다.

## 구조

```text
src/main/java/com/example/server/
├── application/
│   └── post/
│       └── query/
│           └── PostQueryService.java
├── core/
│   ├── post/
│   │   └── PostCommandService.java
│   └── postlike/
│       └── PostLikeCommandService.java
├── infrastructure/
│   └── cache/
│       └── config/
│           └── RedisConfig.java
└── api/
    └── post/
        └── PostQueryController.java
```

## 주요 파일

- `src/main/java/com/example/server/infrastructure/cache/config/RedisConfig.java`
- `src/main/java/com/example/server/application/post/query/PostQueryService.java`
- `src/main/java/com/example/server/core/post/PostCommandService.java`
- `src/main/java/com/example/server/core/postlike/PostLikeCommandService.java`

## 참고 문서

- Spring Cache Abstraction: `https://docs.spring.io/spring-framework/reference/integration/cache.html`
- Spring Data Redis: `https://docs.spring.io/spring-data/redis/reference/`

## Redis 설정

`RedisConfig.java`에서 캐시 매니저를 생성한다.  
`RedisCacheConfiguration`에 TTL을 10분으로 고정한다.  
데이터는 JSON으로 직렬화되어 저장된다.

```java
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.activateDefaultTyping(
                objectMapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL
        );

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

## 단건 조회 캐싱

`PostQueryService.findById`에 `@Cacheable`이 선언되어 있다.  
메서드가 호출되면 캐시에 `post::[id]` 형태의 키로 찾는다.  
값이 없으면 DB 조회를 거쳐 `PostResponse`를 직렬화해 Redis에 넣는다.  
응답 객체 `PostResponse`에는 로그인 사용자에 따른 개인화 필드(예: `likedByMe`)가 없으므로 사용자 구별 없이 식별자(`#id`) 기준으로 공유된다.

```java
@Transactional(readOnly = true)
@Cacheable(value = "post", key = "#id")
public PostResponse findById(Long id, User currentUser) {
    Post post = postRepository.findWithUserById(id)
            .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

    List<MediaAttachmentResponse> mediaAttachments =
            mediaQueryService.findResponsesByPostIds(List.of(id)).getOrDefault(id, List.of());

    return PostResponse.from(post, mediaAttachments);
}
```

## 캐시 삭제 (Eviction)

게시글에 변경이 일어나면 캐시를 지운다.  
`PostCommandService`와 `PostLikeCommandService`에 `@CacheEvict` 어노테이션이 붙어 있다.

### 게시글 수정/삭제

`post` 캐시 전체와 `posts`, `postList` 캐시 전체를 지운다. (`allEntries = true`)

```java
@Transactional
@CacheEvict(value = {"posts", "postList", "post"}, allEntries = true)
public Post update(Long id, String content, User user) {
    // ...
}

@Transactional
@CacheEvict(value = {"posts", "postList", "post"}, allEntries = true)
public void delete(Long id, User user) {
    // ...
}
```

### 좋아요 생성/취소

좋아요 생성/취소가 단건 `PostResponse` 객체에는 영향을 미치지 않으나(조회 쿼리상 캐시 키 분리가 안 됨), 목록 캐시 등을 함께 지울 목적의 공용 설정이 적용되어 있다.

```java
@Transactional
@CacheEvict(value = {"posts", "postList", "post"}, allEntries = true)
public void like(Long postId, User user) {
    // ...
}

@Transactional
@CacheEvict(value = {"posts", "postList", "post"}, allEntries = true)
public void unlike(Long postId, User user) {
    // ...
}
```

## 캐시 확인 테스트

`PostCacheTest.java`에서 캐시 동작을 검증한다.  
조회 후 Redis에 데이터가 생성되는지, 수정 후 삭제되는지 확인한다.

```java
PostResponse first = postQueryService.findById(postId, null);
Set<String> keysAfterFirst = redisTemplate.keys("post::" + postId);
assertThat(keysAfterFirst).hasSize(1);

postCommandService.update(postId, "Updated content", author);
Set<String> keysAfterUpdate = redisTemplate.keys("post::" + postId);
assertThat(keysAfterUpdate).isEmpty();
```
