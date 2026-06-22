# post-service

## 검색 결과 URL 기반 창업 상권 리포트

먼저 `POST /api/posts/crawl-preview`에
`https://search.hankyung.com/search/news?query=프랜차이즈&page=1` 같은 공개 검색 URL을 전달한다.
서비스는 같은 도메인의 기사 후보를 최대 5개 선택하고, 상세 HTML을 순차 수집한 뒤
상가·상권·창업·프랜차이즈 관련 문단만 결합한다. 결과가 적절하면 같은 요청을
`POST /api/posts/crawl-summary`에 보내 Post를 생성하고 `GET /api/posts/main`에서 확인한다.

기사 수 정책은 “최대 5개”다. 적합한 후보가 1~2개만 발견되어도 해당 기사로 분석을
계속하며 최소 3개를 강제하지 않는다.

Jsoup은 브라우저가 아니므로 로그인·유료 기사, JavaScript 전용 렌더링, 무한 스크롤은
완전히 지원하지 않는다. robots.txt와 사이트 이용약관을 확인하고 반복 요청을 제한해야 한다.

`OPENAI_API_KEY`가 비어 있거나 `CHANGE_ME`이면 Mock을 사용한다. 실제 키가 프로세스에
전달되면 OpenAI를 사용하며 로그에 `[PostLLM] ... Using OpenAI provider`가 표시된다.
Mock만 보이면 키 존재 여부, placeholder 여부, 컨테이너 환경변수 전달, 서비스 재시작,
provider 선택 로그를 차례로 확인한다. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`AUTHENTIK_*`는 인증용이며 LLM 키로 사용하지 않는다. 실제 키는 커밋하지 않는다.

`post-service`의 크롤링, LLM 요약, Post 저장 API 계약과 구현 구조다.

## 빠른 시작

이 프로젝트의 Docker Compose는 저장소 루트 `.env`를 읽는다. 실제 OpenAI 요약을 사용하려면 루트 `.env`에 아래 변수를 추가한다.

```dotenv
OPENAI_API_KEY=CHANGE_ME
```

`CHANGE_ME`를 실제 OpenAI API Key로 교체한 실행 환경에서는 OpenAI Responses API를 호출한다. 값이 없거나 공백이거나 `CHANGE_ME`이면 외부 API를 호출하지 않고 Mock LLM Provider로 자동 fallback한다. model과 timeout은 별도 설정 없이 각각 `gpt-4o-mini`, 30초를 사용한다.

실제 `OPENAI_API_KEY`는 코드, README, migration, Docker image 또는 Git에 추적되는 `.env`에 저장하거나 커밋하지 않는다. 팀 공동 `.env`가 Git에 추적된다면 실제 키 대신 placeholder만 두고, 로컬 override나 배포 secret으로 주입한다.

Docker Compose의 `post-service`는 루트 `.env`의 `OPENAI_API_KEY`를 컨테이너에 전달한다.

```yaml
services:
  post-service:
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
```

키가 없거나 비어 있거나 `CHANGE_ME`이면 Mock LLM을 사용하며 외부 OpenAI API를 호출하지 않는다.

기존 `AUTHENTIK_*`는 인증 인프라용이고 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`은 Google OAuth 로그인용이다. post LLM 기능은 이 값을 읽거나 OpenAI API Key로 재사용하지 않는다.

서비스 직접 호출 경로는 `/api/posts/...`다. 현재 frontend가 gateway를 통할 때는 앞에 `/api/post`가 붙어 `/api/post/api/posts/...`를 호출한다.

## 인증

공개 API:

```text
GET /api/posts/main
GET /api/posts/{postId}
```

Gateway 인증 헤더 필수 API:

```text
POST   /api/posts/crawl-summary
X-User-Id: authentik-sub
```

Bearer JWT 필수 API:

```text
GET    /api/posts/me/summary
POST   /api/posts
PATCH  /api/posts/{postId}
DELETE /api/posts/{postId}
```

`POST /api/posts/crawl-summary`의 `userId`는 gateway가 검증 후 전달한 `X-User-Id`에서 가져온다. 요청 body의 사용자 식별값은 사용하지 않는다. 외부에서 서비스에 직접 접근할 수 없는 네트워크 경계에서 이 헤더를 덮어써야 한다.

## PostResponse

```json
{
  "id": "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
  "userId": "authentik-sub",
  "title": "AI 채용 시장 변화 리포트",
  "content": "## 핵심 요약\n...",
  "summary": "채용 자동화와 생성형 AI 도입 흐름을 정리합니다.",
  "thumbnailUrl": null,
  "sourceType": "LLM_REPORT",
  "sourceId": "cdb33320-75fb-45ce-a30e-2cc412f810e7",
  "status": "PUBLISHED",
  "visibility": "PUBLIC",
  "createdAt": "2026-06-21T00:00:00Z",
  "updatedAt": "2026-06-21T00:00:00Z"
}
```

## POST /api/posts/crawl-summary

URL 또는 이미 수집한 원문을 실제 LLM Provider로 요약하고 Post를 생성한다.

URL을 직접 지정하는 예:

```bash
curl -X POST http://localhost:8080/api/posts/crawl-summary \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: <authenticated-user-id>' \
  -d '{
    "url": "https://example.com/article",
    "keyword": "AI 채용 트렌드",
    "rawContent": null,
    "visibility": "PUBLIC"
  }'
