# App Structure

본 프로젝트는 도메인과 관심사 분리를 위해 [bulletproof-react](https://github.com/alan2207/bulletproof-react) 기반의 구조를 Next.js App Router에 맞춰 변형해 사용한다.

## Directory Structure

코드는 주로 `src` 폴더 내부에 위치하며, 아래와 같은 구조를 가진다.

```text
frontend
├── e2e                         # Playwright 등을 활용한 End-to-End 테스트
└── src
    ├── app                     # 애플리케이션 진입점 및 전역 설정
    │   ├── api                 # Route Handler (BFF 프록시, 인증 등)
    │   ├── layout.tsx          # 전역 공통 레이아웃 (헤더, Toaster 등)
    │   ├── providers.tsx       # 전역 Provider (QueryClient 등) 세팅
    │   └── page.tsx            # 화면(Page) 컴포넌트
    │
    ├── features                # 도메인/기능별 독립적인 모듈
    │   └── [feature-name]      # 예: auth, llm-chat, posts
    │       ├── components      # 해당 도메인에 특화된 UI 컴포넌트
    │       ├── hooks           # 해당 도메인의 비즈니스 로직 훅
    │       ├── lib             # 해당 도메인의 순수 로직 및 Zod 스키마
    │       ├── stores          # 해당 도메인의 공유 UI 상태 (Zustand 등)
    │       └── types           # 해당 도메인의 타입 정의
    │
    └── shared                  # 애플리케이션 전체에서 공유되는 공통 자원
        ├── api                 # 전역 API 스키마
        │   └── generated       # Orval generated 산출물 (endpoints, schemas)
        ├── components          # 공용 UI 컴포넌트 (Button, Input 등)
        ├── db                  # Drizzle ORM 설정 및 전역 스키마
        ├── hooks               # 공용 커스텀 훅
        ├── utils               # 공용 유틸리티 함수
        └── types               # 공용 타입 정의
```

## `src/app`

Next.js의 진입점과 라우팅을 담당한다.

- `src/app/layout.tsx`: `UserNav` 등 전역 헤더 요소가 포함된다.
- `src/app/providers.tsx`: `QueryClientProvider` 등 전역 컨텍스트를 주입한다.
- `src/app/api/auth/[...all]/route.ts`: Better Auth 핸들러.

## `src/features`

기능(도메인)별로 독립적인 모듈을 구성한다.

- **Cross-referencing 규칙**: 도메인 간의 참조는 "도메인 직접 의존"이 아닌 "재사용 가능한 capability 의존"인지 확인해야 한다. 순환 참조는 금지된다.
- **`lib` 규칙**: 컴포넌트나 훅이 아닌 순수 로직을 둔다. 예를 들어 `post-composer-form-schema.ts`처럼 입력 규칙 폼 스키마가 여기에 위치한다.
- **`stores` 규칙**: Zustand 스토어는 캐시나 SDK 소유 상태가 아닌, 순수 "공유 UI 상태(예: 모달 Open 여부, 에디터 상태)"에 한해서만 구성한다.

## `src/shared`

앱 전역에서 공유되는 코드다.

- **`src/shared/db`**: Drizzle 클라이언트와 공통 `user`, `session` 테이블 스키마.
- **`src/shared/api/generated`**: 백엔드 OpenAPI에서 Orval로 자동 생성된 훅 및 스키마.

## Zod as SSOT & Generated Type First

폼 검증과 API 검증의 원천을 일치시키되 책임을 분리한다.

1. **Form Schema**: UX 중심의 폼 검증은 `features/[name]/lib`에서 Zod로 선언하여 사용한다.
2. **API Payload**: 서버 전송 직전에는 반드시 `shared/api/generated`에 생성된 Zod 바디(예: `CreatePostBody`)로 다시 한 번 파싱해 계약을 지킨다.
3. **Response Type**: 서버 응답 타입 역시 프론트엔드에서 직접 다시 작성하지 않고, 자동 생성된 타입을 최우선으로 재사용한다.

## 주요 파일

- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/app/page.tsx`
- `src/shared/db/index.ts`
- `src/shared/db/schema.ts`
- `src/shared/api/problem-detail-schema.ts`

## 참고 문서

- Next.js App Router: https://nextjs.org/docs/app
- Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
