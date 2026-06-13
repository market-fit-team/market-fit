# Architecture

community-service는 4계층(Layered) 아키텍처를 따른다.

## 계층 구조

```text
api
  -> application
    -> core
      -> infrastructure
```

- **api**: HTTP 라우팅과 DTO 변환을 담당한다.
- **application**: 트랜잭션을 제어하고, 여러 도메인(core)을 조합하거나(Facade), 조회 전용 로직(Query Service)을 처리한다.
- **core**: 도메인 엔티티 모델과 비즈니스 쓰기 로직(Command Service)을 갖는다.
- **infrastructure**: 데이터베이스(JPA), 캐시(Redis), 메시지 큐(RabbitMQ), 스토리지(S3), 보안 설정 등 외부 연동을 구현한다.

## 기본 요청 흐름

예를 들어 게시글을 생성할 때의 흐름은 아래와 같다.

```text
POST /api/v1/posts
-> PostCommandController.create()
-> CurrentUserService.getRequiredUser() (application)
-> PostCommandService.create() (core)
-> PostRepository.saveAndFlush() (infrastructure)
-> PostQueryService.findById() (application)
```

조회 요청은 `core` 계층을 거치지 않고 `application` 계층의 Query Service가 직접 View 전용 엔티티나 캐시를 읽어 반환한다.

## 알림(Notification) 흐름

댓글이나 좋아요가 발생했을 때 비동기로 처리하고 SSE로 전송한다.

```text
PostCommandService.createReply()
-> NotificationCommandService.createReplyNotification()
-> DB insert (notifications 테이블)
-> Transaction(AFTER_COMMIT) Event 발행
-> NotificationRabbitPublisher (infrastructure)
-> RabbitMQ (pickly.events.exchange -> notification.delivery.queue)
-> NotificationDeliveryConsumer.handle()
-> NotificationSseService.sendEventIfConnected()
-> Browser (SSE)
```

이벤트 발행 시점은 트랜잭션 커밋 이후(`TransactionPhase.AFTER_COMMIT`)로 설정되어 데이터 일관성을 유지한다.

## 예약 게시글(Scheduled Post) 흐름

사용자가 게시글을 예약 발행하면, Spring Scheduler가 주기적으로 DB를 확인하여 발행 이벤트를 보낸다.

```text
ScheduledPostPublisherScheduler.publishDueScheduledPosts()
-> DB 조회 (발행 시간이 지난 scheduled_posts)
-> RabbitMQ (pickly.events.exchange -> post.scheduled.publish.queue)
-> ScheduledPostPublishConsumer.handle()
-> PostCommandService.createRootFromScheduled()
-> DB insert (posts 테이블)
```

## 주요 파일

- `src/main/java/com/example/server/api/post/PostCommandController.java`
- `src/main/java/com/example/server/application/post/query/PostQueryService.java`
- `src/main/java/com/example/server/core/post/PostCommandService.java`
- `src/main/java/com/example/server/application/notification/NotificationSseService.java`
- `src/main/java/com/example/server/infrastructure/messaging/scheduledpost/ScheduledPostPublisherScheduler.java`

## 참고 문서

- Spring Boot Code Structure: `https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html`
- Spring Web MVC: `https://docs.spring.io/spring-framework/reference/web/webmvc.html`
- Spring Scheduling: `https://docs.spring.io/spring-framework/reference/integration/scheduling.html`
