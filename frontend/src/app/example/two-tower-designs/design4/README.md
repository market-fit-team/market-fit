# Design 4 — Claude Opus 4.6 (Thinking)

## 개요

**Claude Opus 4.6 (Thinking)** 모델이 만든 창업 성향 설문 + 맞춤 상권 추천 UI 디자인이다.

## 디자인 컨셉

**"인터랙티브 카드 덱 + 감성 대시보드"**

- 설문 화면: 카드 슬라이드 전환 방식으로 10문항을 순차 진행. 단일 선택 시 자동 넘기기.
- 결과 화면: SVG 레이더 차트 + 수치 바 + 인사이트 텍스트 + 추천 상권 카드 리스트.
- 그라데이션 배경, 마이크로 애니메이션, 단계 인디케이터 등 시각적 폴리시 적용.

## 폴더 구조

```
design4/
├── README.md          ← 이 파일
├── page.tsx           ← 설문 입력 페이지 (클라이언트 컴포넌트)
├── [res]/
│   └── page.tsx       ← 결과 표시 페이지 (클라이언트 컴포넌트)
├── _components/
│   ├── survey-progress.tsx     ← 진행률 바 + 점 인디케이터
│   ├── question-card.tsx       ← 문항 카드 (단일/다중 선택)
│   ├── profile-radar.tsx       ← SVG 레이더 차트
│   ├── profile-summary.tsx     ← 프로필 수치 바 카드
│   └── recommendation-card.tsx ← 추천 상권 카드
└── _fixtures/
    ├── types.ts          ← TypeScript 타입 정의
    ├── survey-data.ts    ← 설문 10문항 목 데이터
    └── response-data.ts  ← 응답/추천 목 데이터
```

## 사용 기술

- Next.js App Router (클라이언트 컴포넌트)
- Tailwind CSS
- 공유 UI: `@/shared/components/ui` (Button, Card, Badge, Progress, Checkbox)
- SVG 레이더 차트 (외부 라이브러리 없이 직접 구현)
- API 연동 없음 (모든 데이터는 `_fixtures` 내 목 데이터 사용)
