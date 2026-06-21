# Two-Tower Design 2 - 창업 성향 분석 및 상권 매칭

본 구현은 **Gemini 3.5 Flash** 모델에 의해 설계 및 구현되었습니다. 

창업 예정자의 관심 업종과 10가지 성향 질문(단일 선택형 9문항, 다중 선택형 1문항)에 대한 응답 결과를 기반으로 성향 수치를 고차원 벡터로 다이나믹하게 인코딩하고, 이를 상권 데이터셋 벡터와 매칭하여 실시간으로 가장 매칭률이 높은 5대 상권을 도출하여 시각화합니다.

## 핵심 기능 및 구현 특징

1. **완벽한 클라이언트 사이드 Mocking 및 로컬 스토리지 연동**
   - API 연동 없이 프론트엔드 자체 목데이터와 유사도 계산 알고리즘(`calculateMatchScore`, `calculateUserProfile`)만을 활용하여 실시간 매칭 성능을 보장합니다.
   - 설문이 완료되면 생성된 고유 `profile_code`와 진단 결과를 `LocalStorage`에 매핑해두어, 결과 페이지 진입 시 해당 데이터를 복원합니다.

2. **결정론적 공유 링크 기능 (Deterministic Share Link)**
   - 공유 링크(예: `/example/two-tower-designs/design2/r3a3lz4o0x8w1f2j`)를 통해 최초 진단 환경이 아닌 다른 브라우저나 시크릿 탭에서 접속하더라도 동일한 추천 결과를 재현합니다.
   - 이를 위해 `profile_code` 문자열 해시값을 시드로 사용하는 의사 난수 생성기(PRNG)를 구현하였으며, 코드만으로도 동일한 질문 답변 상태를 일관되게 복원해내는 결정론적 파서를 설계하였습니다.

3. **고품격 에스테틱 & 인터랙션 디자인 (Premium Aesthetics)**
   - 글래스모피즘(Glassmorphism) 스타일의 카드와 투명 배경 레이아웃을 전방위적으로 적용하였습니다.
   - **9대 성향 다이어그램**: `recharts` 라이브러리를 이용하여 Emerald & Slate 테마의 세련된 레이더 차트(Radar Chart)를 그리고, 각 지표별 설명과 점수를 하단 그리드로 풍성하게 구성했습니다.
   - **상권 매칭 인포그래픽**: 1위 상권은 대형 요약 카드로 강조하여 평균 월 매출액, 주말 비중, 저녁 매출 비중, 배후 주거/직장인 인구 등 풍부한 지표를 인포그래픽 형태로 시각화했습니다. 2~5위 상권은 접이식 아코디언 컴포넌트로 구성하여 깔끔함과 정보 전달력을 높였습니다.
   - **복사 및 저장 피드백**: "URL 복사" 버튼 클릭 시 클립보드 복사 성공 토스트 알림을 제공하고, "내 보관함 저장" 버튼 클릭 시 Mock DEMO ACCOUNT 기준으로 저장 상태와 일시가 갱신되는 피드백을 제공합니다.

## 파일 구조

```text
frontend/src/app/example/two-tower-designs/design2/
├── README.md                 # 본 문서 (Gemini 3.5 Flash 설명 포함)
├── page.tsx                  # 설문 시작 인트로 및 AI 연산 로딩 연출 메인 페이지
├── [res]/
│   └── page.tsx              # dynamic route parameter 'res' 언랩 및 클라이언트 바인딩
└── _components/
    ├── survey-wizard.tsx     # 업종 선택 및 10개 질문 단계별 진행 컴포넌트
    ├── radar-chart-visualizer.tsx # recharts 기반의 9대 성향 지표 시각화
    ├── recommendation-list.tsx    # 1위 집중 분석 & 2~5위 아코디언 매칭 리스트
    └── resolved-profile-client.tsx# 결과 대시보드 및 복사/저장 제어 클라이언트 메인
```
