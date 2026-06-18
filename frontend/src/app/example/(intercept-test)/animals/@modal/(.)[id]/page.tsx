import { notFound } from "next/navigation"
import { getAnimalById } from "@/features/animal/api/animal-service"
import { AnimalDetailDialog } from "@/features/animal/components/animal-detail"

export default async function AnimalDetailModalPage({
  params,
}: PageProps<"/example/animals/[id]">) {
  const { id } = await params
  const animal = await getAnimalById(id)

  if (!animal) notFound()

  return <AnimalDetailDialog animal={animal} />
}
