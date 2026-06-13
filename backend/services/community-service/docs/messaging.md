# 메시징과 비동기 작업

## RabbitMQ 설정

`pickly.events.exchange`라는 `TopicExchange`를 통해 비동기 이벤트를 주고받는다. 
메시지는 JSON으로 직렬화/역직렬화된다. 처리 중 실패한 메시지는 `pickly.dlx.exchange`를 통해 DLQ(Dead Letter Queue)로 전달된다.

```java
public static final String EVENTS_EXCHANGE = "pickly.events.exchange";
public static final String DLX_EXCHANGE = "pickly.dlx.exchange";
```

| Queue | Routing Key | 용도 | DLQ |
| --- | --- | --- | --- |
| `notification.delivery.queue` | `notification.comment.created`<br/>`notification.like.created` | 생성된 알림을 브라우저에 SSE로 전송 | `notification.delivery.dlq` |
| `post.scheduled.publish.queue` | `post.scheduled.publish` | 예약된 게시글을 실제 게시글로 변환 및 발행 | `post.scheduled.publish.dlq` |

## 알림(Notification) 전달 흐름

댓글 작성이나 좋아요 이벤트가 발생하면 트랜잭션 커밋 이후에 RabbitMQ로 메시지를 발행하고, 워커가 SSE로 알림을 전송한다.

```text
PostCommandService.createReply()
-> DB Transaction Commit
-> NotificationRabbitPublisher.publish()
-> [RabbitMQ] notification.comment.created
-> NotificationDeliveryConsumer.handle()
-> NotificationSseService.sendEventIfConnected()
```

알림 전송 결과는 중복 전송 방지와 이력 추적을 위해 DB에 기록된다. 브라우저가 연결되어 있지 않은 경우 `STORED_ONLY`로 상태가 남는다.

```sql
CREATE TABLE notification_delivery_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL UNIQUE,
    notification_id BIGINT NOT NULL,
    recipient_user_id BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    delivery_status VARCHAR(40) NOT NULL, -- SSE_SENT, STORED_ONLY, FAILED
    failure_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## SSE (Server-Sent Events)

`NotificationSseService`는 현재 연결된 브라우저의 `SseEmitter`를 메모리에서 직접 관리한다. 
15초마다 연결 유지를 위해 heartbeat(`thump` comment)를 전송한다. 사용자가 여러 브라우저 탭을 열 수 있으므로 `userId` 아래에 여러 개의 `emitterId`를 매핑한다.

```java
// Map<UserId, Map<EmitterId, SseEmitter>>
private final Map<Long, Map<String, SseEmitter>> emitters = new ConcurrentHashMap<>();
```

## 예약 발행(Scheduled Post) 흐름

1. 스프링 `ScheduledPostPublisherScheduler`가 30초마다 폴링하며 발행 시간이 지난 게시글 ID를 수집해 RabbitMQ로 발행 요청을 보낸다. 
2. `ScheduledPostPublishConsumer`가 이 메시지를 받아 실제 게시글로 변환한다.
3. 변환이 완료되면 SSE를 통해 사용자 브라우저에 완료 알림을 보낸다.

```text
ScheduledPostPublisherScheduler.publishDueScheduledPosts()
-> DB 쿼리 (status = 'SCHEDULED' AND scheduled_at <= now)
-> [RabbitMQ] post.scheduled.publish
-> ScheduledPostPublishConsumer.handle()
-> DB 상태 변경 (status = 'PUBLISHING')
-> PostCommandService.createRootFromScheduled()
-> DB 상태 변경 (status = 'PUBLISHED')
-> ScheduledPostPublishedEventListener (SSE 전송)
```

Consumer는 동시에 여러 워커가 같은 글을 발행하는 것을 막기 위해 먼저 대상 ID의 DB 상태를 `PUBLISHING`으로 바꾼다. 이 쿼리에서 0건이 수정되었다면 다른 워커가 먼저 선점한 것으로 간주하고 발행을 포기한다.

```sql
update ScheduledPost sp
set sp.status = 'PUBLISHING',
    sp.lockedAt = :now,
    sp.updatedAt = :now
where sp.id = :id
  and sp.status = 'SCHEDULED'
```

## 주요 파일

```text
src/main/java/com/example/server/
├── application/notification/
│   └── NotificationSseService.java
└── infrastructure/messaging/
    ├── config/
    │   └── RabbitConfig.java
    ├── notification/
    │   ├── NotificationDeliveryConsumer.java
    │   ├── NotificationDeliveryEvent.java
    │   └── NotificationRabbitPublisher.java
    └── scheduledpost/
        ├── ScheduledPostPublishConsumer.java
        └── ScheduledPostPublisherScheduler.java
```

- `src/main/java/com/example/server/infrastructure/messaging/config/RabbitConfig.java`
- `src/main/java/com/example/server/infrastructure/messaging/notification/NotificationRabbitPublisher.java`
- `src/main/java/com/example/server/infrastructure/messaging/notification/NotificationDeliveryConsumer.java`
- `src/main/java/com/example/server/infrastructure/messaging/scheduledpost/ScheduledPostPublisherScheduler.java`
- `src/main/java/com/example/server/infrastructure/messaging/scheduledpost/ScheduledPostPublishConsumer.java`
- `src/main/java/com/example/server/application/notification/NotificationSseService.java`

## 참고 문서

- Spring Boot AMQP: `https://docs.spring.io/spring-boot/reference/messaging/amqp.html`
- Spring AMQP: `https://docs.spring.io/spring-amqp/reference/index.html`
- RabbitMQ Concepts: `https://www.rabbitmq.com/tutorials/amqp-concepts`