```

이미 수집한 원문을 사용하는 예:

```bash
curl -X POST http://localhost:8080/api/posts/crawl-summary \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: <authenticated-user-id>' \
  -d '{
    "url": null,
    "keyword": "AI 채용 트렌드",
    "rawContent": "<text-to-summarize>",
    "visibility": "PUBLIC"
  }'
```

### Request

```json
{
  "url": "https://example.com/article",
  "keyword": "AI 채용 트렌드",
  "rawContent": "선택값. 이미 수집한 원문이 있으면 사용",
  "visibility": "PUBLIC"
}
```

필드:

| 필드 | 필수 | 제약 |
| --- | --- | --- |
| `url` | 선택 | `http`, `https`, 최대 2,000자 |
| `keyword` | 선택 | 최대 500자 |
| `rawContent` | 선택 | 최대 100,000자 |
| `visibility` | 선택 | `PRIVATE`, `PUBLIC`, 기본 `PUBLIC` |

`visibility`를 생략하면 `PUBLIC`을 사용한다.

수집 대상은 아래 순서로 선택한다.

```text
rawContent
-> request.url
```

두 값이 모두 없으면 `400 Bad Request`를 반환한다.

### 처리

```text
1. `X-User-Id` 검증
2. post_crawl_sources REQUESTED 생성
3. rawContent 사용 또는 URL 크롤링
4. HTML title, meta description, body text 추출
5. post_crawl_sources CRAWLED 갱신
6. post_llm_summaries REQUESTED 생성
7. LLM Provider 호출
8. post_llm_summaries SUMMARIZED 갱신
9. posts에 LLM_REPORT / PUBLISHED 저장
10. 두 메타데이터 row의 post_id 연결
11. CrawlSummaryResponse 반환
```

생성되는 Post:

```text
source_type = LLM_REPORT
source_id = post_crawl_sources.id
status = PUBLISHED
visibility = request.visibility
```

`title`은 추출 제목과 LLM 결과를 조합해 결정한다. `summary`와 `content`는 structured output으로 받은 결과를 사용한다. `thumbnail_url`을 추출하지 못하면 null이다.

### Response

```text
201 Created
```

응답 body:

```json
{
  "id": "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
  "title": "AI 채용 트렌드 요약 리포트",
  "summary": "최근 AI 엔지니어와 백엔드 개발자 수요가 증가하고 있습니다.",
  "thumbnailUrl": null,
  "sourceType": "LLM_REPORT",
  "sourceId": "cdb33320-75fb-45ce-a30e-2cc412f810e7",
  "createdAt": "2026-06-21T10:00:00Z"
}
```

`sourceId`는 대표 `post_crawl_sources.id`다. LLM 요청은 `post_llm_summaries.post_id`로 생성된 Post를 추적한다.

### 실패 저장

크롤링 실패:

```text
post_crawl_sources.status = FAILED
post_crawl_sources.error_message = 안전하게 정리한 실패 사유
posts row 생성 안 함
post_llm_summaries row 생성 안 함
```

LLM 실패:

```text
post_crawl_sources.status = CRAWLED
post_llm_summaries.status = FAILED
post_llm_summaries.error_message = 안전하게 정리한 실패 사유
posts row 생성 안 함
```

API Key, Authorization header, 전체 provider 오류 body와 stack trace는 `error_message`에 저장하지 않는다.

오류 응답:

| 상태 | 상황 |
| --- | --- |
| `400` | URL과 원문이 모두 없거나 요청 형식이 잘못됨 |
| `400` | `X-User-Id` 헤더 누락 또는 공백 |
| `422` | HTML에서 요약 가능한 본문을 추출하지 못함 |
| `502` | 크롤링 대상 또는 LLM Provider가 비정상 응답을 반환 |
| `504` | 크롤링 또는 LLM Provider timeout |
| `500` | LLM 요약 이후 Post 저장 또는 메타데이터 연결 실패 |

LLM 오류와 DB 오류는 구분한다. OpenAI를 선택한 뒤 발생한 LLM 오류는 `post_llm_summaries.status=FAILED`를 남긴 뒤 502/504를 반환한다. API Key가 없거나 `CHANGE_ME`인 경우에는 요청 실패가 아니라 Mock Provider를 사용한다. Post DB 저장 오류는 크롤링 `CRAWLED`, LLM `SUMMARIZED` 기록을 유지하고 500을 반환한다.

## GET /api/posts/main?limit=10

메인 위젯에 노출할 최신 공개 Post를 조회한다.

조회 조건:

```sql
visibility = 'PUBLIC'
AND status = 'PUBLISHED'
AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
```

Query:

| 필드 | 기본값 | 제약 |
| --- | --- | --- |
| `limit` | `10` | 서비스에서 1~20으로 보정 |

```bash
curl 'http://localhost:8080/api/posts/main?limit=10'
```

Response:

```json
[
  {
    "id": "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
    "title": "AI 채용 시장 변화 리포트",
    "summary": "채용 자동화와 생성형 AI 도입 흐름을 정리합니다.",
    "thumbnailUrl": null,
    "sourceType": "LLM_REPORT",
    "createdAt": "2026-06-21T00:00:00Z"
  }
]
```

`sourceType`은 `MANUAL`, `CRAWLING`, `LLM_REPORT`를 모두 반환할 수 있다. 서비스는 `limit`을 1~20으로 보정하며, 생략 시 10을 사용한다.

```text
200 OK
```

## GET /api/posts/me/summary

현재 사용자의 삭제되지 않은 Post를 최신순으로 조회한다.

Query:

| 필드 | 기본값 | 제약 |
| --- | --- | --- |
| `page` | `0` | 0 이상 |
| `size` | `20` | 1~50 |

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

다른 사용자의 `PRIVATE` Post는 반환하지 않는다.

## GET /api/posts/{postId}

Post 단건을 조회한다.

- `PUBLIC`: 비로그인 조회 허용
- `PRIVATE`: 작성자만 조회 허용
- `deleted_at IS NOT NULL`: `404 Not Found`

```text
200 OK
404 Not Found
```

응답 body는 `PostResponse`다.

## POST /api/posts

수동 Post를 생성한다.

```json
{
  "title": "직접 작성한 리포트",
  "content": "본문",
  "summary": "요약",
  "category": "TREND",
  "readTimeMinutes": 3,
  "thumbnailUrl": null,
  "status": "DRAFT",
  "visibility": "PRIVATE"
}
```

생성되는 값:

```text
source_type = MANUAL
source_id = null
```

```text
201 Created
```

응답 body는 `PostResponse`다.

## PATCH /api/posts/{postId}

작성자가 Post의 편집 가능한 내용을 수정한다.

```json
{
  "title": "수정 제목",
  "summary": "수정 요약",
  "content": "수정 본문",
  "category": "GUIDE",
  "readTimeMinutes": 4,
  "thumbnailUrl": "https://cdn.example.com/post.png",
  "status": "PUBLISHED",
  "visibility": "PUBLIC"
}
```

`title`, `summary`, `content`, `category`, `readTimeMinutes`는 필수다. `status`, `visibility`를 생략하면 기존 값을 유지하고, `thumbnailUrl`을 생략하거나 `null`로 보내면 썸네일을 제거한다. `sourceType`, `sourceId`, `userId`는 수정할 수 없다.

```text
200 OK
403 Forbidden
404 Not Found
```

응답 body는 `PostResponse`다.

## DELETE /api/posts/{postId}

작성자가 Post를 soft delete한다.

```text
deleted_at = now()
204 No Content
```

이미 삭제됐거나 존재하지 않는 Post는 `404 Not Found`를 반환한다.

## DB 상태

### posts

```text
source_type  MANUAL | CRAWLING | LLM_REPORT
status       DRAFT | PUBLISHED | ARCHIVED
visibility   PRIVATE | PUBLIC
```

### post_crawl_sources

```text
REQUESTED -> CRAWLED
REQUESTED -> FAILED
```

### post_llm_summaries

```text
REQUESTED -> SUMMARIZED
REQUESTED -> FAILED
```

`post_crawl_sources.post_id`와 `post_llm_summaries.post_id`는 실패 기록을 Post 생성 전에 남길 수 있도록 nullable이다. 성공 후 생성된 Post ID로 갱신한다.

## 환경변수

```dotenv
POST_DB_URL=jdbc:postgresql://<db-host>:5432/<db-name>
POST_DB_USERNAME=<db-username>
POST_DB_PASSWORD=<db-password>

