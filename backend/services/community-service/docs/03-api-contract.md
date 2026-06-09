# API Contract

모든 서버 API는 `/api/v1` prefix를 사용한다.

```text
/api/v1/**
```

## 인증 모델

- 인증 방식: Google OAuth2 Login + server-side session
- 세션 저장소: Redis-backed Spring Session
- CSRF: Cookie CSRF token 방식
- 공개 API: 게시글 조회 계열 `GET /api/v1/posts/**`
- 인증 필요 API: 작성, 수정, 삭제, 좋아요, 미디어, 알림, 예약, LLM 등

## 공통 에러 응답

`GlobalExceptionHandler`와 `SecurityConfig`에서 JSON 에러 응답을 반환한다.

예시:

```json
{
  "status": 401,
  "message": "로그인이 필요합니다."
}
```

## Auth API

| Method | Path                  | Auth     | 설명                    |
| ------ | --------------------- | -------- | ----------------------- |
| `GET`  | `/api/v1/auth/csrf`   | public   | CSRF token cookie 발급  |

| `POST` | `/api/v1/auth/logout` | required | 세션 로그아웃           |

### CSRF 사용 방식

1. `GET /api/v1/auth/csrf` 호출
2. 응답 쿠키에서 `XSRF-TOKEN` 확인
3. `POST`, `PUT`, `PATCH`, `DELETE` 요청에 `X-XSRF-TOKEN` 헤더 포함

## Post API

| Method   | Path                               | Auth     | 설명                       |
| -------- | ---------------------------------- | -------- | -------------------------- |
| `GET`    | `/api/v1/posts`                    | public   | 게시글 목록 조회           |
| `GET`    | `/api/v1/posts/cursor`             | public   | 커서 기반 게시글 목록 조회 |
| `GET`    | `/api/v1/posts/{id}`               | public   | 게시글 상세 조회           |
| `GET`    | `/api/v1/posts/{postId}/replies`   | public   | 댓글 목록 조회             |
| `GET`    | `/api/v1/posts/{postId}/thread`    | public   | 스레드 조회                |
| `POST`   | `/api/v1/posts`                    | required | 루트 게시글 생성           |
| `POST`   | `/api/v1/posts/{parentId}/replies` | required | 댓글 생성                  |
| `PUT`    | `/api/v1/posts/{id}`               | required | 게시글 수정                |
| `DELETE` | `/api/v1/posts/{id}`               | required | 게시글 soft delete         |

### Create Post Request

```json
{
  "content": "hello",
  "mediaAttachmentIds": [1, 2]
}
```

규칙:

- `content` 또는 `mediaAttachmentIds` 중 하나는 필요하다.
- 게시글 하나에 첨부 가능한 미디어 수는 현재 최대 4개다.
- 업로드된 미디어는 작성자 본인의 `UPLOADED` 상태여야 한다.
- 일반 게시글과 예약 게시글은 모두 내부적으로 `PostDraft`를 사용해 content/media validation과 미디어 수 제한을 공유한다.

## Post Like API

| Method   | Path                           | Auth     | 설명        |
| -------- | ------------------------------ | -------- | ----------- |
| `POST`   | `/api/v1/posts/{postId}/likes` | required | 좋아요 생성 |
| `DELETE` | `/api/v1/posts/{postId}/likes` | required | 좋아요 취소 |

좋아요는 DB unique constraint `(post_id, user_id)`로 중복을 방어한다.

## Media API

| Method   | Path                 | Auth     | 설명                                |
| -------- | -------------------- | -------- | ----------------------------------- |
| `POST`   | `/api/v1/media`      | required | 이미지 업로드                       |
| `GET`    | `/api/v1/media/{id}` | required | 미디어 단건 조회                    |
| `PATCH`  | `/api/v1/media/{id}` | required | alt text 수정                       |
| `DELETE` | `/api/v1/media/{id}` | required | 아직 게시글에 붙지 않은 미디어 삭제 |

업로드는 multipart/form-data를 사용한다.

예시:

```bash
curl -X POST http://localhost:8080/api/v1/media \
  -H "X-XSRF-TOKEN: $TOKEN" \
  -b cookies.txt \
  -F "file=@./image.png" \
  -F "altText=설명 텍스트"
```

## Scheduled Post API

| Method   | Path                           | Auth     | 설명                     |
| -------- | ------------------------------ | -------- | ------------------------ |
| `GET`    | `/api/v1/scheduled-posts`      | required | 내 예약 게시글 목록 조회 |
| `POST`   | `/api/v1/scheduled-posts`      | required | 예약 게시글 생성         |
| `PUT`    | `/api/v1/scheduled-posts/{id}` | required | 예약 게시글 수정         |
| `DELETE` | `/api/v1/scheduled-posts/{id}` | required | 예약 취소                |

### Create Scheduled Post Request

```json
{
  "content": "tomorrow update",
  "parentId": null,
  "mediaAttachmentIds": [1, 2],
  "scheduledAt": "2026-05-26T09:00:00Z"
}
```

규칙:

