import type {
  DetailReportData,
  HourlyFootTraffic,
} from "@/features/map/types/map"

// 실제 값은 동코드 기준 백엔드 응답으로 교체한다.

const footTrafficHours: readonly string[] = Array.from(
  { length: 24 },
  (_, hour) => String(hour).padStart(2, "0")
)

const baseFootTraffic = [
  6, 4, 3, 3, 5, 10, 22, 42, 55, 41, 35, 44, 70, 50, 38, 42, 58, 76, 88, 74, 56,
  40, 26, 14,
]

const buildFootTraffic = (): HourlyFootTraffic[] =>
  footTrafficHours.map((hour) => ({
    hour,
    value: baseFootTraffic[Number(hour)] * 100,
  }))

export const detailReportMock: DetailReportData = {
  footTraffic: buildFootTraffic(),
  residentPopulation: {
    total: 30_460,
    byAge: [
      { ageGroup: "10대", male: 1_140, female: 1_080 },
      { ageGroup: "20대", male: 2_760, female: 3_240 },
      { ageGroup: "30대", male: 3_480, female: 3_610 },
      { ageGroup: "40대", male: 2_840, female: 2_920 },
      { ageGroup: "50대", male: 2_350, female: 2_410 },
      { ageGroup: "60대+", male: 1_980, female: 2_650 },
    ],
  },
  sectorWeekdayWeekendSales: [
    { sector: "한식", weekday: 4_300, weekend: 3_900 },
    { sector: "카페/디저트", weekday: 2_500, weekend: 3_900 },
    { sector: "주점", weekday: 1_800, weekend: 3_300 },
    { sector: "일식", weekday: 2_100, weekend: 1_800 },
    { sector: "분식", weekday: 1_300, weekend: 1_000 },
  ],
  sectorSalesRanking: [
    {
      rank: 1,
      sector: "한식",
      estimatedSales: 8200,
      qoqChange: 5.4,
      storeCount: 142,
      salesPerStore: 58,
    },
    {
      rank: 2,
      sector: "카페/디저트",
      estimatedSales: 6400,
      qoqChange: 8.1,
      storeCount: 188,
      salesPerStore: 34,
    },
    {
      rank: 3,
      sector: "주점",
      estimatedSales: 5100,
      qoqChange: -2.3,
      storeCount: 96,
      salesPerStore: 53,
    },
    {
      rank: 4,
      sector: "일식",
      estimatedSales: 3900,
      qoqChange: 3.6,
      storeCount: 64,
      salesPerStore: 61,
    },
    {
      rank: 5,
      sector: "분식",
      estimatedSales: 2300,
      qoqChange: 1.2,
      storeCount: 78,
      salesPerStore: 29,
    },
  ],
  competition: {
    storeCount: 568,
    franchiseStoreCount: 214,
    openCount: 37,
    closeCount: 29,
  },
  commercialChangeIndicator: {
    code: "LH",
    label: "신규 업체가 경쟁력을 가지는 상권",
    description:
      "생존 사업체의 평균 영업기간은 서울 평균보다 짧고, 폐업 사업체의 평균 영업기간은 서울 평균보다 긴 상권입니다.",
  },
}
