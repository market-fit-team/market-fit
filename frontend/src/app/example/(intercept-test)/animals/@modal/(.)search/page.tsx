import { z } from "zod"
import { SearchSheet } from "@/features/animal/components/search-panel"

const AnimalsSearchParamsSchema = z.object({
  q: z.preprocess(
    (value) => (Array.isArray(value) ? (value[0] ?? "") : value),
    z.string().trim().default("")
  ),
})

export default async function AnimalSearchModalPage({
  searchParams,
}: PageProps<"/example/animals/search">) {
  const rawSearchParams = (await searchParams) ?? {}
  const parsedSearchParams =
    AnimalsSearchParamsSchema.safeParse(rawSearchParams)
  const q = parsedSearchParams.success ? parsedSearchParams.data.q : ""

  return <SearchSheet initialQuery={q} />
}
