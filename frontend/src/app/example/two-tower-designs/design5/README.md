# Design 5 — Dark Neon Glassmorphism

**담당 모델**: Claude Sonnet 4.6 (Thinking)

## 컨셉

딥 다크 배경(#07071a) + 네온 보라/파랑/초록 그라데이션 액센트의 글래스모피즘 UI.
배경에는 블러 오브와 그리드 패턴으로 SF적 분위기를 연출한다.

## 화면 흐름

```
[설문 메인 /design5]
  1. 업종 선택 (STEP 1 카드)
  2. 설문 10문항 — 카드 1장씩 슬라이드
     - 단일 선택(q1~q9): 선택지 중 1개
     - 복수 선택(q10): 최대 3개
  3. 로딩 애니메이션 (~1.8초 목 딜레이)
     ↓
[결과 /design5/[res]]
  - 성향 프로필 수평 바 차트 (9개 파라미터)
  - 추천 상권 TOP 5 카드 목록
  - 결과 공유 링크 복사
```

## 파일 구조

```
design5/
├── page.tsx                   # 설문 메인 (업종 선택 → 설문 → 로딩)
├── [res]/
│   └── page.tsx               # 결과 페이지
├── _components/
│   ├── CategorySelector.tsx   # 업종 선택 셀렉트
│   ├── QuestionCard.tsx       # 설문 질문 카드 (단일/복수)
│   ├── ProfileChart.tsx       # 성향 파라미터 바 차트
│   └── RecommendationCard.tsx # 추천 지역 카드
└── _fixtures/
    ├── survey.ts              # 설문 10문항 + 업종 목 데이터
    └── result.ts              # POST preview 목 응답 데이터
```

## 디자인 특징

- **다크 글래스모피즘**: `backdrop-filter: blur(20px)` + 반투명 surface
- **네온 그라데이션 액센트**: 보라(`#a78bfa`) → 하늘(`#38bdf8`) → 에메랄드(`#34d399`)
- **슬라이드 전환**: 카드 슬라이드 인/아웃 CSS 애니메이션
- **진행률 바**: 답변 완료 도트 + 퍼센트 표시
- **추천 카드**: fade-up 애니메이션 딜레이로 순차 등장

## API 연동 없음

실제 API 호출 없이 `_fixtures/result.ts`의 목 데이터만 사용한다.
