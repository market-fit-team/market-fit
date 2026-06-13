# Community API

community-service에서 제공하는 주요 REST API 및 이벤트 흐름이다.

## `/api/v1/posts`

게시글 생성, 조회, 수정, 삭제를 담당한다.
조회(GET)는 인증 없이 접근할 수 있고, 쓰기(POST/PUT/DELETE)는 JWT 인증이 필수다.

```java
@RestController
@RequestMapping("/api/v1/posts")
public class PostCommandController {
    @PostMapping
    public PostResponse create(@RequestBody PostDraft draft, @AuthenticationPrincipal Jwt jwt) { ... }

    @PostMapping("/{postId}/replies")
    public PostResponse createReply(@PathVariable Long postId, @RequestBody PostDraft draft, @AuthenticationPrincipal Jwt jwt) { ... }
}
```

조회는 Offset 페이징과 Cursor 페이징을 모두 지원한다.

```text
GET /api/v1/posts?page=0&size=20
GET /api/v1/posts/cursor?cursor=abc&size=20
GET /api/v1/posts/{postId}/replies?cursor=abc
GET /api/v1/posts/{postId}/thread
```

- 스레드 조회는 해당 글을 중심으로 부모 글(ancestors)과 답글(replies)을 모아서 보여준다.
- `PostQueryController`가 이 역할을 담당한다.

## `/api/v1/posts/{postId}/likes`

게시글 좋아요 토글.

```java
@RestController
@RequestMapping("/api/v1/posts")
public class PostLikeController {
    @PostMapping("/{postId}/likes")
    public ResponseEntity<Void> like(@PathVariable Long postId, @AuthenticationPrincipal Jwt jwt) { ... }

    @DeleteMapping("/{postId}/likes")
    public ResponseEntity<Void> unlike(@PathVariable Long postId, @AuthenticationPrincipal Jwt jwt) { ... }
}
```

- 본인의 좋아요 여부를 추가/삭제한다.
- 캐시(Redis)에 저장된 게시글 단건(`post::{id}`)과 목록 캐시를 무효화(evict)한다.

## `/api/v1/media`

이미지 첨부를 처리한다. `multipart/form-data`를 받는다.

```java
@RestController
@RequestMapping("/api/v1/media")
public class MediaAttachmentController {
    @PostMapping
    public MediaAttachmentResponse upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "altText", required = false) String altText,
            @AuthenticationPrincipal Jwt jwt
    ) { ... }
}
```

- 업로드된 이미지는 S3 스토리지에 저장되고 URL(`presignedGetUrl`)이 클라이언트에 제공된다.
- 게시글 작성/수정 시 `mediaAttachmentIds` 배열을 함께 전달해 게시글과 이미지를 연결한다.

## `/api/v1/scheduled-posts`

게시글 예약 발행을 담당한다.

```java
@RestController
@RequestMapping("/api/v1/scheduled-posts")
public class ScheduledPostCommandController {
    @PostMapping
    public ScheduledPostResponse create(@RequestBody ScheduledPostDraft draft, @AuthenticationPrincipal Jwt jwt) { ... }
}
```

- DB에 예약된 시간(`scheduledAt`)과 함께 저장된다.
- `ScheduledPostPublisherScheduler`가 스캔하여 시간이 되면 RabbitMQ(`pickly.events.exchange` -> `post.scheduled.publish.queue`)로 발행 이벤트를 보낸다.

## `/api/v1/notifications`

알림 목록 조회, 읽음 처리, SSE 구독을 담당한다.

```text
GET /api/v1/notifications/stream               # SSE 구독 연결
GET /api/v1/notifications?cursor=abc           # 알림 목록 조회
GET /api/v1/notifications/unread-count         # 안 읽은 알림 개수
PATCH /api/v1/notifications/{id}/read          # 읽음 처리
PATCH /api/v1/notifications/read-all           # 모두 읽음 처리
DELETE /api/v1/notifications/{id}              # 단건 삭제
```

```java
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Jwt jwt) { ... }
}
```

- `NotificationSseService`가 연결된 브라우저에 `SseEmitter`로 이벤트를 쏴준다.
- 좋아요/댓글 발생 시 `NotificationDeliveryListener`가 RabbitMQ 메시지를 수신해서 SSE 이벤트를 발송한다.

## 주요 파일

- `src/main/java/com/example/server/api/post/PostCommandController.java`
- `src/main/java/com/example/server/api/post/PostQueryController.java`
- `src/main/java/com/example/server/api/media/MediaAttachmentController.java`
- `src/main/java/com/example/server/api/notification/NotificationController.java`
- `src/main/java/com/example/server/api/scheduledpost/ScheduledPostCommandController.java`

## 참고 문서

- Spring Web MVC: `https://docs.spring.io/spring-framework/reference/web/webmvc.html`
- Server-Sent Events: `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events`
