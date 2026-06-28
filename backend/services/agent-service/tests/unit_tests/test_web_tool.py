import pytest

from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.web_tool.web_tool import (
    WEB_TOOL_SPECS,
    _PeerCheckedAsyncNetworkStream,
    _PublicIPEnforcingNetworkBackend,
    _ensure_public_hostname,
    _normalize_body_content,
    _normalize_search_payload,
    _validate_requested_url,
    web_fetch,
    web_search,
)


def test_web_tool_specs_are_read_only_web_tools() -> None:
    """웹 도구 초안은 읽기 전용 web category로 정의된다."""

    spec_by_name = {spec.name: spec for spec in WEB_TOOL_SPECS}

    assert spec_by_name["web_search"].category == "web"
    assert spec_by_name["web_search"].default_allowed is True
    assert spec_by_name["web_fetch"].category == "web"
    assert spec_by_name["web_fetch"].default_allowed is True


def test_validate_requested_url_rejects_non_http_and_credentials() -> None:
    """허용하지 않는 scheme과 credentials 포함 URL은 초기에 막는다."""

    with pytest.raises(ChatToolError, match="http/https"):
        _validate_requested_url("ftp://example.com/file.txt")

    with pytest.raises(ChatToolError, match="사용자 정보"):
        _validate_requested_url("https://user:pass@example.com/secret")


@pytest.mark.anyio
async def test_public_hostname_check_blocks_private_addresses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """호스트가 사설망으로 해석되면 SSRF 보호를 위해 거부한다."""

    async def fake_resolve_ip_addresses(_: str) -> list[str]:
        return ["127.0.0.1"]

    monkeypatch.setattr(
        "agent.services.chat.tools.web_tool.web_tool._resolve_ip_addresses",
        fake_resolve_ip_addresses,
    )

    with pytest.raises(ChatToolError, match="공개 인터넷"):
        await _ensure_public_hostname("internal.example")


class _FakeAsyncNetworkStream:
    def __init__(self, server_addr: tuple[str, int]) -> None:
        self._server_addr = server_addr

    async def read(self, max_bytes: int, timeout: float | None = None) -> bytes:
        return b""

    async def write(self, buffer: bytes, timeout: float | None = None) -> None:
        return None

    async def aclose(self) -> None:
        return None

    async def start_tls(
        self,
        ssl_context: object,
        server_hostname: str | None = None,
        timeout: float | None = None,
    ) -> "_FakeAsyncNetworkStream":
        return self

    def get_extra_info(self, info: str) -> object | None:
        if info == "server_addr":
            return self._server_addr
        return None


class _FakeAsyncNetworkBackend:
    def __init__(self, stream: _FakeAsyncNetworkStream) -> None:
        self._stream = stream
        self.calls: list[tuple[str, int]] = []

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: object | None = None,
    ) -> _FakeAsyncNetworkStream:
        self.calls.append((host, port))
        return self._stream

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: object | None = None,
    ) -> _FakeAsyncNetworkStream:
        raise AssertionError("유닉스 소켓은 호출되면 안 됩니다.")

    async def sleep(self, seconds: float) -> None:
        return None


