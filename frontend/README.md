# Next.js template

`https://ui.shadcn.com/create`로 초기화한 템플릿

`npx shadcn@latest init --preset b1D0dv72 --template next`

기본 설정 + style mira

`npx shadcn@latest add --all` <= 모든 컴포넌트 추가해뒀음. 나중에 prune 해서 지워야됨

폴더구조는 [bullet proof react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) 를 참고하되 features 간 상호참조 가능, 순환 참조만 지양

## Code Quality (ESLint & Prettier)

`frontend/.prettierrc`
`frontend/eslint.config.mjs`

- **ESLint**: 비동기 `floating-promises` 경고, 인라인 `type-imports` 권장
- **Prettier**: Tailwind CSS 클래스 자동 정렬 및 상단 `import` 구문 순서 자동 정렬 적용
- **공통**: `src/shared/components/ui` 폴더 내 shadcn 컴포넌트들은 린트/포맷팅 대상에서 제외

## Better Auth + Keycloak

Better Auth는 Keycloak Generic OAuth provider를 사용한다.

```text
Keycloak issuer: http://localhost:8180/realms/pickle
Better Auth callback: http://localhost:3000/api/auth/oauth2/callback/keycloak
API runtime origin: http://localhost:8088
```

`/api/proxy`는 사용하지 않는다. Generated client는 `NEXT_PUBLIC_API_ORIGIN + /api/{service}`를 호출한다.

## Coding Convention

- **Naming**: 파일 및 폴더명은 `kebab-case`를 사용합니다. (예: `get-echo.server.ts` 처럼 마침표(`.`) 포함 가능)
- **Functions**: 라우트 핸들러, 리액트 컴포넌트, 커스텀 훅을 제외한 일반 유틸/헬퍼 함수는 화살표 함수(`const = () =>`)를 사용합니다.
- **Types**: `interface` 대신 `type` 키워드를 사용한 객체 타입을 선호합니다.
- **Next.js Props**: `params`나 `searchParams`를 직접 타이핑하지 않고, Next.js의 Route-aware Type Helper(`PageProps`, `LayoutProps` 등) 사용을 선호합니다.
