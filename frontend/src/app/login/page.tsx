import { redirect } from "next/navigation"
import { z } from "zod"
import SignInClient from "@/features/auth/components/sign-in-client"
import { normalizeCallbackURL } from "@/features/auth/lib/callback-url"
import { OAUTH_LOGIN_ERROR } from "@/features/auth/lib/oauth-sign-in"
import { getServerSession } from "@/features/auth/lib/server-session"

const getFirstSearchParamValue = (value: unknown) => {
  return Array.isArray(value) ? value[0] : value
}

const LoginSearchParamsSchema = z.object({
  callbackURL: z.preprocess(getFirstSearchParamValue, z.string().optional()),
  error: z.preprocess(getFirstSearchParamValue, z.string().optional()),
})

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await getServerSession()
  const rawSearchParams = (await props.searchParams) ?? {}
  const parsedSearchParams = LoginSearchParamsSchema.safeParse(rawSearchParams)
  const callbackURL = normalizeCallbackURL(
    parsedSearchParams.success ? parsedSearchParams.data.callbackURL : undefined
  )
  const error =
    parsedSearchParams.success &&
    parsedSearchParams.data.error === OAUTH_LOGIN_ERROR
      ? parsedSearchParams.data.error
      : undefined

  if (session) {
    redirect(callbackURL)
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/20 px-4 py-16 sm:px-6">
      <div className="w-full max-w-md">
        <SignInClient callbackURL={callbackURL} error={error} />
      </div>
    </main>
  )
}
