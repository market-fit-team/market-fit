# HOME
1. 트렌드 예측 / 추천 게시글 쪽 feature와 의존성 있습니다.
2. 기본 리팩토링 원칙은 frontend\src\app\map\README.md 와 같되 Provider 등이 없어서 page.tsx에 바로 붙였습니다.


# AI 분석

`src/app/page.tsx`가 메인 페이지 레이아웃을 직접 조립한다.

```tsx
import { HomeCtaWidget } from "@/features/home/components/home-cta-widget/home-cta-widget"
import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"
import { TrendForecastBannerWidget } from "@/features/trend/components/trend-forecast-banner-widget/trend-forecast-banner-widget"

export default function HomePage() {
  return (
    <main className="flex-1 bg-muted/30 pb-20">
      <TrendForecastBannerWidget />

      <div className="mx-auto mt-12 max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        <HomeCtaWidget />
        <MainPostCarouselWidget />
      </div>
    </main>
  )
}
```

`features/home`은 홈 전용 CTA만 소유한다.

```text
src/features/home
├── README.md
└── components
    └── home-cta-widget
        └── home-cta-widget.tsx
```

`home-cta-widget/home-cta-widget.tsx`는 `/onboarding`, `/map` 라우트로 이동하는 `Link`만 가진다. `onboarding`이나 `map` feature 컴포넌트와 store는 import하지 않는다.

## app/page.tsx 의존성

`src/app/page.tsx`는 메인 화면에 필요한 feature 위젯을 직접 배치한다.

```text
src/app/page.tsx
├── src/features/trend/components/trend-forecast-banner-widget/trend-forecast-banner-widget.tsx
├── src/features/home/components/home-cta-widget/home-cta-widget.tsx
└── src/features/post/components/main-post-carousel-widget/main-post-carousel-widget.tsx
```

feature 사이에는 아래 방향의 import를 만들지 않는다.

```text
home -x-> trend
home -x-> post
trend -x-> home
post  -x-> home
```

페이지 조립은 `src/app/page.tsx`가 맡고, 재사용 가능한 기능 단위는 각 feature가 소유한다.

- 트렌드 예측 배너: `src/features/trend`
- 메인 게시글 캐러셀: `src/features/post`
- 홈 CTA 카드: `src/features/home`

## trend

상단 배너는 `src/features/trend`가 소유한다.

```text
src/features/trend
├── components
│   └── trend-forecast-banner-widget
│       └── trend-forecast-banner-widget.tsx
├── lib
│   └── trend-forecast-data.ts
└── types
    └── trend-forecast.ts
```

`trend-forecast-banner-widget.tsx`는 메인 상단의 트렌드 예측 배너를 렌더링한다. 배너 문구와 지표 데이터는 `trend-forecast-data.ts`에 있다.

```ts
export const trendForecastBanner = {
  eyebrow: "AI 트렌드 예측",
  title: "다음 분기 뜰 상권과 업종을 먼저 확인하세요.",
  primaryCta: {
    label: "상권 지도에서 검증하기",
    href: "/map",
  },
}
```

## post

메인 게시글 캐러셀 영역은 `src/features/post`가 소유한다.

```text
src/features/post
├── components
│   ├── main-post-carousel-widget
│   │   └── main-post-carousel-widget.tsx
│   ├── post-carousel
│   │   └── post-carousel.tsx
│   └── post-card
│       └── post-card.tsx
├── lib
│   └── main-post-carousel-sections.ts
└── types
    └── post-carousel.ts
```

`main-post-carousel-widget.tsx`가 섹션 반복을 소유한다. `src/app/page.tsx`는 게시글 섹션 개수와 순서를 알지 않는다.

```tsx
export function MainPostCarouselWidget() {
  return (
    <section className="space-y-8">
      <div className="space-y-10">
        {mainPostCarouselSections.map((section) => (
          <PostCarousel key={section.id} section={section} />
        ))}
      </div>
    </section>
  )
}
```

`main-post-carousel-sections.ts`는 메인 페이지에서 보여줄 게시글 섹션 데이터를 갖는다.

```ts
export const mainPostCarouselSections = [
  {
    id: "trend",
    title: "트렌드 예측 리포트",
    posts: [],
  },
]
```

## Server Components

`src/app/page.tsx`, `HomeCtaWidget`, `TrendForecastBannerWidget`, `MainPostCarouselWidget`는 `"use client"`를 선언하지 않는다.

현재 구현은 React state, browser API, event handler가 없다. Next.js App Router 기본값인 Server Component로 렌더링한다.

페이지 이동은 `next/link`의 `Link` 컴포넌트를 사용한다.

```tsx
<Link href="/map">상권 지도 바로가기</Link>
```

## 주요 파일

- `src/app/page.tsx`
- `src/features/home/components/home-cta-widget/home-cta-widget.tsx`
- `src/features/trend/components/trend-forecast-banner-widget/trend-forecast-banner-widget.tsx`
- `src/features/trend/lib/trend-forecast-data.ts`
- `src/features/post/components/main-post-carousel-widget/main-post-carousel-widget.tsx`
- `src/features/post/lib/main-post-carousel-sections.ts`

## 참고 문서

- Next.js Server and Client Components: `https://nextjs.org/docs/app/getting-started/server-and-client-components`
- Next.js Linking and Navigating: `https://nextjs.org/docs/app/getting-started/linking-and-navigating`
