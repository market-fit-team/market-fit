import { usePathname } from "next/navigation"
import { useSession } from "@/features/auth/lib/auth-client"
import { RecommendationEmpty } from "@/features/map/components/recommendation/recommendation-empty"

type RecommendationEmptyContainerProps = {
  hasRecommendations: boolean
  onResetFilters: () => void
}

export function RecommendationEmptyContainer({
  hasRecommendations,
  onResetFilters,
}: RecommendationEmptyContainerProps) {
  const pathname = usePathname()
  const { data: session, isPending: isSessionPending } = useSession()
  const loginHref = `/login?${new URLSearchParams({
    callbackURL: pathname ?? "/map",
  }).toString()}`

  return (
    <RecommendationEmpty
      hasRecommendations={hasRecommendations}
      isSessionPending={isSessionPending}
      loginHref={loginHref}
      onResetFilters={onResetFilters}
      shouldShowLoginCta={!session}
    />
  )
}