- `scheduledAt`은 필수이며 현재 시각보다 최소 1분 이후여야 한다.
- `parentId`가 있으면 예약 답글, 없으면 루트 게시글 예약이다.
- `content` 또는 `mediaAttachmentIds` 중 하나는 필요하다.
- 예약 생성 시 `PostDraft`로 일반 게시글 생성과 동일한 content/media validation을 적용한다.
- 실제 발행 시에도 `ScheduledPost.toPostDraft()`를 통해 `PostCommandService`의 일반 생성 helper를 재사용한다.

예약 게시글은 RabbitMQ queue를 통해 실제 발행된다.

## Notification API

| Method   | Path                                          | Auth     | 설명                   |
| -------- | --------------------------------------------- | -------- | ---------------------- |
| `GET`    | `/api/v1/notifications`                       | required | 알림 목록 조회         |
| `GET`    | `/api/v1/notifications/unread-count`          | required | 읽지 않은 알림 수 조회 |
| `PATCH`  | `/api/v1/notifications/{notificationId}/read` | required | 알림 읽음 처리         |
| `PATCH`  | `/api/v1/notifications/read-all`              | required | 모든 알림 읽음 처리    |
| `DELETE` | `/api/v1/notifications/{notificationId}`      | required | 알림 삭제              |
| `GET`    | `/api/v1/notifications/stream`                | required | SSE 알림 스트림        |

SSE endpoint는 `text/event-stream`을 반환한다.

## Semantic API

| Method | Path                             | Auth                                    | 설명             |
| ------ | -------------------------------- | --------------------------------------- | ---------------- |
| `GET`  | `/api/v1/posts/{postId}/related` | public or required by controller policy | 관련 게시글 조회 |

관련 게시글은 semantic upstream 호출 결과와 Redis cache를 사용한다.

## LLM API

모든 LLM API는 인증이 필요하다. Thread/run 계열은 Spring 서버가 LangGraph Agent Server API shape를 `JsonNode`로 받아 upstream에 그대로 전달한다. 단, thread 소유권은 `llm_threads` 테이블로 서버가 별도 검증한다.

| Method | Path                                                        | Auth     | 설명                         |
| ------ | ----------------------------------------------------------- | -------- | ---------------------------- |
| `GET`  | `/api/v1/llm/tools`                                         | required | LLM tool 목록 조회           |
| `GET`  | `/api/v1/llm/models`                                        | required | LLM model 목록 조회          |
| `POST` | `/api/v1/llm/threads`                                       | required | LangGraph thread 생성        |
| `GET`  | `/api/v1/llm/threads/{threadId}`                            | required | LangGraph thread 조회        |
| `POST` | `/api/v1/llm/threads/search`                                | required | 내 LangGraph thread 목록 조회 |
| `GET`  | `/api/v1/llm/threads/{threadId}/state`                      | required | LangGraph thread state 조회  |
| `POST` | `/api/v1/llm/threads/{threadId}/history`                    | required | LangGraph thread history 조회 |
| `POST` | `/api/v1/llm/threads/{threadId}/runs/stream`                | required | LangGraph run 생성 + SSE stream |
| `POST` | `/api/v1/llm/threads/{threadId}/runs/{runId}/cancel`        | required | LangGraph run 취소           |
| `GET`  | `/api/v1/llm/threads/{threadId}/runs/{runId}/stream`        | required | LangGraph run stream 재연결  |

`POST /api/v1/llm/threads`는 body가 없으면 빈 객체로 처리한다. 서버는 `metadata.ownerUserId`를 현재 사용자 ID로 주입한 뒤 upstream `/api/v1/langgraph/threads`에 전달하고, 응답의 `thread_id`를 `llm_threads.upstream_thread_id`로 저장한다.

```json
{
  "metadata": {
    "title": "새 대화"
  }
}
```

`GET /threads/{threadId}`, state/history 조회, run stream, cancel, join stream은 모두 먼저 thread owner를 검증한다. 다른 사용자의 thread는 upstream 호출 전에 차단된다.

`POST /api/v1/llm/threads/{threadId}/runs/stream`과 `GET /api/v1/llm/threads/{threadId}/runs/{runId}/stream`은 `text/event-stream`을 반환한다. 서버는 upstream SSE body를 relay하고, upstream의 `Location`/`Content-Location` header가 있으면 client에 전달한다. `Last-Event-ID` header는 join stream 요청에만 사용하며, 값이 있으면 upstream에도 전달한다.

기존 `POST /api/v1/llm/stream-sessions`, `POST /api/v1/llm/threads/{threadId}/resume`, `GET /api/v1/llm/stream-sessions/{sessionId}/events` 계약은 제거되었다. HITL resume payload는 서버 custom DTO가 아니라 LangGraph run API compatible JSON으로 `runs/stream`에 전달한다.

## API 추가 체크리스트

새 API를 추가할 때는 다음을 확인한다.

- [ ] `/api/v1` prefix를 사용했는가?
- [ ] Controller는 `api/<domain>` 아래에 있는가?
- [ ] HTTP DTO는 `api/<domain>/dto` 아래에 있는가?
- [ ] Controller가 repository를 직접 호출하지 않는가?
- [ ] 인증/인가 정책이 `SecurityConfig` 또는 method 내부에서 명확한가?
- [ ] unsafe method는 CSRF 테스트가 있는가?
- [ ] 에러 응답이 JSON 형태로 일관적인가?
- [ ] MockMvc 테스트가 추가되었는가?
