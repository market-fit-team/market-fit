from __future__ import annotations

import asyncio
import json
import re
import socket
from html.parser import HTMLParser
from ipaddress import ip_address
from typing import Any, Literal
from urllib.parse import urljoin, urlparse

import httpx
from langchain_core.tools import tool

from agent.core.config import settings
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.tool_spec import ToolSpec

DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]

_SEARCH_CATEGORY = "general"
_DEFAULT_SEARCH_LANGUAGE = "ko-KR"
_MAX_SEARCH_RESULTS = 10
_MAX_FETCH_BYTES = 1_000_000
_MAX_FETCH_CHARS = 20_000
_MAX_REDIRECTS = 5
_REDIRECT_STATUS_CODES = {301, 302, 303, 307, 308}
_HTML_CONTENT_TYPES = {"text/html", "application/xhtml+xml"}
_JSON_CONTENT_TYPES = {"application/json", "application/ld+json"}
_TEXT_CONTENT_TYPES = {"text/plain", "text/markdown", "application/xml", "text/xml"}
_BROWSERISH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}
_BLOCK_TAGS = {
    "article",
    "blockquote",
    "br",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "main",
    "ol",
    "p",
    "pre",
    "section",
    "table",
    "td",
    "th",
    "tr",
    "ul",
}
_SKIP_TAGS = {
    "aside",
    "canvas",
    "footer",
    "header",
    "iframe",
    "nav",
    "noscript",
    "object",
    "script",
    "style",
    "svg",
    "template",
}


