export type IndustryMinorOption = {
  code: string
  name: string
}

export type IndustryMajorOption = {
  code: string
  minors: IndustryMinorOption[]
  name: string
}

// 업종 코드 API가 붙기 전까지 검색/필터 UI 확인에 사용하는 임시 업종 그룹이다.
export const industryFilterOptions = [
  {
    code: "CS100000",
    name: "외식업",
    minors: [{ code: "CS100003", name: "일식음식점" }],
  },
] satisfies IndustryMajorOption[]

export const getIndustryCode = ({
  selectedMinorCategory,
}: {
  selectedMajorCategory: string
  selectedMinorCategory: string
}) => {
  if (selectedMinorCategory !== "all") {
    return selectedMinorCategory
  }

  return undefined
}

export const getIndustryInitialState = (industryCode: string) => {
  const majorOption = industryFilterOptions.find((option) =>
    option.minors.some((minor) => minor.code === industryCode)
  )

  if (majorOption) {
    return {
      selectedMajorCategory: majorOption.code,
      selectedMinorCategory: industryCode,
    }
  }

  const isMajorCode = industryFilterOptions.some(
    (option) => option.code === industryCode
  )

  return {
    selectedMajorCategory: isMajorCode ? industryCode : "all",
    selectedMinorCategory: "all",
  }
}
