# Design 1 (by Gemini 3.1 Pro (High))

## 구현 개요
이 폴더는 `two-tower-designs` 의 첫 번째 디자인(design1) 구현체입니다. `onboarding-service`의 10문항 설문 구조와 추천 결과를 Mock 데이터로 구성하여 UI 플로우를 검증합니다.

## 사용된 모델
- **모델명:** Gemini 3.1 Pro (High)
- **역할:** `design1` 폴더 전담 에이전트

## 주요 특징
1. **풍부한 UI/UX:** `shared/components/ui`의 카드 컴포넌트와 Tailwind CSS를 적극 활용하여, 현대적이고 매끄러운 설문 경험을 제공합니다.
2. **다중 선택 지원:** Q10과 같은 다중 선택 문항에 대해 최대 3개의 선택 제한을 두고 UI 적으로 선택 상태를 명확히 표시합니다.
3. **Mock Data 연동:** 실제 API가 아닌 `_fixtures/mockData.ts`를 사용하여 결과를 안전하고 빠르게 렌더링하며, `[res]` 페이지에서는 전달된 `profile_code`를 기반으로 결과를 보여줍니다.

## 폴더 구조
- `_components/`: 개별 질문 카드(`QuestionCard`)와 추천 상권 카드(`RecommendationCard`)
- `_fixtures/`: 설문 문항 및 추천 결과 Mock 데이터(`mockData.ts`)
- `[res]/page.tsx`: 설문 완료 후 이동하는 결과 확인 페이지
- `page.tsx`: 메인 설문 화면 (10개 문항 스크롤 방식)
