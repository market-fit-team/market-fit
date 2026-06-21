# Post

`src/features/post`는 메인 게시글 캐러셀, 게시글 작성/목록, 마이페이지 요약 위젯을 소유한다.

## CrawlSummaryCreateWidgetContainer

`CrawlSummaryCreateWidgetContainer`는 URL 또는 원문을 검증하고 `/api/post/api/posts/crawl-summary`를 호출한다. 성공하면 생성된 Post를 표시하고 선택적인 `onCreated` callback을 호출한다.

```tsx
import { CrawlSummaryCreateWidgetContainer } from "@/features/post/components/crawl-summary-create-widget/crawl-summary-create-widget-container"

export function ReportCreator() {
  return (
    <CrawlSummaryCreateWidgetContainer
      onCreated={(post) => console.log(post.id)}
    />
  )
}
```

`CrawlSummaryCreateWidget`는 표시와 입력 이벤트만 담당한다. API 상태는 `useCreateCrawlSummaryPost`가 관리한다. LLM 처리는 backend에서만 수행한다.

## CreateLlmReportWidget

`CreateLlmReportWidget`는 URL과 `rawContent`를 `/api/post/api/v1/post-reports`로 보낸다. 둘 다 입력하면 `rawContent`가 우선이다. 둘 다 비우면 backend validation error가 반환된다.

```tsx
import { CreateLlmReportWidget } from "@/features/post/components/create-llm-report-widget/create-llm-report-widget"

export function ReportCreator() {
  return <CreateLlmReportWidget />
}
```

## MainPostCarouselWidget

`MainPostCarouselWidget`는 props 기반 표시 컴포넌트고, `MainPostCarouselWidgetContainer`가 `/api/post/api/posts/main` 조회 상태를 연결한다. LLM 리포트는 `AI 리포트` badge로 표시한다.

```tsx
import { MainPostCarouselWidgetContainer } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget-container"

export default function Page() {
  return <MainPostCarouselWidgetContainer />
}
```

## MyPostSummaryWidget

`MyPostSummaryWidget`는 브라우저에서 authentik access token을 붙여 `/api/post/api/v1/posts/me/summary`를 호출한다.

```tsx
import { MyPostSummaryWidget } from "@/features/post/components/my-post-summary-widget/my-post-summary-widget"

export function MypageContent() {
  return <MyPostSummaryWidget />
}
```

## API origin

```text
NEXT_PUBLIC_API_ORIGIN=http://localhost:8088
```

게이트웨이 public path는 `/api/post`다. 게이트웨이 등록 전 독립 실행 주소를 사용할 때는 `NEXT_PUBLIC_API_ORIGIN`과 프록시 경로를 실행 환경에 맞춘다.

## 주요 파일

- `api/post-api.ts`
- `api/create-crawl-summary-post.ts`
- `hooks/use-create-crawl-summary-post.ts`
- `components/crawl-summary-create-widget/crawl-summary-create-widget.tsx`
- `components/crawl-summary-create-widget/crawl-summary-create-widget-container.tsx`
- `components/create-llm-report-widget/create-llm-report-widget.tsx`
- `components/main-post-carousel-widget/main-post-carousel-widget.tsx`
- `components/my-post-summary-widget/my-post-summary-widget.tsx`
- `components/create-post.tsx`
- `components/post-list.tsx`
- `types/post.ts`

## 참고 문서

- Next.js Fetching Data: `https://nextjs.org/docs/app/getting-started/fetching-data`
- React useEffect: `https://react.dev/reference/react/useEffect`