POST_CRAWL_DEFAULT_URL=https://example.com/article
POST_CRAWL_TIMEOUT_SECONDS=10

POST_LLM_PROVIDER=OPENAI
POST_LLM_MODEL=gpt-4o-mini
POST_LLM_TIMEOUT_SECONDS=30
OPENAI_API_KEY=CHANGE_ME
```

`POST_LLM_PROVIDER`, `POST_LLM_MODEL`, `POST_LLM_TIMEOUT_SECONDS`는 선택값이다. 생략하면 `OPENAI`, `gpt-4o-mini`, 30초를 사용한다. 실제 OpenAI 호출에는 `OPENAI_API_KEY`가 필요하다.

`POST_CRAWL_DEFAULT_URL`은 요청의 `url`과 `rawContent`가 모두 비어 있을 때 사용하는 선택값이다. 기본 URL도 요청 URL과 동일하게 `http` 또는 `https`만 허용하며 내부 네트워크 주소는 차단한다.

### 지정 크롤링 사이트

`src/main/resources/application.yaml`의 `app.post.crawling.seed-urls`에는 다음 한국경제 뉴스 검색 주소를 등록한다.

- 창업: `https://search.hankyung.com/search/news?query=%EC%B0%BD%EC%97%85&sort=DATE%2FDESC%2CRANK%2FDESC&period=WEEK&area=ALL&exact=&include=&except=&hk_only=`
- 프렌차이즈: `https://search.hankyung.com/search/news?query=%ED%94%84%EB%A0%8C%EC%B0%A8%EC%9D%B4%EC%A6%88`
- 상가: `https://search.hankyung.com/search/news?query=%EC%83%81%EA%B0%80`

