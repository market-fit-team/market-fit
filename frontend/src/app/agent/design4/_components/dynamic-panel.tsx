"use client"

import * as React from "react"
import {
  Code,
  FileText,
  Search,
  TerminalSquare,
  PanelRightClose,
  Copy,
  Check,
  ExternalLink,
  BarChart3,
  Brain,
  Info,
  Sparkles,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Badge } from "@/shared/components/ui/badge"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"

import type {
  ArtifactBlock,
  ArtifactChartBlock,
  DocumentItem,
  InlineArtifact,
  RightPanelContent,
  ThinkingStep,
  WebSearchResult,
} from "../_fixtures/mock-data"
import { DocumentPanel } from "./document-panel"

interface DynamicPanelProps {
  content: RightPanelContent
  onClose: () => void
  onAttachToComposer: (doc: DocumentItem) => void
}

export function DynamicPanel({ content, onClose, onAttachToComposer }: DynamicPanelProps) {
  if (!content) return null

  // 문서 타입은 기존 DocumentPanel을 그대로 렌더링
  if (content.type === "document") {
    return (
      <DocumentPanel
        documents={content.data}
        onAttachToComposer={onAttachToComposer}
        onCollapsePanel={onClose}
        side="right"
      />
    )
  }

  // 헤더 정보 결정
  let HeaderIcon = FileText
  let title = ""
  let badgeText = ""

  if (content.type === "artifact") {
    HeaderIcon =
      content.data.type === "code"
        ? Code
        : content.data.type === "personality_analysis"
          ? Brain
          : content.data.type === "ai_report"
            ? BarChart3
            : FileText
    title = content.data.title
    badgeText = `v${content.data.version}`
  } else if (content.type === "search_result") {
    HeaderIcon = Search
    title = "웹 검색 결과"
    badgeText = `${content.data.length}건`
  } else if (content.type === "thinking") {
    HeaderIcon = TerminalSquare
    title = "사고 과정 및 도구 호출"
    badgeText = `${content.data.length} 단계`
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden border-l border-border/20 bg-background">
      {/* ── 공통 헤더 ── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <HeaderIcon className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {title}
          </span>
          {badgeText && (
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] shrink-0">
              {badgeText}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onClose}
                  className="cursor-pointer text-muted-foreground hover:text-foreground ml-1"
                >
                  <PanelRightClose className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">패널 접기</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ── 컨텐츠 렌더링 영역 ── */}
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!w-full">
        <div className="min-w-0 max-w-full p-3 md:p-5">
          {content.type === "artifact" && <ArtifactViewer artifact={content.data} />}
          {content.type === "search_result" && <SearchResultsViewer results={content.data} />}
          {content.type === "thinking" && <ThinkingViewer steps={content.data} />}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── 서브 뷰어 컴포넌트들 ─────────────────────────────────────

function ArtifactViewer({ artifact }: { artifact: InlineArtifact }) {
  const [copied, setCopied] = React.useState(false)
  const copyText = getArtifactCopyText(artifact)

  const handleCopy = () => {
    void navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 break-words text-sm text-muted-foreground">
          {getArtifactDescription(artifact)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 cursor-pointer gap-1.5 text-xs"
        >
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          {copied ? "복사됨" : artifact.type === "code" ? "코드 복사" : "내용 복사"}
        </Button>
      </div>

      {artifact.type === "code" && <CodeArtifactViewer artifact={artifact} />}
      {artifact.type === "markdown" && <MarkdownViewer content={artifact.code} />}
      {artifact.type === "ai_report" && <ReportArtifactViewer artifact={artifact} />}
      {artifact.type === "personality_analysis" && (
        <PersonalityAnalysisViewer artifact={artifact} />
      )}
    </div>
  )
}

function CodeArtifactViewer({
  artifact,
}: {
  artifact: Extract<InlineArtifact, { type: "code" }>
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/10">
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground">
        <code>{artifact.code}</code>
      </pre>
    </div>
  )
}

function ReportArtifactViewer({
  artifact,
}: {
  artifact: Extract<InlineArtifact, { type: "ai_report" }>
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-lg border border-border/30 bg-muted/15 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>AI 리포트 요약</span>
        </div>
        <p className="break-words text-sm leading-relaxed text-muted-foreground">
          {artifact.summary}
        </p>
      </div>
      <ArtifactBlocks blocks={artifact.blocks} />
    </div>
  )
}

function PersonalityAnalysisViewer({
  artifact,
}: {
  artifact: Extract<InlineArtifact, { type: "personality_analysis" }>
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-lg border border-border/30 bg-muted/15 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <Brain className="size-3.5 text-primary" />
          <span>성향 분석 요약</span>
        </div>
        <p className="break-words text-sm leading-relaxed text-muted-foreground">
          {artifact.summary}
        </p>
      </div>

      <div
        className="grid min-w-0 gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
        }}
      >
        {artifact.traits.map((trait) => (
          <div
            key={trait.name}
            className="min-w-0 rounded-lg border border-border/30 bg-background p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-foreground">
                {trait.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {trait.score}
              </span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${trait.score}%` }}
              />
            </div>
            <p className="break-words text-xs leading-relaxed text-muted-foreground">
              {trait.description}
            </p>
          </div>
        ))}
      </div>

      <ArtifactBlocks blocks={artifact.blocks} />
    </div>
  )
}

function ArtifactBlocks({ blocks }: { blocks: ArtifactBlock[] }) {
  return (
    <div className="min-w-0 space-y-4">
      {blocks.map((block, index) => (
        <ArtifactBlockRenderer key={`${block.kind}-${index}`} block={block} />
      ))}
    </div>
  )
}

function ArtifactBlockRenderer({ block }: { block: ArtifactBlock }) {
  if (block.kind === "markdown") {
    return <MarkdownViewer content={block.content} />
  }

  if (block.kind === "metric_grid") {
    return <MetricGridBlock block={block} />
  }

  if (block.kind === "chart") {
    return <ChartBlock block={block} />
  }

  return <CalloutBlock block={block} />
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/30 bg-background p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 text-xl font-semibold text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-sm font-semibold text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 break-words text-sm leading-relaxed text-muted-foreground">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground [&_li]:break-words">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground [&_li]:break-words">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-muted/50 p-3">
              {children}
            </pre>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function MetricGridBlock({
  block,
}: {
  block: Extract<ArtifactBlock, { kind: "metric_grid" }>
}) {
  const toneClassName = {
    default: "bg-background",
    positive: "bg-emerald-500/5",
    warning: "bg-amber-500/5",
  }

  return (
    <div
      className="grid min-w-0 gap-3"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
      }}
    >
      {block.items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 rounded-lg border border-border/30 p-4 ${toneClassName[item.tone ?? "default"]}`}
        >
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 break-words text-lg font-semibold text-foreground">
            {item.value}
          </div>
          {item.description && (
            <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function ChartBlock({ block }: { block: ArtifactChartBlock }) {
  const config = block.series.reduce<ChartConfig>((acc, series) => {
    acc[series.key] = {
      label: series.label,
      color: series.color ?? "var(--chart-1)",
    }
    return acc
  }, {})

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/30 bg-background p-3">
      <div className="mb-4">
        <h3 className="break-words text-sm font-semibold text-foreground">
          {block.title}
        </h3>
        {block.description && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
            {block.description}
          </p>
        )}
      </div>
      {block.chartType === "area" && (
        <AreaChartBlock block={block} config={config} />
      )}
      {block.chartType === "bar" && <BarChartBlock block={block} config={config} />}
      {block.chartType === "radar" && (
        <RadarChartBlock block={block} config={config} />
      )}
      {block.chartType === "pie" && <PieChartBlock block={block} config={config} />}
    </div>
  )
}

function AreaChartBlock({
  block,
  config,
}: {
  block: ArtifactChartBlock
  config: ChartConfig
}) {
  return (
    <ChartContainer config={config} className="h-52 w-full min-w-0 max-w-full overflow-hidden">
      <AreaChart data={block.data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={block.xKey} tickLine={false} axisLine={false} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {block.series.map((series) => (
          <Area
            key={series.key}
            type="monotone"
            dataKey={series.key}
            stroke={`var(--color-${series.key})`}
            fill={`var(--color-${series.key})`}
            fillOpacity={0.18}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

function BarChartBlock({
  block,
  config,
}: {
  block: ArtifactChartBlock
  config: ChartConfig
}) {
  return (
    <ChartContainer config={config} className="h-52 w-full min-w-0 max-w-full overflow-hidden">
      <BarChart data={block.data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={block.xKey} tickLine={false} axisLine={false} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {block.series.map((series) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            fill={`var(--color-${series.key})`}
            radius={4}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function RadarChartBlock({
  block,
  config,
}: {
  block: ArtifactChartBlock
  config: ChartConfig
}) {
  const [series] = block.series
  if (!series) return null

  return (
    <ChartContainer config={config} className="h-56 w-full min-w-0 max-w-full overflow-hidden">
      <RadarChart data={block.data}>
        <PolarGrid />
        <PolarAngleAxis dataKey={block.xKey} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Radar
          dataKey={series.key}
          stroke={`var(--color-${series.key})`}
          fill={`var(--color-${series.key})`}
          fillOpacity={0.18}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function PieChartBlock({
  block,
  config,
}: {
  block: ArtifactChartBlock
  config: ChartConfig
}) {
  const valueKey = block.valueKey ?? block.series[0]?.key ?? "value"
  const nameKey = block.nameKey ?? "name"
  const colors = block.series.map(
    (series, index) => series.color ?? `var(--chart-${(index % 5) + 1})`
  )

  return (
    <ChartContainer config={config} className="h-52 w-full min-w-0 max-w-full overflow-hidden">
      <PieChart>
        <Pie
          data={block.data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={50}
          outerRadius={78}
          paddingAngle={4}
        >
          {block.data.map((entry, index) => (
            <Cell
              key={`${entry[nameKey]}-${index}`}
              fill={colors[index % colors.length] ?? "var(--chart-1)"}
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  )
}

function CalloutBlock({
  block,
}: {
  block: Extract<ArtifactBlock, { kind: "callout" }>
}) {
  const toneClassName = {
    info: "border-border/30 bg-muted/20",
    success: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
  }

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${toneClassName[block.tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Info className="size-3.5" />
        <span className="min-w-0 break-words">{block.title}</span>
      </div>
      <p className="break-words text-sm leading-relaxed text-muted-foreground">
        {block.content}
      </p>
    </div>
  )
}

const getArtifactDescription = (artifact: InlineArtifact) => {
  if (artifact.type === "code") return "생성된 소스 코드입니다."
  if (artifact.type === "markdown") return "react-markdown으로 렌더링된 문서입니다."
  if (artifact.type === "personality_analysis") {
    return "차트와 지표가 포함된 성향 분석 아티팩트입니다."
  }
  return "마크다운, 지표, 차트를 조합한 AI 리포트입니다."
}

const getArtifactCopyText = (artifact: InlineArtifact) => {
  if (artifact.type === "code" || artifact.type === "markdown") {
    return artifact.code
  }

  return [
    `# ${artifact.title}`,
    artifact.summary,
    ...artifact.blocks.map((block) => {
      if (block.kind === "markdown") return block.content
      if (block.kind === "callout") return `## ${block.title}\n${block.content}`
      if (block.kind === "metric_grid") {
        return block.items
          .map((item) => `- ${item.label}: ${item.value}`)
          .join("\n")
      }
      return `## ${block.title}\n${block.description ?? ""}`.trim()
    }),
  ].join("\n\n")
}

function SearchResultsViewer({ results }: { results: WebSearchResult[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-6">
        총 {results.length}개의 신뢰할 수 있는 출처를 참고했습니다.
      </p>
      
      <div className="grid gap-3">
        {results.map((result) => (
          <a
            key={result.id}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
          className="group block min-w-0 rounded-xl border border-border/30 bg-card p-4 transition-colors hover:bg-muted/20"
          >
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <GlobeIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 truncate text-xs font-medium text-foreground">
                {result.source}
              </span>
              <ExternalLink className="size-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-sm font-semibold text-primary group-hover:underline mb-1.5 leading-snug">
              {result.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {result.snippet}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}

function ThinkingViewer({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        AI 에이전트의 내부 사고 과정 및 도구 호출 로그입니다.
      </p>

      <div className="relative border-l border-border/40 ml-3 pl-6 space-y-8">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative">
            <div className="absolute -left-[30px] top-1 flex size-5 items-center justify-center rounded-full bg-background border border-border/50 text-[10px] text-muted-foreground font-medium">
              {idx + 1}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {step.label}
                </span>
                {step.durationMs && (
                  <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] text-muted-foreground">
                    {step.durationMs}ms
                  </Badge>
                )}
              </div>
              
              <div className="rounded-lg bg-muted/30 p-3 mt-2 border border-border/20">
                <p className="text-xs font-mono text-muted-foreground">
                  Status: <span className="text-foreground">{step.status}</span>
                </p>
                {step.status === "running" && (
                  <p className="text-xs text-muted-foreground mt-1 animate-pulse">Processing...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}
