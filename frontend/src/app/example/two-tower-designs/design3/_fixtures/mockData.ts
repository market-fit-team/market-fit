// frontend/src/app/example/two-tower-designs/design3/_fixtures/mockData.ts

/**
 * 업종 정의 인터페이스
 */
export interface Category {
  code: string
  name: string
  emoji: string
  description: string
}

/**
 * 설문 질문 정의 인터페이스
 */
export interface QuestionOption {
  code: string
  label: string
}

export interface Question {
  id: string
  type: "single" | "multi"
  prompt: string
  max_selections?: number
  options: QuestionOption[]
}

/**
 * 상권 정보 인터페이스
 */
export interface CommercialArea {
  id: number
  name: string
  area_profile_type: "residential" | "office" | "commercial" | "mixed"
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
  // Two-Tower 매칭용 벡터 프로필
  vector: {
    budget_level: number
    stability_level: number
    subway_dependency_level: number
    weekend_preference_level: number
    evening_preference_level: number
    resident_focus_level: number
    worker_focus_level: number
    rent_sensitivity_level: number
    competition_tolerance_level: number
  }
}

/**
 * 추천 결과 인터페이스
 */
export interface Recommendation extends CommercialArea {
  rank: number
  score: number
  service_category_name: string
  item_id: string
}

/**
 * 사용자 프로필 인터페이스
 */
export interface UserProfile {
  user_id: string
  profile_name: string
  preferred_category_code: string
  budget_level: number
  stability_level: number
  subway_dependency_level: number
  weekend_preference_level: number
  evening_preference_level: number
  resident_focus_level: number
  worker_focus_level: number
  rent_sensitivity_level: number
  competition_tolerance_level: number
}

// 1. 업종 데이터
export const CATEGORIES: Category[] = [
  {
    code: "CS100001",
    name: "한식음식점",
    emoji: "🍚",
    description: "정갈하고 깊은 맛의 한국 전통 음식점",
  },
  {
    code: "CS100005",
    name: "제과점",
    emoji: "🍞",
    description: "매일 아침 갓 구운 빵과 디저트 베이커리",
  },
  {
    code: "CS100010",
    name: "커피전문점",
    emoji: "☕",
    description: "향긋한 원두 커피와 편안한 휴식 공간",
  },
  {
    code: "CS100007",
    name: "치킨전문점",
    emoji: "🍗",
    description: "겉바속촉 바삭한 치킨과 시원한 맥주",
  },
  {
    code: "CS100009",
    name: "호프-간이주점",
    emoji: "🍺",
    description: "퇴근 후 스트레스를 푸는 요리 주점",
  },
  {
    code: "CS100008",
    name: "분식전문점",
    emoji: "🍢",
    description: "떡볶이, 튀김 등 친숙하고 대중적인 분식",
  },
]

