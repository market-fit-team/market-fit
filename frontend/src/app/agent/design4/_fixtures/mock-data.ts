// src/app/agent/design4/_fixtures/mock-data.ts
// 미니멀리즘 AI 에이전트 인터페이스 — 가상 데이터 (design4 확장)

// ─── 타입 정의 ─────────────────────────────────────────────

/** 메시지에 첨부되는 파일 정보 */
export interface MessageFile {
  name: string
  size: string
  type: string
}

/** AI의 사고 과정 단계 */
export interface ThinkingStep {
  id: string
  label: string
  status: "pending" | "running" | "done" | "error"
  durationMs?: number
}

/** AI가 사용자에게 요청하는 권한 게이트 */
export interface PermissionGate {
  id: string
  action: string
  description: string
  risk: "low" | "medium" | "high"
  status: "pending" | "approved" | "denied"
}

/** 아티팩트 차트 데이터 */
export type ArtifactChartDatum = Record<string, string | number>

/** 아티팩트 차트 시리즈 */
export interface ArtifactChartSeries {
  key: string
  label: string
  color?: string
}

/** 아티팩트 차트 블록 */
export interface ArtifactChartBlock {
  kind: "chart"
  title: string
  description?: string
  chartType: "area" | "bar" | "radar" | "pie"
  data: ArtifactChartDatum[]
  xKey?: string
  nameKey?: string
  valueKey?: string
  series: ArtifactChartSeries[]
}

/** 아티팩트 지표 블록 */
export interface ArtifactMetricBlock {
  kind: "metric_grid"
  items: {
    label: string
    value: string
    description?: string
    tone?: "default" | "positive" | "warning"
  }[]
}

/** 아티팩트 마크다운 블록 */
export interface ArtifactMarkdownBlock {
  kind: "markdown"
  content: string
}

/** 아티팩트 콜아웃 블록 */
export interface ArtifactCalloutBlock {
  kind: "callout"
  tone: "info" | "success" | "warning"
  title: string
  content: string
}

/** AI 리포트용 블록 */
export type ArtifactBlock =
  | ArtifactMarkdownBlock
  | ArtifactMetricBlock
  | ArtifactChartBlock
  | ArtifactCalloutBlock

interface BaseArtifact {
  id: string
  title: string
  version: number
}

/** 코드 아티팩트 */
export interface CodeArtifact extends BaseArtifact {
  type: "code"
  language?: string
  code: string
}

/** 마크다운 아티팩트 */
export interface MarkdownArtifact extends BaseArtifact {
  type: "markdown"
  code: string
}

/** AI 리포트 아티팩트 */
export interface AiReportArtifact extends BaseArtifact {
  type: "ai_report"
  summary: string
  blocks: ArtifactBlock[]
}

/** 성향 분석 아티팩트 */
export interface PersonalityAnalysisArtifact extends BaseArtifact {
  type: "personality_analysis"
  summary: string
  traits: {
    name: string
    score: number
    description: string
  }[]
  blocks: ArtifactBlock[]
}

/** 인라인 아티팩트 (메시지 내 요약 카드와 우측 패널 상세 뷰에 함께 사용) */
export type InlineArtifact =
  | CodeArtifact
  | MarkdownArtifact
  | AiReportArtifact
  | PersonalityAnalysisArtifact

/** 웹 검색 결과 */
export interface WebSearchResult {
  id: string
  title: string
  url: string
  snippet: string
  source: string
}

/** 우측 패널 상태 타입 */
export type RightPanelContent =
  | { type: "document"; data: DocumentItem[] }
  | { type: "artifact"; data: InlineArtifact }
  | { type: "search_result"; data: WebSearchResult[] }
  | { type: "thinking"; data: ThinkingStep[] }
  | null

/** 채팅 메시지 */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  isLiked?: boolean
  isDisliked?: boolean
  file?: MessageFile
  thinkingSteps?: ThinkingStep[]
  permissionGate?: PermissionGate
  artifact?: InlineArtifact
  /** 메시지 전송 시 첨부된 문서 목록 */
  attachedDocs?: DocumentItem[]
  /** 웹 검색 결과 */
  searchResults?: WebSearchResult[]
}

