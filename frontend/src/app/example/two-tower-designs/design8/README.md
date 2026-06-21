# Design 8 — Claude Opus 4.6 (Thinking)

## 개요

**Claude Opus 4.6 (Thinking)** 모델이 만든 Design4의 개선 버전이다.

## Design4 → Design8 개선 사항

| 영역 | Design4 (기존) | Design8 (개선) |
| --- | --- | --- |
| 결과 레이아웃 | `max-w-2xl` 단일 컬럼 | `max-w-6xl` + lg 2컬럼 (좌5:우7) |
| 프로필 영역 | 스크롤에 따라 사라짐 | 데스크톱 `sticky` — 스크롤해도 고정 |
| 추천 카드 | 1컬럼 나열 | xl 이상에서 2컬럼 그리드 |
| 이모지 사용 | 🥇💰🏠💼📅📊💡✨ 다수 | 전부 SVG 아이콘 / 숫자 뱃지로 대체 |
| 레이아웃 시프트 | 미방지 | 문항 영역 `minHeight`, 차트 `aspect-ratio`, 바 영역 고정 높이 |
| 설문 너비 | `max-w-lg` (512px) | `max-w-xl` (576px) + md 패딩 확대 |
| 반응형 타이포 | 고정 | md: 제목·설명 폰트 확대 |
| 결과 헤더 | 세로 나열 | md: flex-row 가로 정렬 |

## 디자인 컨셉

**"인터랙티브 카드 덱 + 반응형 대시보드"**

- 설문: 카드 슬라이드 전환, 단일 선택 시 자동 넘기기
- 결과: 데스크톱 — 좌측 sticky 프로필 분석 + 우측 추천 카드 그리드
- 모바일 — 자연스러운 단일 컬럼 스크롤

## 폴더 구조

```
design8/
├── README.md
├── page.tsx               ← 설문 입력 페이지
├── [res]/
│   └── page.tsx           ← 결과 표시 페이지 (반응형 2컬럼)
├── _components/
│   ├── survey-progress.tsx
│   ├── question-card.tsx
│   ├── profile-radar.tsx
│   ├── profile-summary.tsx
│   └── recommendation-card.tsx
└── _fixtures/
    ├── types.ts
    ├── survey-data.ts
    └── response-data.ts
```

## 사용 기술

- Next.js App Router (클라이언트 컴포넌트)
- Tailwind CSS (반응형 유틸리티 `md:`, `lg:`, `xl:`)
- 공유 UI: `@/shared/components/ui` (Button, Card, Badge, Progress, Checkbox)
- SVG 레이더 차트 + SVG 아이콘 (외부 라이브러리 없음)
- API 연동 없음 (목 데이터 전용)
