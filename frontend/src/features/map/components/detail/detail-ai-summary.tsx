import { Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type DetailAiSummaryProps = {
  summary: string
}

export function DetailAiSummary({ summary }: DetailAiSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          AI 상권 요약
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </CardContent>
    </Card>
  )
}
