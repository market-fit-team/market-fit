# LLM Docs

이 문서는 `llm` 애플리케이션을 **FastAPI + LangGraph + Qdrant 기반 LLM/RAG 서비스**로 이해하고 확장할 수 있도록 정리한 문서 모음이다.

현재 `llm`은 내부 모델 카드 기반 chat provider 호출, FastAPI 안에서 직접 구현한 LangGraph 호환 API, LangGraph 기반 agent/tool/HITL 루프, SDK 호환 SSE 스트리밍, Gemini Embedding 2 기반 text/image embedding, Qdrant 기반 RAG 저장소, Java server와의 API-key gateway 연동을 담당한다.

## 문서 목록

| 문서                                                                       | 설명                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [01-getting-started.md](./01-getting-started.md)                           | 로컬 실행, 환경 변수, LangGraph stream run, Qdrant 준비, 테스트 시작 가이드 |
| [02-folder-structure.md](./02-folder-structure.md)                         | 현재 폴더 구조와 계층별 책임                                                |
| [03-api-contract.md](./03-api-contract.md)                                 | `/api/v1` HTTP API, LangGraph 호환 endpoint, SSE 이벤트, 에러 매핑 규칙     |
| [04-chat-stream-agent-tools-hitl.md](./04-chat-stream-agent-tools-hitl.md) | LangGraph thread/run stream, agent tool registry, HITL 승인 흐름            |
| [05-rag-qdrant-sources.md](./05-rag-qdrant-sources.md)                     | Gemini embedding, Qdrant collection/alias, RAG source 확장 구조             |
| [06-security-config.md](./06-security-config.md)                           | API key, CORS, secret/env, signed URL media fetch 보안 경계                 |
| [07-testing.md](./07-testing.md)                                           | pytest/pyrefly 전략, fake client/store, LangGraph/tool/RAG 테스트 포인트    |
| [08-development-guide.md](./08-development-guide.md)                       | 새 tool/source/API 추가 절차와 리뷰 체크리스트                              |
| [09-agent-evals.md](./09-agent-evals.md)                                   | LangGraph SSE 스트리밍 응답 검증을 위한 Eval Harness 구조와 시나리오 작성법 |
| [10-stream-events-v2-schema.md](./10-stream-events-v2-schema.md)           | LangGraph SDK 호환 SSE stream schema                                        |
| [11-model-family-fallback-opencode-zen.md](./11-model-family-fallback-opencode-zen.md) | 모델 패밀리 fallback과 OpenCode Zen reasoning adapter 구조        |
| [references.md](./references.md)                                           | 참고할 내부 경로와 외부 공식 문서 키워드                                    |

## 큰 그림

```text
Client / Java server / LangGraph SDK client
  |
  | X-API-Key
  v
FastAPI (/api/v1/**)
  |
  +--> LangGraph-compatible Chat API
  |      |
  |      +--> /langgraph/threads
  |      +--> /langgraph/threads/{thread_id}/runs/stream
  |      +--> in-memory thread_store / run_registry
  |      +--> LangGraph checkpoint thread_id
  |      +--> model cards / provider routes
  |      +--> ToolSpec registry
  |      +--> HITL approval gate
  |      +--> SDK-compatible SSE events
  |
  +--> RAG Posts
         |
         +--> Pydantic API schema
         +--> Gemini text/image embedding
         +--> source definition
         +--> Qdrant named vector
         +--> Qdrant collection alias
```

## 이 서비스가 제공하는 것

- `/api/v1` prefix 기반 LLM/RAG gateway API
- `/api/v1/langgraph/**` 기반 LangGraph Agent Server API 호환 경계
- `thread_id` 기반 대화 상태 유지와 LangGraph checkpoint 연동
- `POST /langgraph/threads/{thread_id}/runs/stream` 기반 SSE run stream
- `GET /langgraph/threads/{thread_id}/runs/{run_id}/stream` 기반 resumable stream 재접속
- `command.resume` 기반 HITL resume
- `GET /langgraph/tools` 기반 tool policy UI metadata
- `GET /langgraph/models` 기반 public model catalog
- ToolSpec 단일 출처 기반 agent tool 등록 구조
- Gemini Embedding 2 text/image multimodal vector 생성
- Qdrant named vector `embedding` 저장 구조
- Qdrant alias `pickle_rag_embeddings_current` 기반 collection 교체 구조
- post source 기반 index/delete/status/search/related RAG API
- source definition registry 기반 payload index 생성

## 설계 원칙

1. **HTTP 경계는 `api`와 `schemas`에 둔다.** Endpoint는 status mapping, API-key 보호, LangGraph 호환 request/response 연결만 담당한다.
2. **Chat 실행은 LangGraph graph와 protocol adapter에 둔다.** Tool/HITL은 `services/chat` 안의 명시적 node와 registry를 통해 흐른다.
3. **FastAPI가 LangGraph 호환 API를 직접 구현한다.** LiteLLM 같은 외부 프록시 계약에 맞추지 않고, 내부 graph 실행 결과를 `langgraph_protocol`에서 SDK 호환 형태로 변환한다.
4. **Run과 thread는 다른 개념이다.** `thread_id`는 대화 checkpoint key이고, `run_id`는 특정 실행과 SSE replay 범위를 나타낸다.
5. **Tool 등록은 `ToolSpec`이 단일 출처다.** tool metadata, 기본 허용 여부, 승인 decision은 `ToolSpec`에서 관리한다.
6. **RAG repository는 source-agnostic이다.** `post`, `document` 같은 의미는 source definition과 source별 service가 가진다.
7. **Qdrant filter field는 source definition에서 관리한다.** payload index를 setup 파일에 흩뿌리지 않는다.
8. **Embedding model/dimension 변경은 새 collection + alias switch로 처리한다.** 서로 다른 차원의 vector를 같은 collection에 섞지 않는다.
9. **Java server/DB가 권한과 본문의 source of truth다.** LLM 서버는 검색 후보 id/score와 stream 결과를 제공한다.

## 빠른 시작

```bash
cd llm
cp .env.example .env
uv sync
uv run pytest
uv run fastapi dev src/main.py
```

자세한 실행 방법은 [01-getting-started.md](./01-getting-started.md)를 참고한다.
