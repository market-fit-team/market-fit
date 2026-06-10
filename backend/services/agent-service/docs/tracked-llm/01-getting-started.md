# 01. Getting Started

`llm`은 Python 3.14, FastAPI, LangGraph, Qdrant, Gemini SDK, 내부 chat provider adapter를 사용하는 LLM/RAG 서비스다.

## 기본 요구 사항

- Python: `.python-version` 기준 `3.14`
- 패키지 관리: `uv`
- Vector store: Qdrant
- Chat model providers: Ollama Cloud, Gemini, OpenRouter, OpenCode Zen
- Embedding provider: Gemini API

## 설치

`llm` 디렉터리에서 실행한다.

```bash
cd llm
uv sync
```

환경 변수 파일을 만든다.

```bash
cp .env.example .env
```

## 주요 환경 변수

| 변수                          | 설명                                               |
| ----------------------------- | -------------------------------------------------- |
| `API_KEY`                     | FastAPI 보호 endpoint에서 요구하는 `X-API-Key` 값  |
| `OLLAMA_API_KEY`              | Ollama Cloud API key                               |
| `OLLAMA_BASE_URL`             | Ollama Cloud endpoint                              |
| `OPENROUTER_API_KEY`          | OpenRouter API key                                 |
| `OPENROUTER_BASE_URL`         | OpenRouter OpenAI-compatible endpoint              |
| `OPENCODE_ZEN_API_KEY`        | OpenCode Zen API key                               |
| `OPENCODE_ZEN_BASE_URL`       | OpenCode Zen OpenAI-compatible endpoint            |
| `GEMINI_API_KEY`              | Gemini chat/embedding API key                      |
| `EMBEDDING_MODEL`             | 게시글/검색어 embedding model                      |
| `EMBEDDING_DIMENSION`         | Qdrant vector dimension                            |
| `QDRANT_URL`                  | Qdrant endpoint                                    |
| `QDRANT_COLLECTION`           | 실제 collection 이름                               |
| `QDRANT_COLLECTION_ALIAS`     | 서비스 코드가 바라볼 alias 이름                    |
| `QDRANT_DISTANCE`             | Qdrant distance metric                             |
| `MEDIA_FETCH_TIMEOUT_SECONDS` | signed URL 이미지 fetch timeout                    |
| `CORS_ORIGINS`                | 허용할 browser origin 목록                         |

`API_KEY`는 Java server의 LLM gateway key와 같은 값으로 맞춘다.

## 실행

```bash
uv run fastapi dev src/main.py
```

앱 시작 시 lifespan에서 다음을 시도한다.

```text
ensure_qdrant_collection_and_alias()
  -> QDRANT_COLLECTION 존재 확인/생성
  -> registered RAG source payload index 생성
  -> QDRANT_COLLECTION_ALIAS 생성/전환
```

Qdrant가 떠 있지 않아도 앱 process 자체는 시작될 수 있지만, RAG API는 정상 동작하지 않는다. 로그에 Qdrant 초기화 실패가 남으면 `QDRANT_URL`, collection, alias, 네트워크를 먼저 확인한다.

## 검증

```bash
uv run pytest
uv run pyrefly check
```

테스트는 외부 Gemini, Qdrant, Ollama 호출에 직접 의존하지 않도록 fake client/store와 monkeypatch를 사용한다.

## Health check

`/api/v1/health`는 API key 없이 확인할 수 있다.

```bash
curl http://localhost:8000/api/v1/health
```

보호 API는 `X-API-Key`가 필요하다.

```bash
curl \
  -H "X-API-Key: $API_KEY" \
  http://localhost:8000/api/v1/langgraph/tools
```

## LangGraph stream run 최소 흐름

Chat 실행 경계는 더 이상 `/api/v1/chat/stream-sessions` one-shot session을 만들지 않는다. FastAPI가 `/api/v1/langgraph/**` 아래에서 LangGraph Agent Server API와 호환되는 thread/run endpoint를 직접 제공한다.

먼저 thread를 만든다. client가 `thread_id`를 직접 정하지 않으면 서버가 UUID를 생성한다.

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"metadata":{"source":"local-smoke"}}' \
  http://localhost:8000/api/v1/langgraph/threads
```

응답 예시:

```json
{
  "thread_id": "...",
  "created_at": "2026-05-28T00:00:00Z",
  "updated_at": "2026-05-28T00:00:00Z",
  "metadata": {"source": "local-smoke"},
  "status": "idle",
  "config": null,
  "values": null
}
```

생성한 `thread_id`로 run stream을 시작한다. `input.messages`는 LangChain message dict로 변환되고, `context`의 `model`, `reasoning_effort`, `allowed_tools`, `interrupt_on`은 graph state로 복사된다.

```bash
THREAD_ID="<thread_id>"

curl -N \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "assistant_id": "chat",
    "input": {
      "messages": [{"type":"human","content":"안녕"}]
    },
    "context": {
      "model": "gpt-oss:120b",
      "reasoning_effort": "medium"
    },
    "stream_mode": ["values", "messages", "tools", "updates"],
    "stream_resumable": true
  }' \
  "http://localhost:8000/api/v1/langgraph/threads/$THREAD_ID/runs/stream"
```

stream 응답에는 `Content-Location`과 `Location` header가 포함된다.

```text
Content-Location: /api/v1/langgraph/threads/<thread_id>/runs/<run_id>
Location: /api/v1/langgraph/threads/<thread_id>/runs/<run_id>
```

`stream_resumable=true` 또는 subscriber가 아직 없는 이벤트는 run registry에 저장된다. 재접속은 `Last-Event-ID`로 이전 이벤트 이후부터 replay한다.

```bash
curl -N \
  -H "X-API-Key: $API_KEY" \
  -H "Last-Event-ID: 2" \
  "http://localhost:8000/api/v1/langgraph/threads/$THREAD_ID/runs/<run_id>/stream"
```

HITL interrupt 이후 재개는 새 사용자 메시지가 아니라 `command.resume` run이다.

```bash
curl -N \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "command": {
      "resume": {
        "decisions": [{"type":"approve"}]
      }
    },
    "stream_mode": ["values", "messages", "tools", "updates"]
  }' \
  "http://localhost:8000/api/v1/langgraph/threads/$THREAD_ID/runs/stream"
```

Tool/model metadata도 `/langgraph` 아래에서 제공한다.

```bash
curl -H "X-API-Key: $API_KEY" http://localhost:8000/api/v1/langgraph/tools
curl -H "X-API-Key: $API_KEY" http://localhost:8000/api/v1/langgraph/models
```

## RAG posts 최소 흐름

게시글 색인은 Java server가 검증한 게시글/첨부 정보를 넘긴다는 전제다.

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "postId": 1,
    "authorId": 2,
    "content": "본문",
    "visibility": "PUBLIC",
    "status": "ACTIVE",
    "createdAt": "2026-05-22T12:30:00+09:00",
    "mediaAttachments": []
  }' \
  http://localhost:8000/api/v1/rag/posts/index
```

검색 응답은 Java server가 다시 DB에서 조회할 `postId`와 ranking score만 반환한다.

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"query":"강아지", "limit":5, "visibility":"PUBLIC", "status":"ACTIVE"}' \
  http://localhost:8000/api/v1/rag/posts/search
```

## 운영 스크립트

Qdrant alias 전환:

```bash
uv run python scripts/qdrant_alias_switch.py <target_collection>
```

JSONL 재색인 스크립트는 source별 ingestion 경로를 따라야 한다. 현재 post 색인은 `src.services.rag.posts.ingestion.index_post`가 기준이다.
