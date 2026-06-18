"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"

type SearchPanelProps = {
  initialQuery: string
}

function SearchForm({ initialQuery }: SearchPanelProps) {
  return (
    // GET form으로 이동해서 서버 컴포넌트가 searchParams를 다시 읽게 한다.
    <form
      action="/example/animals"
      className="flex flex-col gap-4"
      method="get"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="animals-search-input">
          검색어
        </label>
        <Input
          id="animals-search-input"
          name="q"
          defaultValue={initialQuery}
          placeholder="레서판다, 수생, 사막..."
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Enter를 누르면 `/example/animals?q=...`로 이동하고 서버에서 목록을 다시
        필터링한다.
      </p>
      <div className="flex items-center gap-2">
        <Button type="submit">검색 적용</Button>
        <Button asChild type="button" variant="ghost">
          <Link href="/example/animals">초기화</Link>
        </Button>
      </div>
    </form>
  )
}

export function SearchPagePanel({ initialQuery }: SearchPanelProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4">
          <h1 className="font-heading text-xl font-semibold">
            /example/animals/search
          </h1>
          <p className="text-sm text-muted-foreground">
            직접 진입하면 검색 입력이 풀페이지로 열린다.
          </p>
        </div>
        <SearchForm initialQuery={initialQuery} />
      </div>
    </main>
  )
}

export function SearchSheet({ initialQuery }: SearchPanelProps) {
  const router = useRouter()

  return (
    // 검색 모달도 URL이 열림 상태를 결정한다.
    <Sheet open onOpenChange={(open) => !open && router.back()}>
      <SheetContent className="w-full sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>동물 검색</SheetTitle>
          <SheetDescription>
            검색은 `/example/animals` 서버 컴포넌트에서 처리한다.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6">
          <SearchForm initialQuery={initialQuery} />
        </div>
        <SheetFooter />
      </SheetContent>
    </Sheet>
  )
}
