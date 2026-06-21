# Two-Tower Recommendation Design 3

본 디렉토리는 **Google Gemini 3.5 Flash** 모델 에이전트가 담당하여 구축한 **Two-Tower 기반 창업 성향 설문 및 상권 추천(Design 3)** 구현체입니다.

---

## 🌟 핵심 UX 및 디자인 콘셉트

Design 3는 창업자의 성향(Founder Fit)과 상권의 특성(Commercial Fit)이 다차원 임베딩 공간에서 매칭되는 **Two-Tower 모델링**의 원리를 시각적으로 극대화하여 전달하도록 설계되었습니다.

### 1. 반응형 및 고대비 다크 그래디언트 테마 (Premium Dark Aesthetic)
- 현대적인 테크 대시보드 감성의 메쉬 그래디언트(`Deep Navy` → `Indigo` → `Slate`) 배경과 투명한 블러 카드 효과(Glassmorphism)를 적용하여 프리미엄 웹앱 디자인을 자랑합니다.
- 중요 액션 및 핵심 스코어는 선명한 `Violet`과 `Pink` 네온 계열 포인트를 사용하여 사용자 시선을 자연스럽게 유도합니다.

### 2. 검색 및 필터가 내장된 업종(Category) 선택 단계
- 설문 시작 전, 사용자가 원하는 업종을 직관적으로 필터링하고 검색할 수 있도록 검색 바 및 이모지가 적용된 직관적인 카드형 그리드 디자인을 제공합니다.

### 3. 실시간 다차원 벡터 융합 대시보드 (Two-Tower Visualization)
- **Founder Fit Tower (창업성향 조절 패널)**: 사용자가 설문으로 정의한 9대 성향 지표(자본규모, 안정성, 역세권, 주말집중 등)를 슬라이더를 통해 실시간으로 조절할 수 있습니다. 
- **Commercial Fit Tower (상권 목록)**: 사용자가 성향 슬라이더를 움직임에 따라 추천 매칭 점수가 실시간으로 재계산(Cosine Similarity 모사)되며 상권 카드의 순위와 정보가 부드럽게 재배치됩니다.
- **정밀 대조 차트 (Radar Chart)**: Recharts 라이브러리를 사용하여 창업자 임베딩 벡터와 활성화된 상권 임베딩 벡터 간의 다차원 오버랩 상태를 한눈에 알아볼 수 있도록 레이더 차트로 시각화합니다.

### 4. URL 기반 완전 무상태형 공유 및 상태 보존 (Stateless URL State)
- 설문 답변 데이터를 16자리 컴팩트한 alphanumeric 코드로 직관적으로 인코딩(`c[cat]q[q1-q9]m[q10]z`)하여 URL 패스 파라미터로 관리합니다.
- 백엔드 데이터베이스 통신 없이도 **"결과 공유 링크 복사"** 및 **"새로고침"** 시 완전히 동일한 입력 상태와 차트 분석 결과를 완벽하게 복구합니다.

---

## 🛠 주요 구조 및 모듈

- **[page.tsx](file:///Users/jonghyunchoi/Desktop/ActiveProject/nginx-msa/frontend/src/app/example/two-tower-designs/design3/page.tsx)**: 검색 가능한 업종 선택 단계 및 10문항 인터랙티브 설문 컴포넌트입니다. 설문 종료 후 백엔드 분석 과정을 모사하는 애니메이션 트랜지션 스크린을 구동합니다.
- **[[res]/page.tsx](file:///Users/jonghyunchoi/Desktop/ActiveProject/nginx-msa/frontend/src/app/example/two-tower-designs/design3/[res]/page.tsx)**: 매칭 결과 다이어그램, 레이더 차트, 실시간 가중치 변경용 슬라이더 컨트롤러, 상세 지표 피드 등을 통합한 프리미엄 분석 대시보드 페이지입니다.
- **[_fixtures/mockData.ts](file:///Users/jonghyunchoi/Desktop/ActiveProject/nginx-msa/frontend/src/app/example/two-tower-designs/design3/_fixtures/mockData.ts)**: 질문 정의, 서울 주요 15대 상권 정보 벡터 데이터, 유클리드 거리 및 코사인 유사도를 모사한 매칭 알고리즘, URL 인코더/디코더가 내장된 순수 모듈입니다.

---

## 🤖 담당 에이전트 모델 정보
- **Model**: Gemini 3.5 Flash