@pytest.mark.anyio
async def test_public_ip_backend_connects_to_resolved_public_ip(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """안전 backend는 검증한 공개 IP로 직접 연결한다."""

    async def fake_resolve_ip_addresses(_: str) -> list[str]:
        return ["93.184.216.34"]

    monkeypatch.setattr(
        "agent.services.chat.tools.web_tool.web_tool._resolve_ip_addresses",
        fake_resolve_ip_addresses,
    )

    fake_stream = _FakeAsyncNetworkStream(("93.184.216.34", 443))
    fake_backend = _FakeAsyncNetworkBackend(fake_stream)
    backend = _PublicIPEnforcingNetworkBackend(fake_backend)

    stream = await backend.connect_tcp("example.com", 443)

    assert isinstance(stream, _PeerCheckedAsyncNetworkStream)
    assert fake_backend.calls == [("93.184.216.34", 443)]


@pytest.mark.anyio
async def test_public_ip_backend_rejects_private_peer_after_connect(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """실제 연결된 peer IP가 사설 주소면 재바인딩 우회로 보고 막는다."""

    async def fake_resolve_ip_addresses(_: str) -> list[str]:
        return ["93.184.216.34"]

    monkeypatch.setattr(
        "agent.services.chat.tools.web_tool.web_tool._resolve_ip_addresses",
        fake_resolve_ip_addresses,
    )

    fake_stream = _FakeAsyncNetworkStream(("127.0.0.1", 443))
    fake_backend = _FakeAsyncNetworkBackend(fake_stream)
    backend = _PublicIPEnforcingNetworkBackend(fake_backend)

    with pytest.raises(ChatToolError, match="공개 인터넷"):
        await backend.connect_tcp("example.com", 443)


def test_normalize_search_payload_limits_results_and_fields() -> None:
    """검색 응답 정규화는 상위 N개만 남기고 필수 필드만 전달한다."""

    payload = {
        "query": "시장 조사",
        "number_of_results": 42,
        "results": [
            {
                "title": "첫 번째 결과",
                "url": "https://example.com/1",
                "content": "요약 1",
                "engine": "brave",
                "engines": ["brave", "bing"],
                "publishedDate": "2026-06-26",
            },
            {
                "title": "두 번째 결과",
                "url": "https://example.com/2",
                "content": "요약 2",
                "engine": "bing",
            },
        ],
    }

    normalized = _normalize_search_payload(payload, query="시장 조사", limit=1, page=2)

    assert normalized == {
        "query": "시장 조사",
        "page": 2,
        "results_count": 42,
        "results": [
            {
                "rank": 1,
                "title": "첫 번째 결과",
                "url": "https://example.com/1",
                "snippet": "요약 1",
                "engine": "brave",
                "engines": ["brave", "bing"],
                "published_date": "2026-06-26",
            }
        ],
    }


def test_normalize_body_content_strips_html_noise() -> None:
    """HTML 정규화는 script를 제거하고 읽을 수 있는 본문만 남긴다."""

    title, content = _normalize_body_content(
        content_type="text/html; charset=utf-8",
        raw_text="""
        <html>
          <head>
            <title>예시 문서</title>
            <script>console.log('x')</script>
          </head>
          <body>
            <h1>제목</h1>
            <p>첫 문단</p>
            <p>둘째 문단</p>
          </body>
        </html>
        """,
        format="text",
    )

    assert title == "예시 문서"
    assert "console.log" not in content
    assert "첫 문단" in content
    assert "둘째 문단" in content


@pytest.mark.anyio
async def test_web_search_tool_uses_normalized_inputs(monkeypatch: pytest.MonkeyPatch) -> None:
    """도구 호출은 공백 제거와 limit/page 보정을 거쳐 정규화된 결과를 돌려준다."""

    async def fake_request_search_payload(
        *, query: str, page: int, language: str
    ) -> dict[str, object]:
        assert query == "상권 분석"
        assert page == 1
        assert language == "ko-KR"
        return {
            "query": query,
            "number_of_results": 1,
            "results": [
                {
                    "title": "상권 리포트",
                    "url": "https://example.com/report",
                    "content": "요약",
                    "engine": "brave",
                }
            ],
        }

    monkeypatch.setattr(
        "agent.services.chat.tools.web_tool.web_tool._request_search_payload",
        fake_request_search_payload,
    )

    result = await web_search.ainvoke({"query": "  상권 분석  ", "limit": 50, "page": 0})

    assert result["query"] == "상권 분석"
    assert result["page"] == 1
    assert len(result["results"]) == 1


@pytest.mark.anyio
async def test_web_fetch_tool_returns_fetched_document(monkeypatch: pytest.MonkeyPatch) -> None:
    """도구 호출은 안전 fetch 결과를 그대로 사용자에게 노출한다."""

    async def fake_fetch_web_document(*, url: str, format: str) -> dict[str, object]:
        assert url == "https://example.com"
        assert format == "text"
        return {
            "requested_url": url,
            "final_url": url,
            "status_code": 200,
            "content_type": "text/plain",
            "title": None,
            "content": "예시 본문",
            "truncated": False,
        }

    monkeypatch.setattr(
        "agent.services.chat.tools.web_tool.web_tool._fetch_web_document",
        fake_fetch_web_document,
    )

    result = await web_fetch.ainvoke({"url": "https://example.com"})

    assert result["status_code"] == 200
    assert result["content"] == "예시 본문"
