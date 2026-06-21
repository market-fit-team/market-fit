# Post DB

`backend/services/post`의 Flyway migration이다.

```text
V1__create_posts.sql
V2__seed_main_posts.sql
V3__add_post_report_provenance.sql
V4__add_crawl_and_llm_summary_records.sql
```

`V1`은 `posts` 테이블과 공개 피드, 카테고리 피드, 작성자 피드 인덱스를 만든다. 삭제는 `deleted_at`을 사용하는 soft delete다.

`V2`는 메인 캐러셀의 TREND, GUIDE, POLICY 섹션을 바로 확인할 수 있는 게시글을 한 건씩 넣는다.

`V3`는 수동 Post와 LLM 리포트를 구분하고 원본 URL, 원본 제목, 수집 시각, LLM provider를 저장한다. 기존 seed Post는 메인 AI 리포트 API에서 확인할 수 있도록 `LLM_REPORT`로 전환한다.

`V4`는 API 계약에서 사용하는 Post 발행 상태와 공개 범위를 추가하고, 크롤링 원문과 LLM 요청 결과를 별도 테이블에 기록한다. 기존 Post는 `PUBLISHED`, `PUBLIC`으로 backfill한다. 신규 Post의 기본값은 `DRAFT`, `PRIVATE`다.

## posts

사용자에게 노출되는 최종 Post를 저장한다. 수동 작성, 크롤링 기반 콘텐츠, LLM 리포트가 같은 조회 모델을 사용하며 `source_type`으로 생성 경로를 구분한다.

```text
id
user_id
title
content
summary
thumbnail_url
source_type    MANUAL | CRAWLING | LLM_REPORT
source_id
status         DRAFT | PUBLISHED | ARCHIVED
visibility     PRIVATE | PUBLIC
created_at
updated_at
deleted_at
```

`source_type` 정책:

| 값 | 의미 |
| --- | --- |
| `MANUAL` | 사용자가 직접 작성한 Post |
| `CRAWLING` | 크롤링 결과를 가공해 만든 Post |
| `LLM_REPORT` | 크롤링 또는 입력 원문을 LLM으로 요약해 만든 리포트 |

이전 migration에서 사용하던 `author_id`, `author_name`, `category`, `read_time_minutes`, `published_at`, `source_url`, `source_title`, `collected_at`, `llm_provider`는 기존 Java 모델과 데이터 호환을 위해 유지한다. V4의 `sync_posts_user_id` trigger는 기존 코드가 `author_id`만 기록해도 `user_id`를 채운다. 새 API 구현이 `user_id`를 직접 저장하도록 전환되면 이 호환 trigger는 후속 migration에서 제거할 수 있다.

메인 노출 인덱스는 아래 조건에만 적용된다.

```sql
visibility = 'PUBLIC'
AND status = 'PUBLISHED'
AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
```

## post_crawl_sources

크롤링 요청, 원문, 추출 제목과 실패 원인을 저장한다.

`post_id`는 성공 후 연결한다. 크롤링 실패도 남길 수 있도록 nullable이다. `posts.source_id`는 Post 생성에 사용된 대표 크롤링 원본을 가리킨다.

```text
REQUESTED -> CRAWLED
REQUESTED -> FAILED
```

`FAILED`이면 `error_message`를 저장한다.

## post_llm_summaries

Provider, model, prompt, 요약 결과와 token 사용량을 저장한다. `token_usage`는 provider마다 필드가 달라질 수 있어 JSONB 객체를 사용한다.

```json
{
  "inputTokens": 100,
  "outputTokens": 50,
  "totalTokens": 150
}
```

```text
REQUESTED -> SUMMARIZED
REQUESTED -> FAILED
```

`FAILED`이면 `error_message`를 저장한다. API Key, Authorization header, 전체 provider 응답은 저장하지 않는다.

`OPENAI_API_KEY`가 없거나 `CHANGE_ME`이면 Mock 결과가 `provider=MOCK`, `model=mock-v1`, `status=SUMMARIZED`로 저장된다. 유효한 키로 OpenAI 호출에 성공하면 `provider=OPENAI`, 기본 `model=gpt-4o-mini`, `status=SUMMARIZED`가 된다. OpenAI 호출 자체가 실패하면 `status=FAILED`와 안전하게 정리한 `error_message`를 남기며 Post는 생성하지 않는다.

## 원문과 요약을 분리하는 이유

`post_crawl_sources.raw_content`는 수집·추출 단계의 입력 근거이고, `post_llm_summaries.summary`는 특정 provider와 model이 생성한 결과다. 둘을 분리하면 다음이 가능하다.

- 같은 원문을 다른 model이나 prompt로 다시 요약한다.
- 크롤링 실패와 LLM 실패를 서로 다른 상태로 진단한다.
- 사용자용 `posts`를 간결하게 유지하면서 생성 이력을 추적한다.
- Post 삭제·재생성 정책과 원문/LLM 감사 데이터를 독립적으로 관리한다.
- provider, model, token 사용량을 원문 데이터와 섞지 않는다.

원문에는 개인정보나 이용약관상 저장이 금지된 내용이 포함될 수 있다. 운영 환경에서는 수집 허용 범위, 보존 기간, 접근 권한과 삭제 정책을 별도로 정해야 한다.

## 메인 노출 조건

`GET /api/posts/main`은 아래 조건을 모두 만족하는 Post만 최신순으로 조회한다.

```sql
visibility = 'PUBLIC'
AND status = 'PUBLISHED'
AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
```

`PRIVATE`, `DRAFT`, `ARCHIVED`, soft-deleted Post는 메인 위젯에 노출되지 않는다. `idx_posts_main_public_feed` partial index가 이 조회를 지원한다.

## 주요 파일

- `V1__create_posts.sql`
- `V2__seed_main_posts.sql`
- `V3__add_post_report_provenance.sql`
- `V4__add_crawl_and_llm_summary_records.sql`

## 참고 문서

- Flyway Migrations: `https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-locations-setting`
- PostgreSQL Partial Indexes: `https://www.postgresql.org/docs/current/indexes-partial.html`