/** 대화 스레드 */
export interface Thread {
  id: string
  title: string
  subtitle?: string
  updatedAt: string
  messageCount: number
  isPinned?: boolean
}

/** AI 메모리 항목 */
export interface AiMemory {
  id: string
  content: string
  createdAt: string
}

/** 문서 패널의 문서 항목 */
export interface DocumentItem {
  id: string
  name: string
  type: "tsx" | "ts" | "css" | "json" | "md" | "env" | "yaml"
  size: string
  updatedAt: string
  path: string
}

// ─── 프롬프트 제안 ─────────────────────────────────────────

export const promptSuggestions = [
  { icon: "code", label: "코드 리팩토링", description: "기존 코드를 모던하게 개선" },
  { icon: "shield", label: "보안 감사", description: "취약점 탐지 및 자동 수정" },
  { icon: "layout", label: "UI 컴포넌트 생성", description: "디자인 시스템 기반 컴포넌트" },
  { icon: "zap", label: "성능 최적화", description: "번들 사이즈 및 렌더링 개선" },
]

// ─── 문서 목록 ─────────────────────────────────────────────

export const initialDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    name: "dashboard.tsx",
    type: "tsx",
    size: "4.2 KB",
    updatedAt: "2시간 전",
    path: "src/components/dashboard.tsx",
  },
  {
    id: "doc-2",
    name: "auth-service.ts",
    type: "ts",
    size: "2.8 KB",
    updatedAt: "3시간 전",
    path: "src/services/auth-service.ts",
  },
  {
    id: "doc-3",
    name: "globals.css",
    type: "css",
    size: "1.5 KB",
    updatedAt: "어제",
    path: "src/app/globals.css",
  },
  {
    id: "doc-4",
    name: "api-routes.ts",
    type: "ts",
    size: "6.1 KB",
    updatedAt: "어제",
    path: "src/app/api/routes.ts",
  },
  {
    id: "doc-5",
    name: "package.json",
    type: "json",
    size: "3.4 KB",
    updatedAt: "3일 전",
    path: "package.json",
  },
  {
    id: "doc-6",
    name: "README.md",
    type: "md",
    size: "2.1 KB",
    updatedAt: "1주 전",
    path: "README.md",
  },
  {
    id: "doc-7",
    name: ".env.example",
    type: "env",
    size: "0.3 KB",
    updatedAt: "1주 전",
    path: ".env.example",
  },
  {
    id: "doc-8",
    name: "docker-compose.yaml",
    type: "yaml",
    size: "1.8 KB",
    updatedAt: "2주 전",
    path: "docker-compose.yaml",
  },
]

// ─── 스레드 목록 ───────────────────────────────────────────

export const initialThreads: Thread[] = [
  {
    id: "thread-1",
    title: "대시보드 컴포넌트 리팩토링",
    subtitle: "Tailwind v4 마이그레이션 및 XSS 취약점 수정",
    updatedAt: "방금",
    messageCount: 4,
    isPinned: true,
  },
  {
    id: "thread-2",
    title: "인증 플로우 설계",
    subtitle: "OAuth 2.0 + PKCE 기반 로그인 구현",
    updatedAt: "2시간 전",
    messageCount: 8,
  },
  {
    id: "thread-3",
    title: "API 엔드포인트 최적화",
    subtitle: "N+1 쿼리 해소 및 캐싱 전략",
    updatedAt: "어제",
    messageCount: 12,
  },
  {
    id: "thread-4",
    title: "디자인 시스템 토큰 정리",
    subtitle: "OKLCH 색상 팔레트 및 타이포그래피 스케일",
    updatedAt: "6월 20일",
    messageCount: 6,
  },
]

// ─── AI 메모리 목록 ─────────────────────────────────────────