// 2. 10문항 설문 데이터
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "single",
    prompt: "내 가게에 가장 자주 왔으면 하는 손님은 어떤 분인가요?",
    options: [
      { code: "A", label: "집 근처라 자주 오는 동네 주민" },
      { code: "B", label: "점심이나 퇴근길에 들르는 직장인" },
      { code: "C", label: "일부러 찾아오는 목적형 손님" },
      { code: "D", label: "주말에 가족이나 연인과 오는 손님" },
    ],
  },
  {
    id: "q2",
    type: "single",
    prompt: "가게가 가장 바빴으면 하는 시간대는 언제인가요?",
    options: [
      { code: "A", label: "평일 점심" },
      { code: "B", label: "평일 저녁" },
      { code: "C", label: "주말 낮" },
      { code: "D", label: "주말 저녁" },
    ],
  },
  {
    id: "q3",
    type: "single",
    prompt: "자리 고를 때 지하철역과의 거리는 얼마나 중요하다고 느끼시나요?",
    options: [
      { code: "A", label: "역이 가까워야 거의 안심이 된다" },
      { code: "B", label: "가까우면 좋지만 절대 조건은 아니다" },
      { code: "C", label: "크게 신경 쓰지 않는다" },
      { code: "D", label: "골목이나 생활권 안쪽도 괜찮다" },
    ],
  },
  {
    id: "q4",
    type: "single",
    prompt: "창업 초기에 가장 중요하게 생각하는 것은 무엇인가요?",
    options: [
      { code: "A", label: "초기 투자금을 최대한 낮게 시작하는 것" },
      { code: "B", label: "투자금이 들더라도 좋은 자리를 잡는 것" },
      { code: "C", label: "초반 수익이 늦어도 버틸 여유를 남기는 것" },
      { code: "D", label: "빠르게 매출을 만들고 회수하는 것" },
    ],
  },
  {
    id: "q5",
    type: "single",
    prompt: "같은 돈을 쓴다면 어디에 더 쓰고 싶으신가요?",
    options: [
      { code: "A", label: "월세와 보증금 부담을 낮추는 데" },
      { code: "B", label: "월세가 높아도 더 좋은 위치를 잡는 데" },
      { code: "C", label: "운영자금까지 남겨두는 데" },
      { code: "D", label: "초반 홍보와 빠른 자리 잡기에" },
    ],
  },
  {
    id: "q6",
    type: "single",
    prompt: "창업 후 1~2년 동안 어떤 흐름이 더 마음 편할 것 같나요?",
    options: [
      { code: "A", label: "크게 안 벌어도 꾸준히 유지되는 흐름" },
      { code: "B", label: "변동이 있어도 성장 가능성이 큰 흐름" },
      { code: "C", label: "위험은 적지만 확장성도 크지 않은 흐름" },
      { code: "D", label: "리스크가 있더라도 빨리 커질 수 있는 흐름" },
    ],
  },
  {
    id: "q7",
    type: "single",
    prompt: "경쟁이 많은 상권을 보면 어떤 생각이 드나요?",
    options: [
      { code: "A", label: "이미 수요가 검증된 곳이라 오히려 괜찮다" },
      { code: "B", label: "굳이 그 안에서 싸우고 싶지는 않다" },
      { code: "C", label: "내가 더 잘할 수 있다면 들어갈 수 있다" },
      { code: "D", label: "상황을 조금 더 지켜본 뒤 판단하고 싶다" },
    ],
  },
  {
    id: "q8",
    type: "single",
    prompt: "내가 생각하는 좋은 상권은 어떤 모습에 더 가깝나요?",
    options: [
      { code: "A", label: "아파트와 빌라가 많아 생활 수요가 보이는 곳" },
      { code: "B", label: "오피스 건물이 많아 점심과 퇴근 수요가 보이는 곳" },
      { code: "C", label: "역세권이라 유동인구가 계속 흐르는 곳" },
      { code: "D", label: "너무 한쪽으로 치우치지 않은 혼합형 상권" },
    ],
  },
  {
    id: "q9",
    type: "single",
    prompt: "장사가 안 되는 날, 어떤 상황이 가장 불안할 것 같나요?",
    options: [
      { code: "A", label: "평일 점심에 직장인 손님이 안 오는 것" },
      { code: "B", label: "저녁 시간인데 가게가 한산한 것" },
      { code: "C", label: "주말인데 생각보다 조용한 것" },
      { code: "D", label: "며칠 연속으로 전체 흐름이 꺾이는 것" },
    ],
  },
  {
    id: "q10",
    type: "multi",
    max_selections: 3,
    prompt: "자영업을 통해 이루고 싶은 것을 골라주세요.",
    options: [
      { code: "A", label: "안정적인 생활 기반" },
      { code: "B", label: "높은 수익과 확장 가능성" },
      { code: "C", label: "자유로운 시간과 운영 방식" },
      { code: "D", label: "동네에서 오래 인정받는 가게" },
      { code: "E", label: "내 감각이 드러나는 브랜드" },
    ],
  },
]

