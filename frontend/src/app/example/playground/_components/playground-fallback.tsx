"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type PlaygroundFallbackProps = {
  title: string
  description: string
}

// 클라이언트 전용 조회 단계에서 아직 access token 또는 API 응답을 기다리는 상태를 보여준다.
export function PlaygroundLoadingFallback({
  title,
  description,
}: PlaygroundFallbackProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// 클라이언트 전용 조회가 실패했을 때 페이지 전체를 깨지 않고 원인을 섹션 단위로 보여준다.
export function PlaygroundErrorFallback({
  title,
  description,
}: PlaygroundFallbackProps) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
