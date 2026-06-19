// src/features/auth/components/sign-in-client.tsx
"use client"

import { useState } from "react"
import { AlertCircle, ArrowRight } from "lucide-react"
import { authClient } from "@/features/auth/lib/auth-client"
import {
  getDefaultLoginOption,
  loginOptions,
} from "@/features/auth/lib/login-options"
import {
  OAUTH_LOGIN_ERROR,
  buildOAuthSignInPayload,
} from "@/features/auth/lib/oauth-sign-in"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert"
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

export default function SignInClient({
  callbackURL,
  error,
}: {
  callbackURL: string
  error?: string
}) {
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState(
    error === OAUTH_LOGIN_ERROR
      ? "로그인을 완료하지 못했습니다. 다시 시도해 주세요."
      : undefined
  )
  const defaultLoginOption = getDefaultLoginOption()

  return (
    <Card className="border border-border/80 bg-background/95 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">Secure sign-in</Badge>
          <span className="text-[0.625rem] text-muted-foreground">
            redirect: <code className="font-mono">{callbackURL}</code>
          </span>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">로그인</CardTitle>
          <CardDescription>
            Google 계정으로 빠르게 로그인하고 이전 작업 위치로 돌아갑니다.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>로그인 실패</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          {loginOptions.map((loginOption) => {
            const isSubmitting = activeOptionId === loginOption.id
            const isDisabled = activeOptionId !== null

            return (
              <Button
                key={loginOption.id}
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full justify-between rounded-lg px-4"
                disabled={isDisabled}
                aria-busy={isSubmitting}
                onClick={async () => {
                  if (isDisabled) return

                  setErrorMessage(undefined)
                  setActiveOptionId(loginOption.id)

                  try {
                    await authClient.signIn.oauth2(
                      buildOAuthSignInPayload({
                        callbackURL,
                        loginOption,
                      })
                    )
                  } catch {
                    setErrorMessage(
                      "로그인을 시작하지 못했습니다. 다시 시도해 주세요."
                    )
                  } finally {
                    setActiveOptionId(null)
                  }
                }}
              >
                <span className="flex items-center gap-3">
                  <GoogleIcon />
                  <span className="text-sm font-medium">
                    {loginOption.label}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Button>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-4 text-xs text-muted-foreground">
        {defaultLoginOption.description}
      </CardFooter>
    </Card>
  )
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 12.23c0-.73-.065-1.43-.186-2.102H12v3.977h5.498a4.705 4.705 0 0 1-2.041 3.088v2.566h3.305c1.936-1.782 3.043-4.407 3.043-7.53Z"
        fill="currentColor"
      />
      <path
        d="M12 22c2.754 0 5.063-.913 6.75-2.474l-3.305-2.566c-.918.616-2.092.981-3.445.981-2.647 0-4.89-1.786-5.692-4.188H2.89v2.647A10 10 0 0 0 12 22Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M6.308 13.753A5.99 5.99 0 0 1 6 12c0-.608.105-1.198.308-1.753V7.6H2.89A10 10 0 0 0 2 12c0 1.61.385 3.13 1.07 4.4l3.238-2.647Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M12 6.06c1.497 0 2.84.515 3.899 1.529l2.923-2.923C17.058 3.034 14.75 2 12 2A10 10 0 0 0 2.89 7.6l3.418 2.647C7.11 7.846 9.353 6.06 12 6.06Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  )
}