// 3. 서울 주요 15개 상권 후보 데이터 및 Vector Profile
export const CANDIDATE_AREAS: CommercialArea[] = [
  {
    id: 1,
    name: "망원2동",
    area_profile_type: "residential",
    sales_amount: 1950000000,
    weekend_sales_ratio: 0.52,
    evening_sales_ratio: 0.22,
    resident_population: 23110,
    worker_population: 9110,
    subway_commercial_trend_score: 0.73,
    category_opportunity_score: 0.68,
    demand_gap_score: 0.59,
    vector: {
      budget_level: 0.35,
      stability_level: 0.85,
      subway_dependency_level: 0.45,
      weekend_preference_level: 0.8,
      evening_preference_level: 0.3,
      resident_focus_level: 0.88,
      worker_focus_level: 0.2,
      rent_sensitivity_level: 0.75, // 임대료 민감도가 높은(임대료 부담이 적은 상권을 원하는) 사용자와 일치
      competition_tolerance_level: 0.35,
    },
  },
  {
    id: 2,
    name: "성수1가1동",
    area_profile_type: "mixed",
    sales_amount: 3450000000,
    weekend_sales_ratio: 0.61,
    evening_sales_ratio: 0.45,
    resident_population: 14500,
    worker_population: 28400,
    subway_commercial_trend_score: 0.92,
    category_opportunity_score: 0.85,
    demand_gap_score: 0.72,
    vector: {
      budget_level: 0.85,
      stability_level: 0.45,
      subway_dependency_level: 0.8,
      weekend_preference_level: 0.75,
      evening_preference_level: 0.65,
      resident_focus_level: 0.4,
      worker_focus_level: 0.75,
      rent_sensitivity_level: 0.25, // 높은 임대료 수준
      competition_tolerance_level: 0.9,
    },
  },
  {
    id: 3,
    name: "서교동",
    area_profile_type: "commercial",
    sales_amount: 5120000000,
    weekend_sales_ratio: 0.58,
    evening_sales_ratio: 0.75,
    resident_population: 18200,
    worker_population: 32000,
    subway_commercial_trend_score: 0.95,
    category_opportunity_score: 0.78,
    demand_gap_score: 0.65,
    vector: {
      budget_level: 0.9,
      stability_level: 0.35,
      subway_dependency_level: 0.9,
      weekend_preference_level: 0.65,
      evening_preference_level: 0.85,
      resident_focus_level: 0.25,
      worker_focus_level: 0.6,
      rent_sensitivity_level: 0.2,
      competition_tolerance_level: 0.95,
    },
  },
  {
    id: 4,
    name: "여의동",
    area_profile_type: "office",
    sales_amount: 4890000000,
    weekend_sales_ratio: 0.15,
    evening_sales_ratio: 0.82,
    resident_population: 9400,
    worker_population: 112000,
    subway_commercial_trend_score: 0.88,
    category_opportunity_score: 0.7,
    demand_gap_score: 0.8,
    vector: {
      budget_level: 0.95,
      stability_level: 0.6,
      subway_dependency_level: 0.85,
      weekend_preference_level: 0.1,
      evening_preference_level: 0.9,
      resident_focus_level: 0.15,
      worker_focus_level: 0.95,
      rent_sensitivity_level: 0.15,
      competition_tolerance_level: 0.7,
    },
  },
  {
    id: 5,
    name: "가산동",
    area_profile_type: "office",
    sales_amount: 2850000000,
    weekend_sales_ratio: 0.18,
    evening_sales_ratio: 0.7,
    resident_population: 7800,
    worker_population: 89000,
    subway_commercial_trend_score: 0.78,
    category_opportunity_score: 0.65,
    demand_gap_score: 0.74,
    vector: {
      budget_level: 0.65,
      stability_level: 0.7,
      subway_dependency_level: 0.8,
      weekend_preference_level: 0.15,
      evening_preference_level: 0.78,
      resident_focus_level: 0.2,
      worker_focus_level: 0.9,
      rent_sensitivity_level: 0.45,
      competition_tolerance_level: 0.6,
    },
  },
  {
    id: 6,
    name: "연희동",
    area_profile_type: "residential",
    sales_amount: 1450000000,
    weekend_sales_ratio: 0.55,
    evening_sales_ratio: 0.35,
    resident_population: 19800,
    worker_population: 62000, // 연희 연남 유동 포함 실근무자
    subway_commercial_trend_score: 0.5,
    category_opportunity_score: 0.74,
    demand_gap_score: 0.68,
    vector: {
      budget_level: 0.45,
      stability_level: 0.8,
      subway_dependency_level: 0.25,
      weekend_preference_level: 0.75,
      evening_preference_level: 0.4,
      resident_focus_level: 0.8,
      worker_focus_level: 0.3,
      rent_sensitivity_level: 0.65,
      competition_tolerance_level: 0.45,
    },
  },
  {
    id: 7,
    name: "종로1234가동",
    area_profile_type: "mixed",
    sales_amount: 3950000000,
    weekend_sales_ratio: 0.35,
    evening_sales_ratio: 0.68,
    resident_population: 8500,
    worker_population: 58000,
    subway_commercial_trend_score: 0.85,
    category_opportunity_score: 0.72,
    demand_gap_score: 0.7,
    vector: {
      budget_level: 0.8,
      stability_level: 0.65,
      subway_dependency_level: 0.92,
      weekend_preference_level: 0.38,
      evening_preference_level: 0.75,
      resident_focus_level: 0.3,
      worker_focus_level: 0.8,
      rent_sensitivity_level: 0.35,
      competition_tolerance_level: 0.75,
    },
  },
  {
    id: 8,
    name: "대치4동",
    area_profile_type: "residential",
    sales_amount: 2750000000,
    weekend_sales_ratio: 0.38,
    evening_sales_ratio: 0.4,
    resident_population: 29500,
    worker_population: 14500,
    subway_commercial_trend_score: 0.7,
    category_opportunity_score: 0.82,
    demand_gap_score: 0.6,
    vector: {
      budget_level: 0.7,
      stability_level: 0.9,
      subway_dependency_level: 0.65,
      weekend_preference_level: 0.5,
      evening_preference_level: 0.45,
      resident_focus_level: 0.92,
      worker_focus_level: 0.4,
      rent_sensitivity_level: 0.4,
      competition_tolerance_level: 0.65,
    },
  },
  {
    id: 9,
    name: "잠실본동",
    area_profile_type: "mixed",
    sales_amount: 2600000000,
    weekend_sales_ratio: 0.48,
    evening_sales_ratio: 0.55,
    resident_population: 28000,
    worker_population: 11000,
    subway_commercial_trend_score: 0.8,
    category_opportunity_score: 0.75,
    demand_gap_score: 0.66,
    vector: {
      budget_level: 0.55,
      stability_level: 0.78,
      subway_dependency_level: 0.7,
      weekend_preference_level: 0.65,
      evening_preference_level: 0.6,
      resident_focus_level: 0.75,
      worker_focus_level: 0.35,
      rent_sensitivity_level: 0.55,
      competition_tolerance_level: 0.58,
    },
  },
  {
    id: 10,
    name: "혜화동",
    area_profile_type: "commercial",
    sales_amount: 1850000000,
    weekend_sales_ratio: 0.65,
    evening_sales_ratio: 0.58,
    resident_population: 17500,
    worker_population: 12000,
    subway_commercial_trend_score: 0.82,
    category_opportunity_score: 0.8,
    demand_gap_score: 0.62,
    vector: {
      budget_level: 0.6,
      stability_level: 0.55,
      subway_dependency_level: 0.85,
      weekend_preference_level: 0.82,
      evening_preference_level: 0.6,
      resident_focus_level: 0.45,
      worker_focus_level: 0.35,
      rent_sensitivity_level: 0.5,
      competition_tolerance_level: 0.7,
    },
  },
  {
    id: 11,
    name: "역삼1동",
    area_profile_type: "office",
    sales_amount: 6200000000,
    weekend_sales_ratio: 0.22,
    evening_sales_ratio: 0.78,
    resident_population: 22000,
    worker_population: 165000,
    subway_commercial_trend_score: 0.94,
    category_opportunity_score: 0.75,
    demand_gap_score: 0.88,
    vector: {
      budget_level: 0.98,
      stability_level: 0.5,
      subway_dependency_level: 0.95,
      weekend_preference_level: 0.18,
      evening_preference_level: 0.85,
      resident_focus_level: 0.2,
      worker_focus_level: 0.98,
      rent_sensitivity_level: 0.1,
      competition_tolerance_level: 0.88,
    },
  },
  {
    id: 12,
    name: "연남동",
    area_profile_type: "commercial",
    sales_amount: 2900000000,
    weekend_sales_ratio: 0.68,
    evening_sales_ratio: 0.62,
    resident_population: 15500,
    worker_population: 14000,
    subway_commercial_trend_score: 0.89,
    category_opportunity_score: 0.88,
    demand_gap_score: 0.64,
    vector: {
      budget_level: 0.78,
      stability_level: 0.4,
      subway_dependency_level: 0.75,
      weekend_preference_level: 0.88,
      evening_preference_level: 0.68,
      resident_focus_level: 0.35,
      worker_focus_level: 0.4,
      rent_sensitivity_level: 0.3,
      competition_tolerance_level: 0.85,
    },
  },
  {
    id: 13,
    name: "이태원1동",
    area_profile_type: "commercial",
    sales_amount: 2100000000,
    weekend_sales_ratio: 0.72,
    evening_sales_ratio: 0.8,
    resident_population: 11000,
    worker_population: 8500,
    subway_commercial_trend_score: 0.78,
    category_opportunity_score: 0.7,
    demand_gap_score: 0.58,
    vector: {
      budget_level: 0.75,
      stability_level: 0.3,
      subway_dependency_level: 0.82,
      weekend_preference_level: 0.9,
      evening_preference_level: 0.9,
      resident_focus_level: 0.22,
      worker_focus_level: 0.3,
      rent_sensitivity_level: 0.35,
      competition_tolerance_level: 0.8,
    },
  },
  {
    id: 14,
    name: "목5동",
    area_profile_type: "residential",
    sales_amount: 2450000000,
    weekend_sales_ratio: 0.4,
    evening_sales_ratio: 0.3,
    resident_population: 32000,
    worker_population: 13500,
    subway_commercial_trend_score: 0.65,
    category_opportunity_score: 0.78,
    demand_gap_score: 0.62,
    vector: {
      budget_level: 0.65,
      stability_level: 0.88,
      subway_dependency_level: 0.5,
      weekend_preference_level: 0.55,
      evening_preference_level: 0.35,
      resident_focus_level: 0.95,
      worker_focus_level: 0.35,
      rent_sensitivity_level: 0.45,
      competition_tolerance_level: 0.5,
    },
  },
  {
    id: 15,
    name: "삼청동",
    area_profile_type: "commercial",
    sales_amount: 1100000000,
    weekend_sales_ratio: 0.75,
    evening_sales_ratio: 0.2,
    resident_population: 4800,
    worker_population: 6800,
    subway_commercial_trend_score: 0.4,
    category_opportunity_score: 0.8,
    demand_gap_score: 0.55,
    vector: {
      budget_level: 0.6,
      stability_level: 0.65,
      subway_dependency_level: 0.2,
      weekend_preference_level: 0.95,
      evening_preference_level: 0.18,
      resident_focus_level: 0.55,
      worker_focus_level: 0.45,
      rent_sensitivity_level: 0.5,
      competition_tolerance_level: 0.4,
    },
  },
]

