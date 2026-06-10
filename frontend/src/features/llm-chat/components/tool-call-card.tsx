import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"

interface ToolCallCardProps {
  title: string
  statusLabel: string
  tone?: "default" | "destructive"
  children?: React.ReactNode
}

export function ToolCallCard({
  title,
  statusLabel,
  tone = "default",
  children,
}: ToolCallCardProps) {
  return (
    <Card className="border-border/80 bg-background/85 shadow-none">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="font-mono">{title}</span>
          <Badge variant={tone === "destructive" ? "destructive" : "outline"}>
            {statusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">{children}</CardContent>
    </Card>
  )
}

export function ToolCallJsonBlock({ value }: { value: unknown }) {
  return (
    <ScrollArea className="h-36 rounded-lg border border-border/70 bg-muted/40 p-3">
      <pre className="text-sm leading-5 whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  )
}
