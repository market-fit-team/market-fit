# 06. Security and Config

`llm`은 Java server 뒤의 LLM/RAG gateway 성격이다. 보안 경계는 단순하지만 명확해야 한다.

## API key 경계

보호 endpoint는 `X-API-Key`를 요구한다.

```text
X-API-Key: <API_KEY>
```

`API_KEY`는 `src/core/config.py`에서 읽고, `src/core/security.py`의 `require_api_key`가 검증한다.

공개 endpoint:

```text
GET /api/v1/health
```

보호 endpoint:

```text
/api/v1/langgraph/**
/api/v1/rag/**
```

새 endpoint를 만들 때 health 같은 공개 endpoint가 아니라면 router 또는 endpoint에 `Depends(require_api_key)`를 적용한다.

## Java gateway 전제

Java server는 사용자 인증, DB 권한, 게시글 visibility, signed URL 발급의 source of truth다.

`llm`은 다음을 신뢰 경계로 본다.

- Java server가 넘긴 post indexing payload
- Java server가 검증해서 만든 signed URL
- Java server가 사용할 shared API key
- gateway/client가 넘긴 LangGraph run `context`와 thread metadata 중 인증/권한 검증이 이미 끝난 값

하지만 `llm`이 해야 하는 검증도 있다.

- API key 확인
- Pydantic schema validation
- media content type 제한
- Qdrant/Gemini 실패를 안전한 error로 매핑
- client가 보낸 tool policy shape 검증
- LangGraph run/thread id가 URL path와 record에 맞는지 확인

## CORS

CORS origin은 `CORS_ORIGINS`에서 comma-separated string으로 받는다.

```text
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`settings.cors_origins_list`가 공백을 제거하고 list로 변환한다.

개발 편의를 위해 `allow_methods=["*"]`, `allow_headers=["*"]`를 쓰지만, 운영에서는 gateway 배치와 origin 정책을 같이 검토한다.

## Secret / env 관리

`.env.example`은 예시 값만 담는다. 실제 secret은 commit하지 않는다.

민감한 값:

```text
API_KEY
OLLAMA_API_KEY
OPENROUTER_API_KEY
OPENCODE_ZEN_API_KEY
GEMINI_API_KEY
```

외부 endpoint:

```text
OLLAMA_BASE_URL
OPENROUTER_BASE_URL
OPENCODE_ZEN_BASE_URL
QDRANT_URL
```

운영 변경 시 특히 주의할 값:

```text
EMBEDDING_MODEL
EMBEDDING_DIMENSION
QDRANT_COLLECTION
QDRANT_COLLECTION_ALIAS
QDRANT_DISTANCE
```

`EMBEDDING_DIMENSION`이 바뀌면 기존 collection에 그대로 쓰면 안 된다. 새 collection + 재색인 + alias switch를 사용한다.

## Chat model 인증

`services/chat/models.py`와 provider factory는 provider별 API key가 있을 때만 인증 header/client 설정을 붙인다.

예시:

```text
Authorization: Bearer <OLLAMA_API_KEY>
Authorization: Bearer <OPENROUTER_API_KEY>
Authorization: Bearer <OPENCODE_ZEN_API_KEY>
```

값이 없으면 해당 provider route는 호출 시 실패하거나 fallback 대상이 된다. local Ollama와 hosted gateway를 같은 모델 카드 구조로 지원하기 위한 경계다.

## Gemini embedding 인증

`clients/gemini.py`는 `GEMINI_API_KEY`가 없으면 embedding 요청 전에 `EmbeddingProviderError`를 발생시킨다.

API endpoint는 이를 `503`으로 매핑한다.

## Signed URL media fetch 경계

`clients/http.py`는 signed URL 이미지를 embedding input으로 가져오기 위한 client다.

보안 규칙:

- Java server가 검증해 발급한 signed URL만 받는다.
- `content_type.startswith("image/")`가 아니면 거부한다.
- timeout을 둔다.
- HTTP 실패는 원본 세부 정보를 과하게 노출하지 않고 `MediaFetchError`로 감싼다.

하지 말 것:

- 사용자가 직접 입력한 임의 URL을 fetch하지 않는다.
- 내부망 접근을 허용하는 general-purpose fetcher로 확장하지 않는다.
- PDF/문서/동영상 등 비이미지 파일을 현재 post embedding 경로에 섞지 않는다.

## Agent tool 보안

Tool은 model이 호출할 수 있으므로 기본 허용 정책이 중요하다.

기본 원칙:

- 순수 계산 tool만 `default_allowed=True` 후보가 된다.
- 외부 호출, 파일 접근, RAG write, 시스템 동작, 비용 발생 tool은 기본 승인 요구가 맞다.
- `allowed_decisions`는 tool 위험도에 맞게 제한할 수 있다.
- `edit` decision을 허용하면 args_schema가 안전해야 한다.
- run `context.allowed_tools`와 `context.interrupt_on`은 해당 run의 정책이다. thread metadata에 영구 권한처럼 저장하지 않는다.

위험한 tool 예시:

```text
web fetch
file read/write
qdrant upsert/delete
system command
email/send
calendar mutation
```

이런 tool은 반드시 `default_allowed=False`로 두고 HITL 테스트를 추가한다.

## LangGraph stream 보안/안정성

SSE stream은 다음 header를 사용한다.

```text
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

현재 stream 안정성 경계는 one-shot `session_id`가 아니라 run registry다.

- `run_id`는 특정 실행과 replay buffer를 가리킨다.
- `Last-Event-ID`가 있으면 해당 id 이후 이벤트만 replay한다.
- `stream_resumable=true`이면 event를 저장해 재접속을 지원한다.
- run cancel은 현재 `interrupt`만 지원한다. `rollback`은 `422`이다.
- 알 수 없는 thread/run은 `404`다.

현재 `thread_store`, `run_registry`, LangGraph checkpoint는 모두 개발용 인메모리 구현이다. 운영 persistence로 바꾸기 전에는 서버 재시작에 따른 thread/run 손실을 전제로 둔다.

## Error 노출

Endpoint는 내부 exception을 HTTP status와 짧은 detail로 매핑한다.

- unsupported media: `422`
- unsupported run cancel action: `422`
- external dependency failure: `503`
- missing source vector: `404`
- unknown LangGraph thread/run: `404`
- model catalog fetch 실패: `502`

Stream 내부 graph 실패는 SSE `error` event로 내려간다.

```json
{
  "error": "run_failed",
  "message": "LangGraph run failed.",
  "detail": "..."
}
```

외부 provider의 raw error payload나 secret이 포함될 수 있는 정보를 그대로 반환하지 않는다.

## 보안 리뷰 체크리스트

- 새 endpoint가 보호 대상이면 `require_api_key`가 적용되어 있는가?
- LangGraph URL path의 `thread_id`/`run_id`와 record가 일치하는가?
- run `context`에 인증/권한 source of truth가 섞이지 않았는가?
- 새 tool의 `default_allowed`가 위험도에 맞는가?
- 새 tool의 args_schema가 edit decision을 안전하게 제한하는가?
- 외부 URL fetch가 임의 fetcher로 넓어지지 않았는가?
- embedding model/dimension 변경 시 collection 교체 계획이 있는가?
- Qdrant payload에 불필요한 개인정보나 본문 전체를 저장하지 않았는가?
- API 응답에 Java DB 권한 판단을 우회할 정보가 들어가지 않았는가?