/**
 * 설문 응답을 받아 사용자 프로필 벡터를 계산합니다.
 */
export function calculateProfile(
  categoryCode: string,
  answers: Record<string, string | string[]>
): UserProfile {
  // 기본값 설정 (중간 점수인 0.5)
  let budget = 0.5
  let stability = 0.5
  let subway = 0.5
  let weekend = 0.5
  let evening = 0.5
  let resident = 0.5
  let worker = 0.5
  let rentSensitivity = 0.5
  let competitionTolerance = 0.5

  // Q1: 희망 주 고객층
  const q1 = answers.q1 as string
  if (q1 === "A") {
    resident += 0.2
    worker -= 0.1
  } else if (q1 === "B") {
    worker += 0.2
    resident -= 0.1
  } else if (q1 === "C") {
    competitionTolerance += 0.15
  } else if (q1 === "D") {
    weekend += 0.2
    resident += 0.1
  }

  // Q2: 바쁜 시간대
  const q2 = answers.q2 as string
  if (q2 === "A") {
    worker += 0.15
    weekend -= 0.15
    evening -= 0.15
  } else if (q2 === "B") {
    evening += 0.2
    worker += 0.1
    weekend -= 0.15
  } else if (q2 === "C") {
    weekend += 0.2
    evening -= 0.15
  } else if (q2 === "D") {
    weekend += 0.2
    evening += 0.15
  }

  // Q3: 지하철역 거리 중요도
  const q3 = answers.q3 as string
  if (q3 === "A") {
    subway += 0.25
    rentSensitivity -= 0.15
  } else if (q3 === "B") {
    subway += 0.1
  } else if (q3 === "C") {
    subway -= 0.1
  } else if (q3 === "D") {
    subway -= 0.25
    rentSensitivity += 0.2
  }

  // Q4: 창업 초기 최우선 사항
  const q4 = answers.q4 as string
  if (q4 === "A") {
    budget -= 0.2
    rentSensitivity += 0.2
  } // 적은 투자금 = 낮은 예산 수준, 높은 월세민감도
  else if (q4 === "B") {
    budget += 0.2
    rentSensitivity -= 0.2
  } // 자리가 중요 = 높은 예산 수준, 낮은 월세민감도
  else if (q4 === "C") {
    stability += 0.2
    budget -= 0.1
  } else if (q4 === "D") {
    competitionTolerance += 0.15
    budget += 0.1
  }

  // Q5: 재정 투자 집중 영역
  const q5 = answers.q5 as string
  if (q5 === "A") {
    rentSensitivity += 0.25
    budget -= 0.15
  } else if (q5 === "B") {
    rentSensitivity -= 0.25
    budget += 0.2
  } else if (q5 === "C") {
    stability += 0.15
  } else if (q5 === "D") {
    competitionTolerance += 0.15
  }

  // Q6: 선호하는 운영 흐름
  const q6 = answers.q6 as string
  if (q6 === "A") {
    stability += 0.25
    competitionTolerance -= 0.2
  } else if (q6 === "B") {
    stability -= 0.2
    competitionTolerance += 0.2
  } else if (q6 === "C") {
    stability += 0.2
    competitionTolerance -= 0.25
  } else if (q6 === "D") {
    stability -= 0.25
    competitionTolerance += 0.3
  }

  // Q7: 경쟁 상권에 대한 시각
  const q7 = answers.q7 as string
  if (q7 === "A") {
    competitionTolerance += 0.2
    stability -= 0.1
  } else if (q7 === "B") {
    competitionTolerance -= 0.25
    stability += 0.15
  } else if (q7 === "C") {
    competitionTolerance += 0.3
  } else if (q7 === "D") {
    stability += 0.15
  }

  // Q8: 선호하는 상권 모습
  const q8 = answers.q8 as string
  if (q8 === "A") {
    resident += 0.25
    worker -= 0.15
  } else if (q8 === "B") {
    worker += 0.25
    resident -= 0.15
  } else if (q8 === "C") {
    subway += 0.2
  } else if (q8 === "D") {
    /* 균형 잡힌 혼합 */
  }

  // Q9: 장사 안될 때 가장 불안한 요소
  const q9 = answers.q9 as string
  if (q9 === "A") {
    worker += 0.15
  } else if (q9 === "B") {
    evening += 0.15
  } else if (q9 === "C") {
    weekend += 0.15
  } else if (q9 === "D") {
    stability += 0.15
  }

  // Q10: 최종 목표 (복수 선택 가능)
  const q10 = (answers.q10 as string[]) || []
  q10.forEach((choice) => {
    if (choice === "A") stability += 0.15
    if (choice === "B") {
      competitionTolerance += 0.15
      stability -= 0.1
    }
    if (choice === "C") {
      /* 시간적 자유 */
    }
    if (choice === "D") {
      resident += 0.15
      stability += 0.1
    }
    if (choice === "E") competitionTolerance += 0.15
  })

  // 모든 값은 0.1 ~ 0.95 범위로 제한
  const clamp = (val: number) => Math.max(0.1, Math.min(0.95, val))

  return {
    user_id: "survey_design3_user",
    profile_name: "창업 성향 진단서",
    preferred_category_code: categoryCode,
    budget_level: clamp(budget),
    stability_level: clamp(stability),
    subway_dependency_level: clamp(subway),
    weekend_preference_level: clamp(weekend),
    evening_preference_level: clamp(evening),
    resident_focus_level: clamp(resident),
    worker_focus_level: clamp(worker),
    rent_sensitivity_level: clamp(rentSensitivity),
    competition_tolerance_level: clamp(competitionTolerance),
  }
}

