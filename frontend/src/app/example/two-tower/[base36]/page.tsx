import { TwoTowerClient } from "@/app/example/two-tower/_components/two-tower-client"

export default async function Page(
  props: PageProps<"/example/two-tower/[base36]">
) {
  const { base36 } = await props.params

  return <TwoTowerClient initialProfileCode={base36} syncPathWithProfileCode />
}
