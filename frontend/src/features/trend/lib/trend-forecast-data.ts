import type { TrendForecastBanner } from "@/features/trend/types/trend-forecast"

// 예측 API를 붙이기 전까지 사용하는 트렌드 배너용 정적 데이터다.
export const trendForecastBanner: TrendForecastBanner = {
  eyebrow: "AI 트렌드 예측",
  title: "다음 분기 뜰 상권과 업종을 먼저 확인하세요.",
  description:
    "유동인구, 매출 변화율, 생존율 데이터를 함께 읽어 창업 후보지를 빠르게 좁히는 트렌드 예측 기능입니다.",
  primaryCta: {
    label: "상권 지도에서 검증하기",
    href: "/map",
  },
  secondaryCta: {
    label: "성향 분석 먼저 하기",
    href: "/onboarding",
  },
  metrics: [
    {
      label: "성수 베이커리 카페",
      value: "+14.2%",
      description: "전년 대비 매출 성장률",
    },
    {
      label: "홍대 감성 F&B",
      value: "85점",
      description: "트렌드 밀집도",
    },
    {
      label: "종로 전통 상권",
      value: "58.0%",
      description: "3년 생존율",
    },
  ],
}
