"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Animal } from "@/features/animal/types/animal"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Separator } from "@/shared/components/ui/separator"

type LogEntry = {
  id: number
  at: string
  message: string
}

type AnimalsShellProps = {
  animals: Animal[]
  query: string
}

const formatTime = () =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date())

export function AnimalsShell({ animals, query }: AnimalsShellProps) {
  const pathname = usePathname()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const previousPathnameRef = useRef(pathname)
  const previousQueryRef = useRef(query)

  const appendLog = (message: string) => {
    logIdRef.current += 1

    setLogs((current) => [
      ...current,
      {
        id: logIdRef.current,
        at: formatTime(),
        message,
      },
    ])
  }

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

  const searchHref = query
    ? `/example/animals/search?q=${encodeURIComponent(query)}`
    : "/example/animals/search"

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">
          /example/animals
        </h1>
        <p className="text-sm text-muted-foreground">
          목록은 서버 컴포넌트에서 필터링한다. 상세와 검색은 URL로 모달을 연다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-4">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">pathname: {pathname}</Badge>
                <Badge variant="outline">q: {query || "(empty)"}</Badge>
                <Badge variant="outline">count: {animals.length}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>동물 목록</CardTitle>
                  <CardDescription>
                    동물을 누르면 `/example/animals/[id]`로 이동하고 인터셉트
                    모달이 열린다.
                  </CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link
                    href={searchHref}
                    onClick={() => appendLog("검색 모달 열기")}
                  >
                    검색
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* 목록은 서버에서 내려준 데이터만 렌더하고, 모달 상태는 URL이 맡는다. */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {animals.map((animal) => (
              <Card key={animal.id} className="h-full">
                <CardHeader>
                  <CardTitle>{animal.name}</CardTitle>
                  <CardDescription>{animal.species}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {animal.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {animal.traits.map((trait) => (
                      <Badge key={trait} variant="secondary">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {animal.habitat}
                  </span>
                  <Button asChild>
                    <Link
                      href={`/example/animals/${animal.id}`}
                      onClick={() =>
                        appendLog(`상세 모달 열기 -> ${animal.id}`)
                      }
                    >
                      상세 보기
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {animals.length === 0 && (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                검색 결과가 없다.
              </CardContent>
            </Card>
          )}
        </section>

        <aside>
          <Card className="sticky top-6">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>이벤트 로그</CardTitle>
                  <CardDescription>
                    클릭, 라우트 변경, 필터 변경을 계속 누적한다.
                  </CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                  비우기
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ScrollArea className="h-[420px] pr-3">
                <div className="flex flex-col gap-3">
                  {logs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      아직 기록된 이벤트가 없다.
                    </p>
                  )}
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-md border border-border bg-input/20 p-3"
                    >
                      <div className="mb-1 text-[0.625rem] text-muted-foreground">
                        {log.at}
                      </div>
                      <div className="text-sm">{log.message}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
