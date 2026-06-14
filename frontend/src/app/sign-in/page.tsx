// src/app/sign-in/page.tsx
import SignInClient from "@/features/auth/components/sign-in-client"

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main>
      <h1>Sign in</h1>
      <SignInClientWrapper searchParams={searchParams} />
    </main>
  )
}

async function SignInClientWrapper({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"]
}) {
  const params = await searchParams
  return (
    <SignInClient
      callbackURL={String(params?.callbackURL || "/")}
      error={String(params?.error || "")}
    />
  )
}