이 목록은 지정 사이트 후보를 한곳에서 관리하기 위한 설정이다. 단일 자동 fallback 주소는 기존 `POST_CRAWL_DEFAULT_URL`을 사용하고, 요청에서 URL을 전달하면 요청 URL이 우선한다.

실제 운영 크롤링 전에는 한국경제의 robots.txt와 이용약관을 확인해야 한다. `POST_CRAWL_ARTICLE_DELAY_MILLIS`로 기사 요청 사이에 간격을 두고, 짧은 시간에 반복 또는 과도한 요청을 보내지 않는다.

실제 API Key는 코드, migration, README, Git에 추적되는 `.env` 파일에 작성하지 않는다. 컨테이너 secret, CI secret 또는 로컬에서 Git에 추적되지 않는 환경변수로 주입한다.

## 크롤링 대상 URL

요청마다 크롤링할 사이트를 `POST /api/posts/crawl-summary`의 `url`에 전달한다. `rawContent`를 전달하면 URL보다 우선하며 네트워크 요청 없이 해당 원문을 사용한다. 둘 다 전달하지 않으면 400을 반환한다.

지원 URL:

```text
http://
https://
```

loopback, link-local, 사설 IP와 내부 네트워크 주소는 차단한다. redirect 이후 최종 주소도 같은 검증을 적용한다.

크롤링 전에 대상 사이트의 `robots.txt`와 이용약관을 확인한다. robots.txt 허용 여부가 곧 법적·계약상 허용을 의미하지는 않는다. 로그인 콘텐츠, 개인정보, 재배포가 금지된 콘텐츠는 수집하지 않는다. 검색 결과 요청 한 건에서 기사 상세 페이지는 최대 5개까지만 순차 처리한다. 반복 호출을 붙일 경우 도메인별 호출 간격, 동시 요청 수, 재시도 횟수를 제한해 대상 사이트에 과도한 트래픽을 보내지 않는다.

## LLM Provider

Application 계층은 `PostLlmProvider` 인터페이스만 사용한다.

```text
PostLlmProvider
├── OpenAiLlmReportSummarizer
├── MockLlmReportSummarizer
└── <AnotherProviderPostLlmAdapter>
```

기본 provider는 `OPENAI`다. `OPENAI_API_KEY`가 유효하면 실제 OpenAI adapter를 선택하고, 누락·공백·`CHANGE_ME`이면 Mock adapter를 선택한다. `POST_LLM_PROVIDER=MOCK`을 명시하면 Mock을 강제할 수 있다.

