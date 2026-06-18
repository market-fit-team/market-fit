"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

type AnimalDetailProps = {
  animal: Animal
}

function AnimalDetailBody({ animal }: AnimalDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {animal.traits.map((trait) => (
          <Badge key={trait} variant="secondary">
            {trait}
          </Badge>
        ))}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-input/20 p-3">
          <dt className="mb-1 text-[0.625rem] text-muted-foreground">분류</dt>
          <dd className="text-sm">{animal.species}</dd>
        </div>
        <div className="rounded-md border border-border bg-input/20 p-3">
          <dt className="mb-1 text-[0.625rem] text-muted-foreground">서식지</dt>
          <dd className="text-sm">{animal.habitat}</dd>
        </div>
        <div className="rounded-md border border-border bg-input/20 p-3">
          <dt className="mb-1 text-[0.625rem] text-muted-foreground">먹이</dt>
          <dd className="text-sm">{animal.diet}</dd>
        </div>
        <div className="rounded-md border border-border bg-input/20 p-3">
          <dt className="mb-1 text-[0.625rem] text-muted-foreground">경로</dt>
          <dd className="text-sm">{`/example/animals/${animal.id}`}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">{animal.summary}</p>
    </div>
  )
}

export function AnimalDetailPageCard({ animal }: AnimalDetailProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{animal.name}</CardTitle>
          <CardDescription>
            직접 진입하거나 새로고침하면 풀페이지 상세가 렌더된다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimalDetailBody animal={animal} />
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/example/animals">/example/animals 로 돌아가기</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export function AnimalDetailDialog({ animal }: AnimalDetailProps) {
  const router = useRouter()

  return (
    // 모달을 닫을 때 이전 히스토리로 돌아가서 슬롯만 비운다.
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{animal.name}</DialogTitle>
          <DialogDescription>{animal.species}</DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <AnimalDetailBody animal={animal} />
        </div>
        <DialogFooter
          className="border-t border-border px-5 py-4"
          showCloseButton
        />
      </DialogContent>
    </Dialog>
  )
}
