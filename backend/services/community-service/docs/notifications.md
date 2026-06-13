# 알림 및 SSE 스트림

```text
src/main/java/com/example/server/
├── api/notification/
│   ├── NotificationController.java
│   └── NotificationStreamController.java
├── application/notification/
│   └── NotificationSseService.java
├── core/notification/
│   ├── Notification.java
│   └── NotificationCommandService.java
└── infrastructure/messaging/notification/
    ├── NotificationDeliveryConsumer.java
    └── NotificationRabbitPublisher.java
```

## 저장형 알림

`Notification` 엔티티는 댓글(`POST_REPLY`)이나 좋아요(`POST_LIKE`) 타입의 알림 정보를 기록한다. 
`NotificationCommandService`가 도메인 로직을 수행하며 DB에 알림을 저장한 뒤 `NotificationCreatedEvent` 이벤트를 발행한다. 

저장되는 `notifications` 테이블은 Row Level Security (RLS)가 적용되어 있어, 수신자(`recipient_user_id`)가 본인인 데이터만 조회하거나 수정할 수 있다.

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_post_id BIGINT NOT NULL,
    source_post_id BIGINT NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## RabbitMQ 기반 비동기 전달

발행된 알림 생성 이벤트는 트랜잭션 커밋 완료 후(`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`) `NotificationRabbitPublisher`를 거쳐 RabbitMQ `pickly.events.exchange`로 비동기 전송된다.

- 라우팅 키: `notification.comment.created` 또는 `notification.like.created`
- 소비 큐: `notification.delivery.queue`

`NotificationDeliveryConsumer`는 메시지를 받아 프론트엔드 연결(SSE)로 전송을 시도한다. 메시지 중복 처리를 방지하기 위해 `notification_delivery_events` 테이블에 이벤트의 UUID와 전송 결과(`SSE_SENT`, `STORED_ONLY`, `FAILED`)를 기록한다.

```java
@RabbitListener(queues = RabbitConfig.NOTIFICATION_DELIVERY_QUEUE)
@Transactional
public void handle(NotificationDeliveryMessage message) {
    if (deliveryEventRepository.existsByEventId(message.eventId())) {
        return;
    }

    boolean sent = notificationSseService.sendEventIfConnected(
            message.recipientUserId(),
            "notification.created",
            String.valueOf(message.payload().id()),
            message.payload()
    );

    // ... 전송 상태 DB 저장
}
```

## SSE (Server-Sent Events)

`/api/v1/notifications/stream` 엔드포인트를 통해 클라이언트와 `SseEmitter`를 연결한다. 연결 제한 시간은 1시간이며, 한 사용자가 여러 기기에서 접속할 수 있으므로 `Map<Long, Map<String, SseEmitter>>` 자료구조로 에미터를 관리한다.

브라우저 네트워크 연결 끊김(timeout)을 방지하기 위해 15초마다 스케줄러가 백그라운드에서 heartbeat 코멘트(`thump`)를 전송한다.

```java
@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public SseEmitter stream(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
    User currentUser = currentUserService.getRequiredUser(jwt);
    return notificationSseService.connect(currentUser);
}
```

```java
@Scheduled(fixedDelay = 15_000)
public void sendHeartbeat() {
    emitters.forEach((userId, userEmitters) -> {
        userEmitters.forEach((emitterId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().comment("thump"));
            } catch (IOException | IllegalStateException ex) {
                remove(userId, emitterId);
            }
        });
    });
}
```

## 주요 파일

- `src/main/java/com/example/server/api/notification/NotificationController.java`
- `src/main/java/com/example/server/api/notification/NotificationStreamController.java`
- `src/main/java/com/example/server/application/notification/NotificationSseService.java`
- `src/main/java/com/example/server/core/notification/Notification.java`
- `src/main/java/com/example/server/infrastructure/messaging/notification/NotificationDeliveryConsumer.java`

## 참고 문서

- Spring Web MVC SseEmitter: `https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/mvc/method/annotation/SseEmitter.html`
- Server-sent events: `https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events`
- Spring AMQP: `https://docs.spring.io/spring-amqp/reference/index.html`
