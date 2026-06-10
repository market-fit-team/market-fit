# References

이 문서는 `llm` 작업 중 자주 확인할 내부 경로와 외부 공식 문서 키워드를 모은다.

## 내부 핵심 경로

### App/API

```text
src/main.py
src/api/router.py
src/api/deps.py
src/api/endpoints/v1/langgraph.py
src/api/endpoints/v1/rag_posts.py
src/api/endpoints/v1/health.py
src/schemas/langgraph.py
src/schemas/chat.py
src/schemas/rag.py
```

### Chat / LangGraph / HITL

```text
src/services/chat/graph.py
src/services/chat/state.py
src/services/chat/nodes.py
src/services/chat/routing.py
src/services/chat/approvals/schemas.py
src/services/chat/approvals/policy.py
src/services/chat/approvals/nodes.py
src/services/chat/approvals/messages.py
```

### LangGraph protocol adapter

```text
src/services/chat/langgraph_protocol/__init__.py
src/services/chat/langgraph_protocol/config.py
src/services/chat/langgraph_protocol/input_builder.py
src/services/chat/langgraph_protocol/json.py
src/services/chat/langgraph_protocol/run_registry.py
src/services/chat/langgraph_protocol/sdk_stream_adapter.py
src/services/chat/langgraph_protocol/state_serializer.py
src/services/chat/langgraph_protocol/stream_serializer.py
src/services/chat/langgraph_protocol/thread_store.py
```

### Tools

```text
src/services/chat/tools/tool_spec.py
src/services/chat/tools/tool_errors.py
src/services/chat/tools/calculator_tool/calculator_tool.py
src/services/chat/toolkits/chat_toolkit.py
tests/services/chat/test_tools_registry.py
tests/services/chat/approvals/test_decision_order.py
tests/services/chat/approvals/test_policy.py
tests/services/chat/approvals/test_nodes.py
```

### RAG / Qdrant

```text
src/services/rag/embeddings.py
src/services/rag/models.py
src/services/rag/vectorstore.py
src/services/rag/posts/ingestion.py
src/services/rag/posts/retrieval.py
src/services/rag/sources/base.py
src/services/rag/sources/registry.py
src/services/rag/sources/post/source.py
src/repositories/qdrant.py
src/repositories/qdrant_setup.py
src/clients/gemini.py
src/clients/http.py
src/clients/qdrant.py
```

### Tests

```text
tests/api/v1/test_langgraph.py
tests/api/v1/test_rag_posts.py
tests/repositories/test_qdrant.py
tests/services/chat/langgraph_protocol/test_json.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter_tools.py
tests/services/rag/test_sources.py
tests/services/rag/test_ingestion.py
tests/services/rag/test_retrieval.py
```

## 외부 공식 문서 키워드

웹에서 최신 내용을 확인할 때는 다음 공식 문서 키워드를 우선 사용한다.

- FastAPI dependencies
- FastAPI StreamingResponse
- Starlette CORSMiddleware
- LangGraph StateGraph
- LangGraph astream stream_mode values messages tools updates
- LangGraph streaming output format v2
- LangGraph interrupt Command resume
- LangGraph Agent Server API threads runs stream
- LangGraph SDK useStream human in the loop
- LangChain tool calling
- langchain-ollama ChatOllama
- langchain-openai ChatOpenAI
- DeepSeek thinking mode reasoning_content
- OpenCode Zen OpenAI-compatible chat completions
- OpenRouter OpenAI-compatible chat completions
- Google Gen AI SDK embed_content
- Gemini Embedding output_dimensionality
- Qdrant named vectors
- Qdrant payload index
- Qdrant aliases
- qdrant-client AsyncQdrantClient
- pytest-asyncio
- httpx ASGITransport
- pyrefly configuration

## 내부 프로젝트 연결점

Client LLM chat UI:

```text
client/src/features/llm-chat/**
client/docs/llm-chat.md
```

Server LLM/RAG gateway:

```text
server/docs/11-semantic-and-llm.md
```

LangGraph run stream, HITL decision, tool metadata 계약을 바꾸면 client/server 문서와 구현을 함께 확인한다.

## 외부 레퍼런스 링크 (External Reference Links)

### LangGraph / LangChain

- [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LangChain human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [LangGraph SDK repository](https://github.com/langchain-ai/langgraphjs)
- [LangChain Core BaseTool](https://github.com/langchain-ai/langchain/blob/master/libs/core/langchain_core/tools/base.py)
- [LangChain Qdrant Integration](https://docs.langchain.com/oss/python/integrations/vectorstores/qdrant/)
- [LangChain Qdrant Code](https://github.com/langchain-ai/langchain/blob/master/libs/partners/qdrant/langchain_qdrant/qdrant.py)

### CrewAI

- [CrewAI Tools Repo](https://github.com/crewAIInc/crewAI/tree/main/lib/crewai-tools/src/crewai_tools)
- [CrewAI Tools Implementation](https://github.com/crewAIInc/crewAI/tree/main/lib/crewai-tools/src/crewai_tools/tools)
- [CrewAI Tool Specs](https://raw.githubusercontent.com/crewAIInc/crewAI/main/lib/crewai-tools/tool.specs.json)
- [CrewAI BaseTool](https://github.com/crewAIInc/crewAI/blob/main/lib/crewai/src/crewai/tools/base_tool.py)

### OpenSWE

- [OpenSWE Repo](https://github.com/langchain-ai/open-swe)
- [OpenSWE Tools](https://github.com/langchain-ai/open-swe/tree/main/agent/tools)
- [OpenSWE Server Code](https://raw.githubusercontent.com/langchain-ai/open-swe/main/agent/server.py)
- [OpenSWE Customization Guide](https://raw.githubusercontent.com/langchain-ai/open-swe/main/CUSTOMIZATION.md)

### Qdrant & Payload Partitioning

- [Qdrant Multitenancy Guide](https://qdrant.tech/documentation/guides/multitenancy/)
- [Qdrant Multitenancy Article](https://qdrant.tech/articles/multitenancy/)
- [Qdrant Indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Models schema](https://github.com/qdrant/qdrant-client/blob/master/qdrant_client/http/models/models.py)
- [Qdrant MCP Server](https://github.com/qdrant/mcp-server-qdrant)
- [Context7 Qdrant MCP](https://context7.com/qdrant/mcp-server-qdrant)

### LlamaIndex & Haystack

- [LlamaIndex Qdrant Multitenancy](https://qdrant.tech/documentation/examples/llama-index-multitenancy/)
- [LlamaIndex Qdrant API](https://docs.llamaindex.ai/en/stable/api_reference/storage/vector_store/qdrant/)
- [LlamaIndex Vector Store Types](https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/vector_stores/types.py)
- [Haystack Qdrant Document Store](https://docs.haystack.deepset.ai/docs/qdrant-document-store)
- [Haystack Metadata Filtering](https://docs.haystack.deepset.ai/docs/metadata-filtering)