export const initialMemories: AiMemory[] = [
  {
    id: "mem-1",
    content: "사용자는 React와 Next.js를 기반으로 한 프론트엔드 개발을 주로 함.",
    createdAt: "2026-06-20",
  },
  {
    id: "mem-2",
    content: "UI 디자인 시 Tailwind CSS v4를 선호하며 모던하고 미니멀한 디자인을 요구함.",
    createdAt: "2026-06-21",
  },
  {
    id: "mem-3",
    content: "설명은 항상 간결하게 bullet point로 요약해서 제공하는 것을 좋아함.",
    createdAt: "2026-06-22",
  },
  {
    id: "mem-4",
    content: "코드 작성 시 TypeScript를 강제하며, any 타입 사용을 지양함.",
    createdAt: "2026-06-22",
  },
]

// ─── 대화 내역 ─────────────────────────────────────────────

export const initialMessages: Record<string, ChatMessage[]> = {
  "thread-1": [
    {
      id: "m1-1",
      role: "user",
      content: "이전 개발자가 만들어둔 대시보드 컴포넌트가 있는데, 인라인 스타일로 작성되어 있고 보안 취약점도 의심돼. 리팩토링해줘.",
      timestamp: "오전 11:40",
    },
    {
      id: "m1-2",
      role: "assistant",
      content: "코드를 분석한 결과, 두 가지 주요 이슈를 발견했습니다.\n\n1. **XSS 취약점** — `dangerouslySetInnerHTML`로 사용자 입력을 검증 없이 렌더링하고 있습니다.\n2. **레거시 스타일** — 인라인 `style` 속성 사용으로 유지보수가 어렵습니다.\n\n아래에 리팩토링된 코드를 첨부합니다. Tailwind CSS v4 기반으로 전환했으며, XSS 위험 요소를 완전히 제거했습니다.",
      timestamp: "오전 11:42",
      thinkingSteps: [
        { id: "ts-1", label: "코드 구조 파싱 (AST 분석)", status: "done", durationMs: 200 },
        { id: "ts-2", label: "보안 취약점 스캔", status: "done", durationMs: 450 },
        { id: "ts-3", label: "Tailwind v4 디자인 토큰 매핑", status: "done", durationMs: 300 },
        { id: "ts-4", label: "리팩토링 코드 생성", status: "done", durationMs: 380 },
        { id: "ts-5", label: "타입 검증 및 린트 통과 확인", status: "done", durationMs: 250 },
      ],
      artifact: {
        id: "art-1",
        title: "ModernDashboard.tsx",
        type: "code",
        language: "tsx",
        version: 2,
        code: `"use client"

import * as React from "react"
import { TrendingUp, Plus, Sparkles } from "lucide-react"

interface DashboardProps {
  customTitle?: string
}

export function ModernDashboard({ customTitle }: DashboardProps) {
  const [data, setData] = React.useState([12, 28, 19, 32, 25, 48, 38])

  // 안전한 텍스트 렌더링 (XSS 방지)
  const safeTitle = customTitle || "모니터링 통계"

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Sparkles className="size-4 text-primary" />
        {safeTitle}
      </h3>
      <div className="flex h-36 items-end gap-3 mt-4">
        {data.map((value, i) => (
          <div
            key={i}
            style={{ height: \`\${(value / 60) * 100}%\` }}
            className="flex-1 rounded-t bg-primary/60 hover:bg-primary transition-colors"
          />
        ))}
      </div>
    </div>
  )
}`,
      },
    },
    {
      id: "m1-3",
      role: "user",
      content: "좋아, 근데 데이터 추가 버튼도 넣어줘. 그리고 프로덕션에 배포해도 될까?",
      timestamp: "오전 11:44",
    },
    {
      id: "m1-4",
      role: "assistant",
      content: "데이터 추가 기능을 포함하여 코드를 업데이트했습니다.\n\n프로덕션 배포에 대해서는, 아래 작업의 승인이 필요합니다.",
      timestamp: "오전 11:45",
      thinkingSteps: [
        { id: "ts-6", label: "기능 요구사항 반영", status: "done", durationMs: 150 },
        { id: "ts-7", label: "배포 환경 안전성 평가", status: "done", durationMs: 400 },
      ],
      permissionGate: {
        id: "pg-1",
        action: "프로덕션 환경 배포",
        description: "main 브랜치로 머지 후 CI/CD 파이프라인을 통해 프로덕션 서버에 배포합니다. 이 작업은 현재 운영 중인 서비스에 직접 영향을 미칩니다.",
        risk: "high",
        status: "pending",
      },
    },
  ],
  "thread-2": [
    {
      id: "m2-1",
      role: "user",
      content: "OAuth 2.0 PKCE 방식으로 소셜 로그인을 구현하고 싶어. 구글이랑 깃허브 지원해줘.",
      timestamp: "오전 9:15",
    },
    {
      id: "m2-2",
      role: "assistant",
      content: "OAuth 2.0 PKCE 기반의 소셜 로그인 아키텍처를 설계했습니다.\n\n**핵심 플로우:**\n1. 클라이언트에서 `code_verifier`와 `code_challenge` 생성\n2. Authorization Server로 리다이렉트 (Google / GitHub)\n3. Callback에서 authorization code + code_verifier로 토큰 교환\n4. Access Token을 HttpOnly Cookie에 저장\n\nPKCE를 사용하면 Authorization Code Interception 공격을 방지할 수 있어 SPA 환경에서 안전합니다.",
      timestamp: "오전 9:18",
      thinkingSteps: [
        { id: "ts-a1", label: "OAuth 2.0 스펙 검토", status: "done", durationMs: 300 },
        { id: "ts-a2", label: "PKCE 플로우 설계", status: "done", durationMs: 450 },
        { id: "ts-a3", label: "보안 가이드라인 적용", status: "done", durationMs: 200 },
      ],
    },
  ],
  "thread-3": [
    {
      id: "m3-1",
      role: "user",
      content: "서비스 카탈로그 API가 느려. N+1 쿼리 문제가 있는 것 같은데 확인해줘.",
      timestamp: "어제 오후 3:00",
    },
    {
      id: "m3-2",
      role: "assistant",
      content: "분석 결과, `GET /api/services` 엔드포인트에서 N+1 쿼리가 확인되었습니다.\n\n**현재 문제:**\n- 서비스 목록 조회 시 각 서비스마다 개별 `findOne()` 호출 → 100개 서비스 시 101회 쿼리\n\n**개선 방안:**\n- `JOIN FETCH` 또는 DataLoader 패턴 적용으로 쿼리를 2회로 축소\n- Redis 캐시 레이어 추가 (TTL: 5분)\n\n예상 응답 시간: 1,200ms → 45ms (약 96% 개선)",
      timestamp: "어제 오후 3:05",
      thinkingSteps: [
        { id: "ts-b1", label: "쿼리 로그 분석", status: "done", durationMs: 500 },
        { id: "ts-b2", label: "N+1 패턴 탐지", status: "done", durationMs: 300 },
        { id: "ts-b3", label: "최적화 전략 수립", status: "done", durationMs: 250 },
      ],
    },
    {
      id: "m3-3",
      role: "user",
      content: "성수동 상권 최근 트렌드 검색해줘.",
      timestamp: "어제 오후 3:10",
    },
    {
      id: "m3-4",
      role: "assistant",
      content: "웹을 검색하여 성수동 상권의 최근 트렌드를 요약했습니다.\n\n- **팝업스토어 성지**: 브랜드 체험 공간이 밀집하며 주말 유동인구가 평일을 상회\n- **F&B 프리미엄화**: 객단가가 높은 베이커리/로스터리 카페 위주로 상권 재편 중\n\n자세한 검색 결과는 우측 패널에서 확인하세요.",
      timestamp: "어제 오후 3:12",
      thinkingSteps: [
        { id: "ts-w1", label: "웹 검색: '성수동 상권 트렌드 2026'", status: "done", durationMs: 800 },
        { id: "ts-w2", label: "결과 요약 및 필터링", status: "done", durationMs: 400 },
      ],
      searchResults: [
        {
          id: "sr-1",
          title: "2026 성수동 상권 분석: 팝업과 F&B의 결합",
          url: "https://example.com/trend/seongsu",
          snippet: "올해 성수동 상권은 팝업 스토어의 고급화와 대형 리테일 매장의 입점 러시로 인해 권리금이 작년 대비 15% 이상 상승했습니다.",
          source: "TrendInsight",
        },
        {
          id: "sr-2",
          title: "오피스 상권과 주말 상권의 공존, 성수역 변화",
          url: "https://example.com/news/123",
          snippet: "성수역 일대 지식산업센터 입주가 완료되면서 평일 직장인 수요와 주말 2030 수요가 완벽하게 결합된 하이브리드 상권으로 거듭나고 있습니다.",
          source: "BizNews",
        },
      ],
      artifact: {
        id: "art-2",
        title: "성수동 상권 AI 리포트",
        type: "ai_report",
        version: 1,
        summary:
          "팝업 체험형 리테일과 프리미엄 F&B가 동시에 성장하는 고밀도 상권입니다.",
        blocks: [
          {
            kind: "markdown",
            content: `## 핵심 해석
성수동은 최근 3년간 브랜드 실험 공간과 목적형 방문 수요가 함께 증가한 지역입니다.

- **주요 소비층**: 20대 후반 ~ 30대 여성
- **상권 밀집도 점수**: 92점
- **추천 업종**: 체험형 쇼룸, 시그니처 베이커리, 로스터리 카페`,
          },
          {
            kind: "metric_grid",
            items: [
              {
                label: "상권 밀집도",
                value: "92점",
                description: "동일 반경 내 경쟁/유입 지표 합산",
                tone: "positive",
              },
              {
                label: "주요 소비층",
                value: "65%",
                description: "20대 후반 ~ 30대 여성 비중",
              },
              {
                label: "임대료 추세",
                value: "+15%",
                description: "전년 동기 대비 추정 상승률",
                tone: "warning",
              },
            ],
          },
          {
            kind: "chart",
            title: "성수동 주요 지표 변화",
            description: "팝업 방문량과 F&B 객단가가 함께 상승하고 있습니다.",
            chartType: "area",
            xKey: "quarter",
            series: [
              { key: "popup", label: "팝업 방문량", color: "var(--chart-2)" },
              { key: "fnb", label: "F&B 객단가", color: "var(--chart-4)" },
            ],
            data: [
              { quarter: "2025 2Q", popup: 46, fnb: 42 },
              { quarter: "2025 3Q", popup: 54, fnb: 47 },
              { quarter: "2025 4Q", popup: 68, fnb: 55 },
              { quarter: "2026 1Q", popup: 81, fnb: 63 },
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "주의 포인트",
            content:
              "소규모 개인 창업보다는 자본력을 갖춘 브랜드의 안테나샵 또는 예약 기반 F&B에 더 적합합니다.",
          },
        ],
      }
    },
  ],
  "thread-4": [
    {
      id: "m4-1",
      role: "user",
      content: "디자인 시스템의 색상 토큰을 OKLCH로 전환하고 싶어.",
      timestamp: "6월 20일 오후 2:00",
    },
    {
      id: "m4-2",
      role: "assistant",
      content: "OKLCH 색상 공간으로의 전환을 진행했습니다.\n\n**장점:**\n- 인간의 색상 인지에 기반한 균일한 밝기 (perceptual uniformity)\n- 색상 간 보간 시 의도하지 않은 탁한 중간색이 발생하지 않음\n- CSS Color Level 4 표준으로 모든 최신 브라우저 지원\n\n기존 HEX/HSL 토큰을 OKLCH로 변환한 결과를 정리했습니다.",
      timestamp: "6월 20일 오후 2:08",
      thinkingSteps: [
        { id: "ts-c1", label: "기존 색상 토큰 추출", status: "done", durationMs: 200 },
        { id: "ts-c2", label: "OKLCH 변환 및 대비비 검증", status: "done", durationMs: 350 },
      ],
      artifact: {
        id: "art-3",
        title: "디자인 협업 성향 분석",
        type: "personality_analysis",
        version: 1,
        summary:
          "빠른 시각 검증과 구조화된 의사결정을 선호하는 제품형 디자이너 성향이 강합니다.",
        traits: [
          {
            name: "실험성",
            score: 88,
            description: "새 UI 패턴을 빠르게 시도하고 화면에서 판단합니다.",
          },
          {
            name: "구조화",
            score: 76,
            description: "컴포넌트와 데이터 모델을 분리해 오래 가는 형태를 선호합니다.",
          },
          {
            name: "속도",
            score: 92,
            description: "완성도 높은 초안을 먼저 만들고 반복 개선하는 쪽에 강합니다.",
          },
          {
            name: "검증",
            score: 69,
            description: "타입과 실제 화면 확인을 통해 리스크를 줄입니다.",
          },
          {
            name: "표현력",
            score: 84,
            description: "단순 텍스트보다 차트와 패널형 표현을 선호합니다.",
          },
        ],
        blocks: [
          {
            kind: "markdown",
            content: `## 분석 요약
대화 흐름상 사용자는 단순 답변보다 **상황에 따라 바뀌는 작업 패널**을 기대합니다. 문서는 마크다운으로 읽히되, 핵심 판단 지점은 차트와 지표로 분리되는 구조가 잘 맞습니다.`,
          },
          {
            kind: "chart",
            title: "협업 성향 레이더",
            description: "점수가 높을수록 해당 성향이 강합니다.",
            chartType: "radar",
            xKey: "name",
            series: [
              { key: "score", label: "점수", color: "var(--chart-2)" },
            ],
            data: [
              { name: "실험성", score: 88 },
              { name: "구조화", score: 76 },
              { name: "속도", score: 92 },
              { name: "검증", score: 69 },
              { name: "표현력", score: 84 },
            ],
          },
          {
            kind: "metric_grid",
            items: [
              {
                label: "추천 UI",
                value: "Artifact Panel",
                description: "문서, 차트, 액션을 같은 패널에서 전환",
                tone: "positive",
              },
              {
                label: "본문 렌더러",
                value: "react-markdown",
                description: "마크다운은 안전한 텍스트 블록으로 제한",
              },
            ],
          },
        ],
      },
    },
  ],
}

// ─── AI 응답 생성 헬퍼 ─────────────────────────────────────

const responsePool = [
  {
    content: "요청하신 변경 사항을 코드에 반영했습니다. 타입 안전성과 접근성 기준을 모두 충족하도록 구현했으며, 우측의 코드 블록에서 변경 내역을 확인하실 수 있습니다.",
    steps: [
      { id: "r-1", label: "요구사항 분석", status: "done" as const, durationMs: 150 },
      { id: "r-2", label: "코드 생성 및 검증", status: "done" as const, durationMs: 300 },
    ],
  },
  {
    content: "분석을 완료했습니다. 현재 구조에서 개선할 수 있는 세 가지 포인트를 식별했습니다. 각 항목에 대한 구체적인 수정 방안을 아래에 정리했습니다.",
    steps: [
      { id: "r-3", label: "패턴 분석", status: "done" as const, durationMs: 200 },
      { id: "r-4", label: "최적화 전략 생성", status: "done" as const, durationMs: 250 },
      { id: "r-5", label: "영향도 평가", status: "done" as const, durationMs: 180 },
    ],
  },
  {
    content: "좋은 접근 방식입니다. 해당 기능을 구현하기 위해 필요한 의존성과 설정을 정리했습니다. 기존 코드베이스와의 충돌 없이 점진적으로 통합할 수 있는 구조로 설계했습니다.",
    steps: [
      { id: "r-6", label: "의존성 호환 검사", status: "done" as const, durationMs: 300 },
      { id: "r-7", label: "통합 설계", status: "done" as const, durationMs: 400 },
    ],
  },
]

/** 가상 AI 응답 생성기 */
export const generateBotResponse = (): { content: string; steps: ThinkingStep[] } => {
  const idx = Math.floor(Math.random() * responsePool.length)
  return {
    content: responsePool[idx].content,
    steps: responsePool[idx].steps,
  }
}
