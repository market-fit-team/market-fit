# /animals

`src/app/(intercept-test)/animals/page.tsx`는 동물 목록을 렌더한다.  
`src/app/(intercept-test)/animals/[id]/page.tsx`는 상세 page를 렌더한다.  
`src/app/(intercept-test)/animals/search/page.tsx`는 검색 page를 렌더한다.  
`src/app/(intercept-test)/animals/@modal` 슬롯은 같은 경로를 Dialog, Sheet로 가로챈다.

```text
/animals
-> 목록
-> /animals/[id]
-> soft navigation
-> 상세 Dialog

/animals/[id]
-> 주소 직접 입력
또는 refresh
-> 상세 full page

/animals
-> /animals/search
-> soft navigation
-> 검색 Sheet

/animals/search
-> 주소 직접 입력
또는 refresh
-> 검색 full page
```

## 경로

```text
animals/
  layout.tsx
  page.tsx
  [id]/page.tsx
  search/page.tsx
  @modal/default.tsx
  @modal/[...catchAll]/page.tsx
  @modal/(.)[id]/page.tsx
  @modal/(.)search/page.tsx

src/features/animal/
  components/
    animals-shell.tsx
    animal-detail.tsx
    search-panel.tsx
  api/
    animal-service.ts
  mocks/
    mock-animals.ts
  types/
    animal.ts
```

`layout.tsx`는 `children`와 `modal` 슬롯을 같이 렌더한다.

```tsx
export default function AnimalsLayout({
  children,
  modal,
}: LayoutProps<"/animals"> & {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

## /animals/page.tsx

`page.tsx`는 `searchParams`를 서버에서 읽는다.  
`q`는 클라이언트 훅으로 읽지 않고 서버 필터 입력으로만 쓴다.

```tsx
export default async function AnimalsPage({
  searchParams,
}: PageProps<"/animals">) {
  const rawSearchParams = (await searchParams) ?? {}
  const parsedSearchParams =
    AnimalsSearchParamsSchema.safeParse(rawSearchParams)
  const q = parsedSearchParams.success ? parsedSearchParams.data.q : ""
  const animals = await getAnimals(q)

  return <AnimalsShell animals={animals} query={q} />
}
```

`page.tsx`는 `searchParams` 스키마를 페이지 안에 둔다.

```tsx
const AnimalsSearchParamsSchema = z.object({
  q: z.preprocess(
    (value) => (Array.isArray(value) ? (value[0] ?? "") : value),
    z.string().trim().default("")
  ),
})
```

`_types/animal.ts`는 `Animal` 타입만 둔다.

`animals.data.ts`는 더미 데이터만 둔다.

```tsx
export const ANIMALS: Animal[] = [
  // ...
]
```

`_services/animal-service.ts`는 더미 데이터 조회 함수를 둔다.

```tsx
export const getAnimals = async (query = ""): Promise<Animal[]> => {
  const keyword = normalize(query)

  if (!keyword) return ANIMALS

  return ANIMALS.filter((animal) => {
    const haystack = [
      animal.name,
      animal.species,
      animal.habitat,
      animal.diet,
      animal.summary,
      ...animal.traits,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(keyword)
  })
}
```

## /animals/[id]

`[id]/page.tsx`는 직접 진입용 상세 page다.

```tsx
export default async function AnimalDetailPage({
  params,
}: PageProps<"/animals/[id]">) {
  const { id } = await params
  const animal = await getAnimalById(id)

  if (!animal) notFound()

  return <AnimalDetailPageCard animal={animal} />
}
```

`@modal/(.)[id]/page.tsx`는 같은 URL을 Dialog로 가로챈다.

```tsx
export default async function AnimalDetailModalPage({
  params,
}: PageProps<"/animals/[id]">) {
  const { id } = await params
  const animal = await getAnimalById(id)

  if (!animal) notFound()

  return <AnimalDetailDialog animal={animal} />
}
```

```text
/animals
-> Link href="/animals/red-panda"
-> children slot은 /animals 유지
-> @modal 슬롯은 (.)[id] 렌더
-> Dialog open

/animals/red-panda
-> 주소 직접 입력
또는 refresh
-> [id]/page.tsx 렌더
-> full page
```

`AnimalDetailDialog`는 닫힐 때 `router.back()`으로 이전 히스토리로 돌아간다.

```tsx
export function AnimalDetailDialog({ animal }: AnimalDetailProps) {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent>{/* ... */}</DialogContent>
    </Dialog>
  )
}
```

## /animals/search

`search/page.tsx`는 직접 진입용 검색 page다.  
`page.tsx`에서 export한 `AnimalsSearchParamsSchema`를 그대로 재사용한다.

```tsx
export default async function AnimalSearchPage({
  searchParams,
}: PageProps<"/animals/search">) {
  const rawSearchParams = (await searchParams) ?? {}
  const parsedSearchParams =
    AnimalsSearchParamsSchema.safeParse(rawSearchParams)
  const q = parsedSearchParams.success ? parsedSearchParams.data.q : ""

  return <SearchPagePanel initialQuery={q} />
}
```

`@modal/(.)search/page.tsx`는 같은 URL을 Sheet로 가로챈다.

```tsx
export default async function AnimalSearchModalPage({
  searchParams,
}: PageProps<"/animals/search">) {
  const rawSearchParams = (await searchParams) ?? {}
  const parsedSearchParams =
    AnimalsSearchParamsSchema.safeParse(rawSearchParams)
  const q = parsedSearchParams.success ? parsedSearchParams.data.q : ""

  return <SearchSheet initialQuery={q} />
}
```

검색 버튼은 `/animals/search`로 이동한다.

```tsx
const searchHref = query
  ? `/animals/search?q=${encodeURIComponent(query)}`
  : "/animals/search"
