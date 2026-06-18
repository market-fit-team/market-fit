import { z } from "zod"
import { getAnimals } from "@/features/animal/api/animal-service"
import { AnimalsShell } from "@/features/animal/components/animals-shell"

const AnimalsSearchParamsSchema = z.object({
  q: z.preprocess(
    (value) => (Array.isArray(value) ? (value[0] ?? "") : value),
    z.string().trim().default("")
  ),
})

export default async function AnimalsPage({
  searchParams,
}: PageProps<"/example/animals">) {
  const rawSearchParams = (await searchParams) ?? {}
  const parsedSearchParams =
    AnimalsSearchParamsSchema.safeParse(rawSearchParams)
  const q = parsedSearchParams.success ? parsedSearchParams.data.q : ""
  const animals = await getAnimals(q)

  return <AnimalsShell animals={animals} query={q} />
}
