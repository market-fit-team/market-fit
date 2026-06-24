"use client"

import { useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { MainErrorFallback } from "@/shared/components/errors/main-error-fallback"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { queryConfig } from "@/shared/lib/react-query"

export function Providers({ children }: React.PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      })
  )

  return (
    <ThemeProvider>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary FallbackComponent={MainErrorFallback} onReset={reset}>
            <QueryClientProvider client={queryClient}>
              {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
              {children}
            </QueryClientProvider>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </ThemeProvider>
  )
}