```

검색 입력은 GET form으로 `/animals`로 보낸다.

```tsx
<form action="/animals" className="flex flex-col gap-4" method="get">
  <Input name="q" defaultValue={initialQuery} />
</form>
```

```text
/animals
-> Link href="/animals/search"
-> children slot은 /animals 유지
-> @modal 슬롯은 (.)search 렌더
-> Sheet open

/animals/search
-> 주소 직접 입력
또는 refresh
-> search/page.tsx 렌더
-> full page
```

## @modal/default.tsx

`@modal/default.tsx`는 평소 모달을 비운다.

```tsx
export default function AnimalsModalDefault() {
  return null
}
```

`@modal/[...catchAll]/page.tsx`도 `null`을 반환한다.  
현재 URL이 더 이상 `@modal` 슬롯 경로와 맞지 않을 때 fallback으로 비운다.

```tsx
export default function AnimalsModalCatchAllPage() {
  return null
}
```

## logs

`_components/animals-shell.tsx`는 로컬 state로 로그를 누적한다.

```tsx
const [logs, setLogs] = useState<LogEntry[]>([])
```

클릭 로그는 링크 클릭 시 직접 넣는다.

```tsx
<Link
  href={`/animals/${animal.id}`}
  onClick={() => appendLog(`상세 모달 열기 -> ${animal.id}`)}
>
  상세 보기
</Link>
```

경로와 필터 변화는 `usePathname()`과 `query` prop 변화로 누적한다.

```tsx
useEffect(() => {
  if (previousPathnameRef.current === pathname) return

  appendLog(`route -> ${pathname}`)
  previousPathnameRef.current = pathname
}, [pathname])

useEffect(() => {
  if (previousQueryRef.current === query) return

  appendLog(`filter -> q=${query || "(empty)"}`)
  previousQueryRef.current = query
}, [query])
```

## 모달을 열고 닫아도 logs가 남는 이유

`layout.tsx`가 `children`와 `@modal` 슬롯을 같이 유지하기 때문이다.  
`/animals`에서 상세나 검색을 열 때 현재 목록 슬롯은 남고, `@modal` 슬롯만 바뀐다.  
그래서 `AnimalsShell`이 계속 살아 있고 `logs`도 유지된다.

```text
/animals
-> AnimalsShell mount
-> logs 시작

/animals/red-panda
-> children: /animals 유지
-> modal: detail dialog 추가
-> AnimalsShell 유지
-> logs 유지

닫기
-> router.back()
-> modal slot 제거
-> AnimalsShell 유지
-> logs 유지
```

## 검색 후 logs가 초기화되는 이유

현재 구현은 검색 입력을 `/animals` GET form으로 보낸다.  
`/animals/search`에서 `/animals?q=...`로 이동하면 `page.tsx`가 새 `q`로 다시 실행된다.  
이 경로에서는 현재 화면이 `/animals` page 기준으로 다시 잡히기 때문에 `AnimalsShell`도 새로 시작하고 `logs`도 초기값으로 돌아간다.

```text
/animals/search
-> Sheet open
-> form submit
-> /animals?q=해달
-> page.tsx 가 q를 다시 safeParse
-> getAnimals(q) 실행
-> AnimalsShell 새로 시작
-> logs 초기화
```

## 원리

인터셉트 라우트는 다른 경로의 page를 현재 layout 안에서 열어준다.  
패러렐 라우트는 한 layout 안에서 `children`, `@modal` 같은 슬롯을 동시에 렌더한다.  
이 둘이 같이 붙으면 목록 context를 유지한 채 상세나 검색을 모달로 띄울 수 있다.

```text
Parallel Routes
-> 같은 layout 안에 여러 슬롯 유지

Intercepting Routes
-> 다른 경로를 현재 layout 문맥에서 렌더

두 기능을 같이 사용
-> 목록은 유지
-> 다른 경로는 모달로 노출
```

## 주요 파일

- `src/app/(intercept-test)/animals/layout.tsx`
- `src/app/(intercept-test)/animals/page.tsx`
- `src/app/(intercept-test)/animals/[id]/page.tsx`
- `src/app/(intercept-test)/animals/search/page.tsx`
- `src/features/animal/types/animal.ts`
- `src/features/animal/api/animal-service.ts`
- `src/app/(intercept-test)/animals/@modal/default.tsx`
- `src/app/(intercept-test)/animals/@modal/[...catchAll]/page.tsx`
- `src/app/(intercept-test)/animals/@modal/(.)[id]/page.tsx`
- `src/app/(intercept-test)/animals/@modal/(.)search/page.tsx`
- `src/features/animal/components/animals-shell.tsx`
- `src/features/animal/components/animal-detail.tsx`
- `src/features/animal/components/search-panel.tsx`
- `src/features/animal/mocks/mock-animals.ts`

## 참고 문서

- Next.js Intercepting Routes: https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes
- Next.js Parallel Routes: https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes
- Next.js `page.tsx`: https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js `layout.tsx`: https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Next.js App Router glossary `Layout`: https://nextjs.org/docs/app/glossary
