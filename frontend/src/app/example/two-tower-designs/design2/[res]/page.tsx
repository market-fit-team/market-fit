import { ResolvedProfileClient } from "../_components/resolved-profile-client"

/**
 * 설문 고유 코드(res)를 기준으로 결과를 시각화해주는 dynamic page
 */
export default async function Page(
  props: PageProps<"/example/two-tower/[base36]">
) {
  // Next.js App Router 비동기 파라미터 언랩 후 타입 캐스팅
  const params = await props.params
  const res = (params as unknown as { res: string }).res

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(circle_at_top_right,_rgba(240,253,244,0.9),_rgba(255,255,255,0.85)_34%,_rgba(241,245,249,0.9)_100%)] px-4 py-12 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_right,_rgba(6,78,59,0.15),_rgba(15,23,42,0.95)_40%)]">
      <ResolvedProfileClient profileCode={res} />
    </main>
  )
}
