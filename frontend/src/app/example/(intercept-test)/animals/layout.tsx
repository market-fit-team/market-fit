import type { ReactNode } from "react"

export default function AnimalsLayout({
  children,
  modal,
}: LayoutProps<"/example/animals"> & {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    <>
      {/* 목록 슬롯과 모달 슬롯을 같은 레이아웃에서 함께 유지한다. */}
      {children}
      {modal}
    </>
  )
}
