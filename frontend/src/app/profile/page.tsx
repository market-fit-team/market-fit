import { redirect } from "next/navigation"
import { z } from "zod"
import { normalizeCallbackURL } from "@/features/auth/lib/callback-url"
import { getServerSession } from "@/features/auth/lib/server-session"
import { ProfileForm } from "@/features/profile/components/profile-form"
import { resolveProfileDraft } from "@/features/profile/lib/profile-defaults"

const getFirstSearchParamValue = (value: unknown) => {
  return Array.isArray(value) ? value[0] : value
}

const ProfileSearchParamsSchema = z.object({
  callbackURL: z.preprocess(getFirstSearchParamValue, z.string().optional()),
})

export default async function ProfilePage(props: PageProps<"/profile">) {
  const session = await getServerSession()
  const rawSearchParams = (await props.searchParams) ?? {}
  const parsedSearchParams =
    ProfileSearchParamsSchema.safeParse(rawSearchParams)
  const callbackURL = normalizeCallbackURL(
    parsedSearchParams.success ? parsedSearchParams.data.callbackURL : undefined
  )

  if (!session) {
    const loginCallbackURL = callbackURL === "/" ? "/profile" : callbackURL
    redirect(`/login?callbackURL=${encodeURIComponent(loginCallbackURL)}`)
  }

  const profileDraft = resolveProfileDraft(session.user)

  return (
    <main className="flex flex-1 bg-muted/20 px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <ProfileForm
          callbackURL={callbackURL}
          initialAge={profileDraft.age}
          initialAvatarSeed={profileDraft.avatarSeed}
          initialDisplayName={profileDraft.displayName}
          initialJob={profileDraft.job}
          requiresInitialization={profileDraft.requiresInitialization}
        />
      </div>
    </main>
  )
}
