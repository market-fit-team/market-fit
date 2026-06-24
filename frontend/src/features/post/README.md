# Post

`src/features/post`는 메인 게시글 캐러셀, 게시글 작성/목록, 마이페이지 요약 위젯을 소유한다.

검색 결과 미리보기는 관련 기사 URL을 최대 5개까지 표시한다. 적합한 후보가 적으면
1~2개만 표시될 수 있다.

현재 저장소 전체 production build는 범위 밖 `src/shared/api/generated` 산출물이 없는
환경에서 실패할 수 있다. Post 기능 테스트는 생성 API 모듈과 독립적으로 실행한다.

## Generated API 전환 TODO

현재 `src/shared/api/generated/post` 모듈은 아직 생성되지 않아 `api/`의 직접 fetch 구현을
임시로 유지한다. `docker compose up -d`로 `post-service`를 실행한 뒤 루트에서
`make api-gen`을 실행하면 OpenAPI 문서로 React Query hooks와 타입을 생성할 수 있다.
생성물이 준비되면 feature의 직접 fetch와 중복 타입을 generated API 사용 방식으로
전환한다.

## 공개 새 AI 리포트 알림

`PublicPostReportBell`은 로그인 없이
`GET /api/post/api/posts/events` SSE를 구독한다. 공개 AI 리포트 저장이 완료되면
종 아이콘이 기본색에서 `text-primary`로 바뀌며, 아이콘을 클릭하면 기본색으로 돌아간다.
이벤트에는 사용자, 제목, 본문 같은 정보가 포함되지 않는다.

`useMainPosts`도 같은 브라우저 이벤트를 구독해 main 목록을 다시 조회한다. 실제 헤더에
표시하려면 범위 밖 레이아웃에서 다음 컴포넌트를 import해 배치해야 한다.

```tsx
import { PublicPostReportBell } from "@/features/post/components/public-post-report-bell/public-post-report-bell"

<PublicPostReportBell />
```

## CrawlSummaryCreateWidgetContainer

생성 응답의 `debug.notificationEligible`이 `true`이면 프랜차이즈 관련 알림 대상
안내 문구를 표시한다. 이 기능은 대상 여부에 대한 힌트만 제공한다. 실제 SSE/WebSocket
수신과 알림 목록 처리는 별도의 notification feature가 담당해야 한다.

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

`MyPostSummaryWidget`는 브라우저에서 authentik access token을 붙여 `/api/post/api/posts/me/summary`를 호출한다.

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
