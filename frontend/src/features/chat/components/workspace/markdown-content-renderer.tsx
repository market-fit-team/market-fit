"use client"

import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import {
  MarkdownChartBlock,
  MarkdownChartBlockFallback,
} from "@/features/chat/components/workspace/markdown-chart-block"
import { parseChartBlock } from "@/features/chat/lib/markdown/parse-chart-block"

export function MarkdownContentRenderer({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-sm leading-7 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-5 mb-3 text-base font-semibold text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-3 text-sm font-semibold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-sm font-medium text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 text-sm leading-7 break-words text-foreground first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
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
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const rawValue = String(children).replace(/\n$/, "")
            const language = className?.replace("language-", "")

            if (language === "chart") {
              const result = parseChartBlock(rawValue)

              if (!result.ok) {
                return <MarkdownChartBlockFallback message={result.message} />
              }

              return <MarkdownChartBlock chart={result.chart} />
            }

            if (language) {
              return (
                <pre className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-3">
                  <code className="font-mono text-xs leading-6 text-foreground">
                    {rawValue}
                  </code>
                </pre>
              )
            }

            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