/**
 * 사용자 프로필과 상권 데이터의 유사도를 계산하여 정렬된 추천 목록을 반환합니다 (Two-Tower 모델링 모사)
 */
export function recommendAreas(
  userProfile: Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  >,
  categoryCode: string,
  topK: number = 5
): Recommendation[] {
  const category =
    CATEGORIES.find((c) => c.code === categoryCode) || CATEGORIES[1]

  // 매칭 스코어 계산
  const results = CANDIDATE_AREAS.map((area) => {
    const v = area.vector
    const u = userProfile

    // 각 차원별 편차 제곱합 계산 (유클리드 거리 기반 매칭)
    let distSq = 0
    let weightSum = 0

    // 중요도 가중치 부여 (성향에 따른 다이나믹 임베딩 보정 모사)
    const weights = {
      budget_level: 1.0,
      stability_level: 1.2,
      subway_dependency_level: 1.0,
      weekend_preference_level: 1.1,
      evening_preference_level: 1.1,
      resident_focus_level: 1.3,
      worker_focus_level: 1.3,
      rent_sensitivity_level: 1.2,
      competition_tolerance_level: 1.0,
    } as const

    const keys = [
      "budget_level",
      "stability_level",
      "subway_dependency_level",
      "weekend_preference_level",
      "evening_preference_level",
      "resident_focus_level",
      "worker_focus_level",
      "rent_sensitivity_level",
      "competition_tolerance_level",
    ] as const

    keys.forEach((key) => {
      const diff = u[key] - v[key]
      distSq += diff * diff * weights[key]
      weightSum += weights[key]
    })

    const dist = Math.sqrt(distSq / weightSum)
    // 유사도를 0.0 ~ 1.0 범위로 정규화
    const similarity = Math.max(0.0, 1.0 - dist * 1.5)

    // 점수 변환 (3.0 ~ 4.9 범위로 매칭율 계산)
    // area.id에 따른 미세 편차를 추가하여 항상 고유하고 정밀한 실수 반환
    const deterministicNoise = (area.id * 0.0123) % 0.05
    const score = parseFloat(
      (3.0 + similarity * 1.8 + deterministicNoise).toFixed(6)
    )

    return {
      ...area,
      score,
      service_category_name: category.name,
      item_id: `${area.id * 1000000 + 536}:${category.code}`,
    }
  })

  // 내림차순 정렬 및 랭킹 매기기
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }))
}

