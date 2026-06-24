import type { ReactNode } from "react"

// 지도(children)와 상세 모달(@detail) 슬롯을 같은 레이아웃에서 함께 유지한다.
export default function MapLayout({
  children,
  detail,
}: LayoutProps<"/map"> & {
  children: ReactNode
  detail: ReactNode
}) {
  return (
    <>
      {children}
      {detail}
    </>
  )
}
