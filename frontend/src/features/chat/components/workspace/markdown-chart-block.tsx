"use client"

import { AlertCircle } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import type { ChatMarkdownChartBlock } from "@/features/chat/lib/markdown/chat-markdown-chart-schema"
import type { ChartConfig } from "@/shared/components/ui/chart"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

const buildCartesianConfig = (
  chart: Extract<ChatMarkdownChartBlock, { type: "bar" | "line" }>
) => {
  return chart.series.reduce<ChartConfig>((config, series, index) => {
    config[series.key] = {
      label: series.label,
      color: series.color ?? `var(--chart-${(index % 5) + 1})`,
    }
    return config
  }, {})
}

const buildPieConfig = (
  chart: Extract<ChatMarkdownChartBlock, { type: "pie" }>
) => {
  return chart.data.reduce<ChartConfig>((config, row, index) => {
    const label = String(row[chart.nameKey])
    config[label] = {
      label,
      color: `var(--chart-${(index % 5) + 1})`,
    }
    return config
  }, {})
}

export function MarkdownChartBlock({
  chart,
}: {
  chart: ChatMarkdownChartBlock
}) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border/40 bg-background">
      {(chart.title || chart.description) && (
        <div className="border-b border-border/30 px-4 py-3">
          {chart.title && (
            <h3 className="text-sm font-semibold text-foreground">
              {chart.title}
            </h3>
          )}
          {chart.description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {chart.description}
            </p>
          )}
        </div>
      )}
      <div className="px-3 py-3">
        {chart.type === "bar" && <BarMarkdownChart chart={chart} />}
        {chart.type === "line" && <LineMarkdownChart chart={chart} />}
        {chart.type === "pie" && <PieMarkdownChart chart={chart} />}
      </div>
    </div>
  )
}

export function MarkdownChartBlockFallback({ message }: { message: string }) {
  return (
    <div className="my-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <AlertCircle className="size-4 text-amber-600" />
        차트 블록을 렌더링하지 못했습니다.
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{message}</p>
    </div>
  )
}

function BarMarkdownChart({
  chart,
}: {
  chart: Extract<ChatMarkdownChartBlock, { type: "bar" }>
}) {
  const config = buildCartesianConfig(chart)

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={chart.data} margin={{ top: 8, right: 12, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chart.series.map((series) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            name={series.label}
            fill={`var(--color-${series.key})`}
            radius={4}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function LineMarkdownChart({
  chart,
}: {
  chart: Extract<ChatMarkdownChartBlock, { type: "line" }>
}) {
  const config = buildCartesianConfig(chart)

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <LineChart data={chart.data} margin={{ top: 8, right: 12, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chart.series.map((series) => (
          <Line
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.label}
            stroke={`var(--color-${series.key})`}
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

function PieMarkdownChart({
  chart,
}: {
  chart: Extract<ChatMarkdownChartBlock, { type: "pie" }>
}) {
  const config = buildPieConfig(chart)
  const colors = chart.data.map(
    (_row, index) => `var(--chart-${(index % 5) + 1})`
  )

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <PieChart>
        <Pie
          data={chart.data}
          dataKey={chart.dataKey}
          nameKey={chart.nameKey}
          innerRadius={46}
          outerRadius={78}
          paddingAngle={4}
        >
          {chart.data.map((row, index) => (
            <Cell
              key={`${String(row[chart.nameKey])}-${index}`}
              fill={colors[index] ?? "var(--chart-1)"}
            />
          ))}
        </Pie>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) =>
                `${name}: ${Number(value).toLocaleString()}`
              }
            />
          }
        />
      </PieChart>
    </ChartContainer>
  )
}
