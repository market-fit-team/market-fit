# CrawlSummaryCreateWidget

URL 또는 직접 입력한 원문을 backend에 보내 크롤링·LLM 요약 Post를 생성하는 독립 위젯이다. LLM API 호출과 크롤링은 frontend가 아니라 post backend가 수행한다.

## 사용법

`frontend/src/app/page.tsx`나 route를 이 feature에서 수정하지 않는다. 위젯을 붙일 화면에서 container를 import해 렌더링한다.

```tsx
import { CrawlSummaryCreateWidgetContainer } from "@/features/post/components/crawl-summary-create-widget/crawl-summary-create-widget-container"

export function ReportCreateSection() {
  return <CrawlSummaryCreateWidgetContainer />
}
```

Container는 다음을 처리한다.

- URL, keyword, rawContent, visibility 입력
- URL 또는 rawContent 필수 검증
- `POST /api/post/api/posts/crawl-summary` 호출
- loading, error, success 상태
- 생성 결과 표시

`NEXT_PUBLIC_API_ORIGIN`의 기본값은 `http://localhost:8088`이다. `/api/post`는 gateway의 post-service prefix이며, backend 서비스 직접 경로는 `/api/posts/crawl-summary`다.

frontend의 `fetchWithAuth`는 bearer token을 보낸다. post backend controller는 `X-User-Id`를 사용하므로 gateway가 검증된 token의 사용자 ID를 이 헤더로 변환·전달해야 한다. 브라우저가 임의로 보낸 `X-User-Id`를 신뢰하면 안 된다.

## onCreated

생성 직후 목록 갱신이나 상위 상태 반영이 필요하면 `onCreated`를 전달한다.

```tsx
import { CrawlSummaryCreateWidgetContainer } from "@/features/post/components/crawl-summary-create-widget/crawl-summary-create-widget-container"
import type { CrawlSummaryPost } from "@/features/post/types/post"

export function ReportCreateSection() {
  const handleCreated = (post: CrawlSummaryPost) => {
    console.log("created post", post.id)
  }

  return <CrawlSummaryCreateWidgetContainer onCreated={handleCreated} />
}
```

라우팅이나 전역 캐시 갱신 정책은 위젯이 결정하지 않는다. 필요한 동작은 상위 화면의 callback에서 처리한다.

## 입력 우선순위

frontend는 사용자가 입력한 값을 전달한다. backend 처리 우선순위는 다음과 같다.

```text
rawContent
-> url
```

현재 위젯은 사용자 실수를 줄이기 위해 URL 또는 20자 이상의 rawContent 중 하나를 요구한다.

## 보안

`OPENAI_API_KEY`를 frontend 환경변수나 번들에 넣지 않는다. API Key는 post backend 실행 환경에만 secret으로 주입한다.

루트 `.env`의 `AUTHENTIK_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`은 인증/OAuth 용도이며 LLM credential로 사용하지 않는다.

Post ID와 `sourceId`는 backend의 PostgreSQL UUID 계약에 맞춰 문자열로 처리한다.