class _HtmlTextExtractor(HTMLParser):
    """HTML 문서에서 제목과 읽을 수 있는 본문 텍스트를 추출합니다."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._fragments: list[str] = []
        self._title_fragments: list[str] = []
        self._skip_depth = 0
        self._capture_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth > 0:
            return
        if tag == "title":
            self._capture_title = True
            return
        if tag == "li":
            self._fragments.append("\n- ")
            return
        if tag in _BLOCK_TAGS:
            self._fragments.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if self._skip_depth > 0:
            return
        if tag == "title":
            self._capture_title = False
            return
        if tag in _BLOCK_TAGS:
            self._fragments.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        if self._capture_title:
            self._title_fragments.append(data)
        self._fragments.append(data)

    @property
    def title(self) -> str | None:
        normalized = _clean_inline_text("".join(self._title_fragments))
        return normalized or None

    @property
    def text(self) -> str:
        return _clean_block_text("".join(self._fragments))


def _clean_inline_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _clean_block_text(value: str) -> str:
    normalized = value.replace("\xa0", " ")
    normalized = re.sub(r"[ \t\r\f\v]+", " ", normalized)
    normalized = re.sub(r" *\n *", "\n", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _truncate_text(value: str, *, max_chars: int = _MAX_FETCH_CHARS) -> tuple[str, bool]:
    if len(value) <= max_chars:
        return value, False
    head = value[:max_chars].rstrip()
    boundary = head.rfind(" ")
    if boundary >= max_chars // 2:
        head = head[:boundary].rstrip()
    return f"{head}\n\n...[잘림]", True


def _string_or_none(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_content_type(value: str | None) -> str:
    if value is None:
        return ""
    return value.split(";", 1)[0].strip().casefold()


def _require_searxng_settings() -> tuple[str, str]:
    search_url = settings.searxng_search_url.strip()
    api_key = (settings.searxng_api_key or "").strip()
    if not search_url:
        raise ChatToolError("SEARXNG_SEARCH_URL 설정이 비어 있습니다.")
    if not api_key:
        raise ChatToolError("SEARXNG_API_KEY 설정이 비어 있습니다.")
    return search_url, api_key


def _normalize_search_payload(
    payload: dict[str, Any],
    *,
    query: str,
    limit: int,
    page: int,
) -> dict[str, Any]:
    raw_results = payload.get("results")
    results: list[dict[str, Any]] = []
    if isinstance(raw_results, list):
        for index, raw_item in enumerate(raw_results, start=1):
            if not isinstance(raw_item, dict):
                continue
            title = _string_or_none(raw_item.get("title"))
            url = _string_or_none(raw_item.get("url"))
            if title is None or url is None:
                continue
            engines = raw_item.get("engines")
            normalized_engines = (
                [engine.strip() for engine in engines if isinstance(engine, str) and engine.strip()]
                if isinstance(engines, list)
                else []
            )
            results.append(
                {
                    "rank": index,
                    "title": title,
                    "url": url,
                    "snippet": _string_or_none(raw_item.get("content")) or "",
                    "engine": _string_or_none(raw_item.get("engine")),
                    "engines": normalized_engines,
                    "published_date": _string_or_none(raw_item.get("publishedDate")),
                }
            )
            if len(results) >= limit:
                break
    results_count = payload.get("number_of_results")
    return {
        "query": _string_or_none(payload.get("query")) or query,
        "page": page,
        "results_count": results_count if isinstance(results_count, int) else None,
        "results": results,
    }


async def _request_search_payload(
    *,
    query: str,
    page: int,
    language: str,
) -> dict[str, Any]:
    search_url, api_key = _require_searxng_settings()
    try:
        async with httpx.AsyncClient(
            timeout=settings.service_request_timeout_seconds,
            trust_env=False,
        ) as client:
            response = await client.get(
                search_url,
                params={
                    "q": query,
                    "format": "json",
                    "categories": _SEARCH_CATEGORY,
                    "language": language,
                    "pageno": page,
                },
                headers={
                    "Accept": "application/json",
                    "X-API-Key": api_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise ChatToolError(
            f"SearXNG 검색 호출이 실패했습니다. status={exc.response.status_code}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ChatToolError("SearXNG 검색 호출에 실패했습니다.") from exc
    except ValueError as exc:
        raise ChatToolError("SearXNG 검색 응답을 JSON으로 해석하지 못했습니다.") from exc
    if not isinstance(payload, dict):
        raise ChatToolError("SearXNG 검색 응답 형식이 올바르지 않습니다.")
    return payload


def _validate_requested_url(raw_url: str) -> str:
    normalized = raw_url.strip()
    if not normalized:
        raise ChatToolError("URL이 비어 있습니다.")
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"}:
        raise ChatToolError("http/https URL만 허용됩니다.")
    if parsed.username is not None or parsed.password is not None:
        raise ChatToolError("사용자 정보가 포함된 URL은 허용되지 않습니다.")
    if parsed.hostname is None:
        raise ChatToolError("호스트가 없는 URL은 허용되지 않습니다.")
    try:
        _ = parsed.port
    except ValueError as exc:
        raise ChatToolError("URL 포트 형식이 올바르지 않습니다.") from exc
    return normalized


async def _resolve_ip_addresses(hostname: str) -> list[str]:
    try:
        infos = await asyncio.to_thread(
            socket.getaddrinfo,
            hostname,
            None,
            0,
            socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise ChatToolError("호스트를 해석할 수 없습니다.") from exc
    addresses = sorted({info[4][0] for info in infos if info[4]})
    if not addresses:
        raise ChatToolError("호스트를 해석할 수 없습니다.")
    return addresses


async def _ensure_public_hostname(hostname: str) -> None:
    normalized = hostname.rstrip(".").casefold()
    if normalized == "localhost" or normalized.endswith(".localhost"):
        raise ChatToolError("localhost 주소는 허용되지 않습니다.")
    addresses = await _resolve_ip_addresses(normalized)
    if any(not ip_address(address).is_global for address in addresses):
        raise ChatToolError("공개 인터넷에서 접근 가능한 호스트만 허용됩니다.")


def _accept_header(format: Literal["text", "html"]) -> str:
    if format == "html":
        return "text/html, application/xhtml+xml;q=0.9, text/plain;q=0.8, */*;q=0.1"
    return (
        "text/plain, text/html;q=0.9, application/json;q=0.8, "
        "application/xhtml+xml;q=0.7, application/xml;q=0.6, text/xml;q=0.5, */*;q=0.1"
    )


async def _read_limited_body(response: httpx.Response) -> bytes:
    content_length_header = response.headers.get("content-length")
    if content_length_header is not None:
        try:
            content_length = int(content_length_header)
        except ValueError:
            content_length = None
        if content_length is not None and content_length > _MAX_FETCH_BYTES:
            raise ChatToolError(f"응답 본문이 {_MAX_FETCH_BYTES}바이트 제한을 초과했습니다.")

    chunks: list[bytes] = []
    total = 0
    async for chunk in response.aiter_bytes():
        total += len(chunk)
        if total > _MAX_FETCH_BYTES:
            raise ChatToolError(f"응답 본문이 {_MAX_FETCH_BYTES}바이트 제한을 초과했습니다.")
        chunks.append(chunk)
    return b"".join(chunks)


def _decode_body(body: bytes, response: httpx.Response) -> str:
    encoding = response.encoding or "utf-8"
    return body.decode(encoding, errors="replace")


def _normalize_body_content(
    *,
    content_type: str,
    raw_text: str,
    format: Literal["text", "html"],
) -> tuple[str | None, str]:
    normalized_type = _normalize_content_type(content_type)

    if normalized_type in _HTML_CONTENT_TYPES:
        extractor = _HtmlTextExtractor()
        extractor.feed(raw_text)
        extractor.close()
        if format == "html":
            return extractor.title, raw_text.strip()
        return extractor.title, extractor.text

    if normalized_type in _JSON_CONTENT_TYPES or normalized_type.endswith("+json"):
        if format == "html":
            return None, raw_text.strip()
        try:
            parsed = json.loads(raw_text)
        except ValueError:
            return None, raw_text.strip()
        return None, json.dumps(parsed, ensure_ascii=False, indent=2)

    if (
        normalized_type in _TEXT_CONTENT_TYPES
        or normalized_type.startswith("text/")
        or normalized_type.endswith("+xml")
    ):
        return None, raw_text.strip()

    raise ChatToolError(
        f"지원하지 않는 콘텐츠 형식입니다. content_type={normalized_type or 'unknown'}"
    )


async def _fetch_web_document(
    *,
    url: str,
    format: Literal["text", "html"],
) -> dict[str, Any]:
    requested_url = _validate_requested_url(url)
    current_url = requested_url

    try:
        async with httpx.AsyncClient(
            timeout=settings.service_request_timeout_seconds,
            follow_redirects=False,
            headers=_BROWSERISH_HEADERS,
            trust_env=False,
        ) as client:
            for _ in range(_MAX_REDIRECTS + 1):
                parsed = urlparse(current_url)
                hostname = parsed.hostname
                if hostname is None:
                    raise ChatToolError("호스트가 없는 URL은 허용되지 않습니다.")
                await _ensure_public_hostname(hostname)

                async with client.stream(
                    "GET",
                    current_url,
                    headers={"Accept": _accept_header(format)},
                ) as response:
                    if response.status_code in _REDIRECT_STATUS_CODES:
                        location = response.headers.get("location")
                        if not location:
                            raise ChatToolError("리다이렉트 응답에 Location 헤더가 없습니다.")
                        current_url = _validate_requested_url(urljoin(current_url, location))
                        continue

                    response.raise_for_status()
                    body = await _read_limited_body(response)
                    final_url = str(response.url)
                    status_code = response.status_code
                    content_type = response.headers.get("content-type", "")
                    raw_text = _decode_body(body, response)
                    title, content = _normalize_body_content(
                        content_type=content_type,
                        raw_text=raw_text,
                        format=format,
                    )
                    truncated_content, truncated = _truncate_text(content)
                    return {
                        "requested_url": requested_url,
                        "final_url": final_url,
                        "status_code": status_code,
                        "content_type": _normalize_content_type(content_type),
                        "title": title,
                        "content": truncated_content,
                        "truncated": truncated,
                    }
    except httpx.HTTPStatusError as exc:
        raise ChatToolError(
            f"웹 문서를 가져오지 못했습니다. status={exc.response.status_code}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ChatToolError("웹 문서를 가져오지 못했습니다.") from exc

    raise ChatToolError(f"리다이렉트를 {_MAX_REDIRECTS}회 넘겨 따라갈 수 없습니다.")


@tool
async def web_search(
    query: str,
    limit: int = 5,
    page: int = 1,
    language: str = _DEFAULT_SEARCH_LANGUAGE,
) -> dict[str, Any]:
    """SearXNG 기반 메타서치로 공개 웹 검색 결과를 조회합니다.

    query는 검색어 문자열입니다.
    limit은 1~10 사이로 보정하며, 결과에는 제목·URL·요약·검색 엔진 정보가 포함됩니다.
    page와 language를 함께 넘기면 다음 페이지나 다른 언어 결과도 조회할 수 있습니다.
    """

    normalized_query = query.strip()
    if not normalized_query:
        raise ChatToolError("검색어가 비어 있습니다.")
    normalized_limit = max(1, min(limit, _MAX_SEARCH_RESULTS))
    normalized_page = max(1, page)
    payload = await _request_search_payload(
        query=normalized_query,
        page=normalized_page,
        language=language.strip() or _DEFAULT_SEARCH_LANGUAGE,
    )
    return _normalize_search_payload(
        payload,
        query=normalized_query,
        limit=normalized_limit,
        page=normalized_page,
    )


@tool
async def web_fetch(url: str, format: Literal["text", "html"] = "text") -> dict[str, Any]:
    """공개 웹 문서를 안전하게 가져와 텍스트 또는 HTML로 정규화합니다.

    기본 format은 text이며 HTML 본문은 읽기 쉬운 텍스트로 바꿔 반환합니다.
    format=html을 쓰면 원본 HTML을 반환합니다.
    localhost, 사설망, credentials가 포함된 URL은 허용하지 않습니다.
    결과에는 요청 URL, 최종 URL, 상태 코드, 콘텐츠 타입, 제목, 본문, 잘림 여부가 포함됩니다.
    """

    return await _fetch_web_document(url=url, format=format)


WEB_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=web_search,
        name="web_search",
        description=(
            "최신 웹 검색 도구입니다. 질문에 요즘, 최신, 최근, 현재, 분위기, 트렌드, "
            "상권 변화, 임대료, 정책이 있으면 우선 사용합니다. 지역+업종+기간 검색어를 "
            "권장하며, 결과가 있으면 제목과 URL을 근거로 활용하고 결과가 비면 한계를 "
            "짧게 설명해야 합니다."
        ),
        category="web",
        args_schema=web_search.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=web_fetch,
        name="web_fetch",
        description=(
            "검색 결과의 특정 URL 원문이 더 필요할 때만 사용합니다. 공개 웹 문서를 "
            "안전하게 가져와 텍스트 또는 HTML로 정규화하며, 기본 format=text는 읽기 쉬운 "
            "본문 텍스트를 반환합니다. 원문 접근이 실패하면 실패를 과장하지 말고 확인 한계를 "
            "짧게 설명해야 합니다."
        ),
        category="web",
        args_schema=web_fetch.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
)