/**
 * 설문 답변 상태를 URL에 포함하기 좋도록 16자리 문자열로 암호화/인코딩합니다.
 * 포맷: c[categoryIdx]q[q1][q2]...[q9]m[q10_bitmask][padding]
 * 길이: 2(category) + 10(q1-q9) + 3(q10) + 1(padding) = 16자리
 */
export function encodeAnswers(
  categoryCode: string,
  answers: Record<string, string | string[]>
): string {
  const catIdx = CATEGORIES.findIndex((c) => c.code === categoryCode)
  const catChar = catIdx >= 0 ? catIdx.toString() : "0"

  let qStr = ""
  for (let i = 1; i <= 9; i++) {
    const val = answers[`q${i}`] as string
    // A=0, B=1, C=2, D=3
    const num =
      val === "A"
        ? "0"
        : val === "B"
          ? "1"
          : val === "C"
            ? "2"
            : val === "D"
              ? "3"
              : "0"
    qStr += num
  }

  // q10 멀티 초이스 비트맵화
  const q10 = (answers.q10 as string[]) || []
  let mask = 0
  if (q10.includes("A")) mask |= 1
  if (q10.includes("B")) mask |= 2
  if (q10.includes("C")) mask |= 4
  if (q10.includes("D")) mask |= 8
  if (q10.includes("E")) mask |= 16

  // 2자리 숫자로 포맷팅 (00~31)
  const maskStr = mask.toString().padStart(2, "0")

  // 총 15자리에 z 패딩 붙여서 16글자 완성
  return `c${catChar}q${qStr}m${maskStr}z`
}