OpenAI adapter를 선택한 뒤 timeout, 인증 또는 provider 응답 오류가 발생한 경우에는 Mock으로 재요약하지 않는다. `post_llm_summaries.status=FAILED`를 기록하고 일관된 502/504 계열 오류를 반환한다.

새 Provider를 추가하려면 `PostLlmProvider`를 구현하고 `PostLlmProviderConfig`의 선택 정책에 연결한다. Provider 교체 시 Controller, façade와 Post 저장 흐름은 바꾸지 않는다. 새 adapter는 아래 결과를 반환한다.

```text
title
summary
content
provider
model
tokenUsage
```

Provider별 원본 응답 전체를 DB에 저장하지 않는다. `post_llm_summaries`에는 provider, model, prompt, 최종 summary, token usage와 상태만 저장한다.

## notification adapter

창업 상권 리포트 전용 알림은 application port와 infrastructure adapter로 분리되어
notification-service 내부 구현에 의존하지 않는다. 기본값은
`POST_NOTIFICATION_MODE=NOOP`이며 안전한 식별 정보만 로그로 남긴다.
Rabbit 연결이 준비된 환경은 `POST_NOTIFICATION_MODE=RABBIT`과 exchange 설정을 사용한다.
adapter 발행 실패는 Post 생성 응답을 실패시키지 않는다.

알림은 `sourceType=LLM_REPORT`, `status=PUBLISHED`, LLM 상태 `SUMMARIZED`,
프랜차이즈 계열 키워드 포함, 관련 문단 1개 이상, 관련도 0.2 이상을 모두 만족할 때만
`POST_LLM_REPORT_CREATED` / `FRANCHISE` 이벤트로 발행한다.

```json
{
  "eventType": "POST_LLM_REPORT_CREATED",
  "producer": "post-service",
  "version": 1,
  "data": {
    "category": "FRANCHISE",
    "userId": "example-user",
    "postId": "00000000-0000-0000-0000-000000000000",
    "postTitle": "프랜차이즈 창업 리포트",
    "matchedKeywords": ["프랜차이즈", "가맹점"],
    "relevanceScore": 0.68,
    "actionUrl": "/posts/00000000-0000-0000-0000-000000000000"
  }
}
```

payload에는 API Key, prompt, rawContent, 기사 원문, 인증 토큰을 포함하지 않는다.

Post 저장 transaction commit 이후 아래 event를 발행한다.

```json
{
  "eventId": "uuid",
  "eventType": "post.created",
  "postId": "uuid",
  "actorId": "authentik-sub",
  "sourceType": "LLM_REPORT",
  "occurredAt": "2026-06-21T00:00:00Z"
}
```

실시간 알림 서비스는 `post.created`, `post.updated`, `post.deleted` routing key를 선택적으로 구독한다.

## migration

Flyway migration은 서비스 내부의 Spring Boot 기본 classpath 위치를 사용한다.

```yaml
spring:
  flyway:
    locations: classpath:db/migration
    validate-on-migrate: true
```

Migration 파일은 `src/main/resources/db/migration`에 둔다.

## 주요 파일

- `src/main/java/com/marketfit/post/api/post/PostController.java`
- `src/main/java/com/marketfit/post/api/report/LlmReportController.java`
- `src/main/java/com/marketfit/post/application/report/LlmReportApplicationService.java`
- `src/main/java/com/marketfit/post/core/crawling/ContentCrawler.java`
- `src/main/java/com/marketfit/post/core/llm/PostLlmProvider.java`
- `src/main/java/com/marketfit/post/infrastructure/config/PostLlmProviderConfig.java`
- `src/main/java/com/marketfit/post/core/post/PostCommandService.java`
- `src/main/java/com/marketfit/post/infrastructure/crawling/JdkHttpContentCrawler.java`
- `src/main/java/com/marketfit/post/infrastructure/llm/OpenAiLlmReportSummarizer.java`
- `src/main/java/com/marketfit/post/infrastructure/persistence/PostRepository.java`

## 참고 문서

- Spring Data JPA: `https://docs.spring.io/spring-data/jpa/reference/`
- Flyway migrations: `https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-locations-setting`
- PostgreSQL partial indexes: `https://www.postgresql.org/docs/current/indexes-partial.html`
- OpenAI Responses API: `https://developers.openai.com/api/reference/resources/responses/methods/create`
