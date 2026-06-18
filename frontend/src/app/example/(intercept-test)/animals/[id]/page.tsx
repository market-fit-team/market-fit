import { notFound } from "next/navigation"
import { getAnimalById } from "@/features/animal/api/animal-service"
import { AnimalDetailPageCard } from "@/features/animal/components/animal-detail"

export default async function AnimalDetailPage({
  params,
}: PageProps<"/example/animals/[id]">) {
  const { id } = await params
  const animal = await getAnimalById(id)

  if (!animal) notFound()

  return <AnimalDetailPageCard animal={animal} />
}