/**
 * 16자리 코드를 풀어 설문 답변 상태를 복원합니다.
 */
export function decodeAnswers(code: string): {
  categoryCode: string
  answers: Record<string, string | string[]>
} {
  // 비정상적인 코드인 경우 기본값 반환 (요청응답모음.md의 기본 예시)
  const fallback = {
    categoryCode: "CS100005",
    answers: {
      q1: "A",
      q2: "C",
      q3: "D",
      q4: "A",
      q5: "C",
      q6: "A",
      q7: "B",
      q8: "A",
      q9: "D",
      q10: ["A", "D"],
    },
  }

  if (!code || code.length !== 16 || !code.startsWith("c")) {
    return fallback
  }

  try {
    const catIdx = parseInt(code[1])
    const categoryCode = CATEGORIES[catIdx]?.code || "CS100005"

    const answers: Record<string, string | string[]> = {}
    const optionMap = ["A", "B", "C", "D"]

    for (let i = 1; i <= 9; i++) {
      const charIdx = parseInt(code[2 + i]) // qStr 시작은 index 3
      answers[`q${i}`] = optionMap[charIdx] || "A"
    }

    // q10 마스크 복원
    const mask = parseInt(code.substring(13, 15))
    const q10: string[] = []
    if ((mask & 1) !== 0) q10.push("A")
    if ((mask & 2) !== 0) q10.push("B")
    if ((mask & 4) !== 0) q10.push("C")
    if ((mask & 8) !== 0) q10.push("D")
    if ((mask & 16) !== 0) q10.push("E")
    answers.q10 = q10

    return {
      categoryCode,
      answers,
    }
  } catch {
    return fallback
  }
}
