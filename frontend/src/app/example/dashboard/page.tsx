// src/app/example/dashboard/page.tsx
// Better Auth 문서의 “페이지/라우트마다 auth.api.getSession으로 검증” 예시 그대로.
// https://better-auth.com/docs/integrations/next
import { redirect } from "next/navigation"
import { getServerSession } from "@/features/auth/lib/server-session"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session) redirect("/example/sign-in?callbackURL=/example/dashboard")

  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Welcome, <b>{session.user.displayName}</b>
      </p>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </main>
  )
}
