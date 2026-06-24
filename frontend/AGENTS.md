<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## 검증
검증을 할 때에 `npm run build`는 명시적으로 요구할 때만 하고 `npm run typecheck` 또는 `npx tsc -b`를 사용하고, .next는 사용자가 localhost:3000 으로 dev 서버를 실행중일 수 있으므로 이쪽을 불필요하게 수정하거나 검증하지 않는다.

## 전역 타입 헬퍼

`Page` `Layout` `RouteHandlers`는 전역 타입 핼퍼를 사용한다. (PageProps, LayoutProps, RouteContext)

서치 파람은 예외적으로 zod로 검증한다.

## 함수 선언문

컴포넌트, 훅을 제외한 나머지는 화살표 함수를 선호하고,
컴포넌트와 훅만 함수 선언문을 사용한다.

## export

라이브러리 단에서 필요한 경우가 아닌 이상 named export를 사용하고, barreled export / re-rexport 하지 않는다.

import는 예외적인 경우를 제외하고 @로 시작하는 절대경로를 사용한다.
