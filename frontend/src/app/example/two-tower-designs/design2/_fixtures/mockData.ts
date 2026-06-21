import type {
  RecommendationItem,
  UserProfile,
} from "@/app/example/two-tower/_components/two-tower-types"

/**
 * 선호 업종 코드 정의
 */
export const CATEGORY_OPTIONS = [
  { code: "CS100001", label: "한식음식점" },
  { code: "CS100005", label: "제과점" },
  { code: "CS100009", label: "커피전문점" },
  { code: "CS100010", label: "패스트푸드점" },
  { code: "CS200001", label: "일반미용업" },
] as const

/**
 * 각 질문의 답변별 지표 가중치 매핑 구조체
 */
export interface QuestionOption {
  code: string
  label: string
  // 해당 답변 선택 시 프로필 지표에 기여하는 정도 (0.0 ~ 1.0)
  weights: Partial<
    Record<
      keyof Omit<
        UserProfile,
        "user_id" | "profile_name" | "preferred_category_code"
      >,
      number
    >
  >
}

export interface Question {
  id: string
  type: "single" | "multi"
  max_selections?: number
  question: string
  options: QuestionOption[]
}

/**
 * 10가지 창업 성향 질문 정의 리스트
 */
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "single",
    question: "내 가게에 가장 자주 왔으면 하는 손님은 어떤 분인가요?",
    options: [
      {
        code: "A",
        label: "집 근처라 자주 오는 동네 주민",
        weights: {
          resident_focus_level: 0.9,
          stability_level: 0.7,
          worker_focus_level: 0.1,
        },
      },
      {
        code: "B",
        label: "점심이나 퇴근길에 들르는 직장인",
        weights: {
          worker_focus_level: 0.9,
          evening_preference_level: 0.6,
          resident_focus_level: 0.2,
        },
      },
      {
        code: "C",
        label: "일부러 찾아오는 목적형 손님",
        weights: {
          competition_tolerance_level: 0.8,
          rent_sensitivity_level: -0.3,
          subway_dependency_level: 0.3,
        },
      },
      {
        code: "D",
        label: "주말에 가족이나 연인과 오는 손님",
        weights: {
          weekend_preference_level: 0.9,
          resident_focus_level: 0.5,
          evening_preference_level: 0.3,
        },
      },
    ],
  },
  {
    id: "q2",
    type: "single",
    question: "가게가 가장 바빴으면 하는 시간대는 언제인가요?",
    options: [
      {
        code: "A",
        label: "평일 점심",
        weights: {
          worker_focus_level: 0.8,
          evening_preference_level: 0.1,
          weekend_preference_level: 0.1,
        },
      },
      {
        code: "B",
        label: "평일 저녁",
        weights: {
          evening_preference_level: 0.9,
          worker_focus_level: 0.7,
          weekend_preference_level: 0.2,
        },
      },
      {
        code: "C",
        label: "주말 낮",
        weights: {
          weekend_preference_level: 0.9,
          resident_focus_level: 0.7,
          evening_preference_level: 0.2,
        },
      },
      {
        code: "D",
        label: "주말 저녁",
        weights: {
          weekend_preference_level: 0.8,
          evening_preference_level: 0.8,
          rent_sensitivity_level: -0.2,
        },
      },
    ],
  },
  {
    id: "q3",
    type: "single",
    question: "자리 고를 때 지하철역과의 거리는 얼마나 중요하다고 느끼시나요?",
    options: [
      {
        code: "A",
        label: "역이 가까워야 거의 안심이 된다",
        weights: { subway_dependency_level: 0.9, rent_sensitivity_level: 0.8 },
      },
      {
        code: "B",
        label: "가까우면 좋지만 절대 조건은 아니다",
        weights: { subway_dependency_level: 0.5, rent_sensitivity_level: 0.4 },
      },
      {
        code: "C",
        label: "크게 신경 쓰지 않는다",
        weights: { subway_dependency_level: 0.1, rent_sensitivity_level: 0.1 },
      },
      {
        code: "D",
        label: "골목이나 생활권 안쪽도 괜찮다",
        weights: {
          subway_dependency_level: 0.0,
          resident_focus_level: 0.8,
          stability_level: 0.6,
        },
      },
    ],
  },
  {
    id: "q4",
    type: "single",
    question: "창업 초기에 가장 중요하게 생각하는 것은 무엇인가요?",
    options: [
      {
        code: "A",
        label: "초기 투자금을 최대한 낮게 시작하는 것",
        weights: {
          budget_level: 0.9,
          rent_sensitivity_level: 0.9,
          stability_level: 0.8,
        },
      },
      {
        code: "B",
        label: "투자금이 들더라도 좋은 자리를 잡는 것",
        weights: {
          budget_level: 0.2,
          rent_sensitivity_level: 0.1,
          subway_dependency_level: 0.8,
          competition_tolerance_level: 0.7,
        },
      },
      {
        code: "C",
        label: "초반 수익이 늦어도 버틸 여유를 남기는 것",
        weights: { stability_level: 0.9, budget_level: 0.6 },
      },
      {
        code: "D",
        label: "빠르게 매출을 만들고 회수하는 것",
        weights: {
          competition_tolerance_level: 0.9,
          stability_level: 0.2,
          worker_focus_level: 0.6,
        },
      },
    ],
  },
  {
    id: "q5",
    type: "single",
    question: "같은 돈을 쓴다면 어디에 더 쓰고 싶으신가요?",
    options: [
      {
        code: "A",
        label: "월세와 보증금 부담을 낮추는 데",
        weights: { rent_sensitivity_level: 0.9, stability_level: 0.7 },
      },
      {
        code: "B",
        label: "월세가 높아도 더 좋은 위치를 잡는 데",
        weights: {
          rent_sensitivity_level: 0.1,
          subway_dependency_level: 0.9,
          competition_tolerance_level: 0.8,
        },
      },
      {
        code: "C",
        label: "운영자금까지 남겨두는 데",
        weights: { stability_level: 0.9, budget_level: 0.8 },
      },
      {
        code: "D",
        label: "초반 홍보와 빠른 자리 잡기에",
        weights: { competition_tolerance_level: 0.7, worker_focus_level: 0.5 },
      },
    ],
  },
  {
    id: "q6",
    type: "single",
    question: "창업 후 1~2년 동안 어떤 흐름이 더 마음 편할 것 같나요?",
    options: [
      {
        code: "A",
        label: "크게 안 벌어도 꾸준히 유지되는 흐름",
        weights: { stability_level: 0.9, competition_tolerance_level: 0.1 },
      },
      {
        code: "B",
        label: "변동이 있어도 성장 가능성이 큰 흐름",
        weights: { stability_level: 0.2, competition_tolerance_level: 0.9 },
      },
      {
        code: "C",
        label: "위험은 적지만 확장성도 크지 않은 흐름",
        weights: { stability_level: 0.8, competition_tolerance_level: 0.2 },
      },
      {
        code: "D",
        label: "리스크가 있더라도 빨리 커질 수 있는 흐름",
        weights: {
          stability_level: 0.1,
          competition_tolerance_level: 0.9,
          budget_level: 0.3,
        },
      },
    ],
  },
  {
    id: "q7",
    type: "single",
    question: "경쟁이 많은 상권을 보면 어떤 생각이 드나요?",
    options: [
      {
        code: "A",
        label: "이미 수요가 검증된 곳이라 오히려 괜찮다",
        weights: {
          competition_tolerance_level: 0.8,
          subway_dependency_level: 0.7,
        },
      },
      {
        code: "B",
        label: "굳이 그 안에서 싸우고 싶지는 않다",
        weights: {
          competition_tolerance_level: 0.1,
          stability_level: 0.8,
          rent_sensitivity_level: 0.7,
        },
      },
      {
        code: "C",
        label: "내가 더 잘할 수 있다면 들어갈 수 있다",
        weights: {
          competition_tolerance_level: 0.9,
          rent_sensitivity_level: 0.3,
        },
      },
      {
        code: "D",
        label: "상황을 조금 더 지켜본 뒤 판단하고 싶다",
        weights: { stability_level: 0.7, competition_tolerance_level: 0.4 },
      },
    ],
  },
  {
    id: "q8",
    type: "single",
    question: "내가 생각하는 좋은 상권은 어떤 모습에 더 가깝나요?",
    options: [
      {
        code: "A",
        label: "아파트와 빌라가 많아 생활 수요가 보이는 곳",
        weights: {
          resident_focus_level: 0.9,
          stability_level: 0.7,
          worker_focus_level: 0.1,
        },
      },
      {
        code: "B",
        label: "오피스 건물이 많아 점심과 퇴근 수요가 보이는 곳",
        weights: {
          worker_focus_level: 0.9,
          evening_preference_level: 0.6,
          resident_focus_level: 0.1,
        },
      },
      {
        code: "C",
        label: "역세권이라 유동인구가 계속 흐르는 곳",
        weights: {
          subway_dependency_level: 0.9,
          competition_tolerance_level: 0.7,
        },
      },
      {
        code: "D",
        label: "너무 한쪽으로 치우치지 않은 혼합형 상권",
        weights: {
          resident_focus_level: 0.5,
          worker_focus_level: 0.5,
          subway_dependency_level: 0.5,
        },
      },
    ],
  },
  {
    id: "q9",
    type: "single",
    question: "장사가 안 되는 날, 어떤 상황이 가장 불안할 것 같나요?",
    options: [
      {
        code: "A",
        label: "평일 점심에 직장인 손님이 안 오는 것",
        weights: { worker_focus_level: 0.8 },
      },
      {
        code: "B",
        label: "저녁 시간인데 가게가 한산한 것",
        weights: { evening_preference_level: 0.8 },
      },
      {
        code: "C",
        label: "주말인데 생각보다 조용한 것",
        weights: { weekend_preference_level: 0.8 },
      },
      {
        code: "D",
        label: "며칠 연속으로 전체 흐름이 꺾이는 것",
        weights: { stability_level: 0.9 },
      },
    ],
  },
  {
    id: "q10",
    type: "multi",
    max_selections: 3,
    question: "자영업을 통해 이루고 싶은 것을 골라주세요.",
    options: [
      {
        code: "A",
        label: "안정적인 생활 기반",
        weights: { stability_level: 0.9, rent_sensitivity_level: 0.6 },
      },
      {
        code: "B",
        label: "높은 수익과 확장 가능성",
        weights: { competition_tolerance_level: 0.9, budget_level: 0.4 },
      },
      {
        code: "C",
        label: "자유로운 시간과 운영 방식",
        weights: { rent_sensitivity_level: 0.5 },
      },
      {
        code: "D",
        label: "동네에서 오래 인정받는 가게",
        weights: { resident_focus_level: 0.9, stability_level: 0.8 },
      },
      {
        code: "E",
        label: "내 감각이 드러나는 브랜드",
        weights: {
          competition_tolerance_level: 0.7,
          subway_dependency_level: 0.5,
        },
      },
    ],
  },
]

/**
 * 상권 후보군 데이터셋 정의
 */
export interface CommercialArea {
  item_id: string
  area_name: string
  area_profile_type: "residential" | "office" | "active" | "mixed"
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
  // 상권 고유 지표 벡터 (사용자 매칭용)
  vector: Record<
    keyof Omit<
      UserProfile,
      "user_id" | "profile_name" | "preferred_category_code"
    >,
    number
  >
}

export const COMMERCIAL_AREAS: CommercialArea[] = [
  {
    item_id: "AREA_01",
    area_name: "망원2동",
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
      budget_level: 0.3,
      stability_level: 0.8,
      subway_dependency_level: 0.4,
      weekend_preference_level: 0.75,
      evening_preference_level: 0.3,
      resident_focus_level: 0.85,
      worker_focus_level: 0.25,
      rent_sensitivity_level: 0.65,
      competition_tolerance_level: 0.4,
    },
  },
  {
    item_id: "AREA_02",
    area_name: "여의동",
    area_profile_type: "office",
    sales_amount: 5400000000,
    weekend_sales_ratio: 0.08,
    evening_sales_ratio: 0.38,
    resident_population: 8200,
    worker_population: 142000,
    subway_commercial_trend_score: 0.95,
    category_opportunity_score: 0.72,
    demand_gap_score: 0.78,
    vector: {
      budget_level: 0.8,
      stability_level: 0.5,
      subway_dependency_level: 0.9,
      weekend_preference_level: 0.1,
      evening_preference_level: 0.65,
      resident_focus_level: 0.15,
      worker_focus_level: 0.95,
      rent_sensitivity_level: 0.2,
      competition_tolerance_level: 0.85,
    },
  },
  {
    item_id: "AREA_03",
    area_name: "서교동(홍대)",
    area_profile_type: "active",
    sales_amount: 6800000000,
    weekend_sales_ratio: 0.58,
    evening_sales_ratio: 0.75,
    resident_population: 15400,
    worker_population: 48900,
    subway_commercial_trend_score: 0.98,
    category_opportunity_score: 0.88,
    demand_gap_score: 0.82,
    vector: {
      budget_level: 0.9,
      stability_level: 0.25,
      subway_dependency_level: 0.95,
      weekend_preference_level: 0.88,
      evening_preference_level: 0.9,
      resident_focus_level: 0.3,
      worker_focus_level: 0.6,
      rent_sensitivity_level: 0.15,
      competition_tolerance_level: 0.95,
    },
  },
  {
    item_id: "AREA_04",
    area_name: "진관동(은평뉴타운)",
    area_profile_type: "residential",
    sales_amount: 1250000000,
    weekend_sales_ratio: 0.44,
    evening_sales_ratio: 0.18,
    resident_population: 31200,
    worker_population: 5800,
    subway_commercial_trend_score: 0.35,
    category_opportunity_score: 0.54,
    demand_gap_score: 0.42,
    vector: {
      budget_level: 0.2,
      stability_level: 0.95,
      subway_dependency_level: 0.2,
      weekend_preference_level: 0.6,
      evening_preference_level: 0.25,
      resident_focus_level: 0.95,
      worker_focus_level: 0.1,
      rent_sensitivity_level: 0.85,
      competition_tolerance_level: 0.2,
    },
  },
  {
    item_id: "AREA_05",
    area_name: "역삼1동",
    area_profile_type: "mixed",
    sales_amount: 8200000000,
    weekend_sales_ratio: 0.24,
    evening_sales_ratio: 0.62,
    resident_population: 34100,
    worker_population: 185000,
    subway_commercial_trend_score: 0.97,
    category_opportunity_score: 0.85,
    demand_gap_score: 0.91,
    vector: {
      budget_level: 0.85,
      stability_level: 0.4,
      subway_dependency_level: 0.9,
      weekend_preference_level: 0.3,
      evening_preference_level: 0.8,
      resident_focus_level: 0.4,
      worker_focus_level: 0.9,
      rent_sensitivity_level: 0.25,
      competition_tolerance_level: 0.8,
    },
  },
  {
    item_id: "AREA_06",
    area_name: "성수동1가",
    area_profile_type: "active",
    sales_amount: 3800000000,
    weekend_sales_ratio: 0.54,
    evening_sales_ratio: 0.48,
    resident_population: 12200,
    worker_population: 26500,
    subway_commercial_trend_score: 0.82,
    category_opportunity_score: 0.79,
    demand_gap_score: 0.71,
    vector: {
      budget_level: 0.6,
      stability_level: 0.35,
      subway_dependency_level: 0.7,
      weekend_preference_level: 0.8,
      evening_preference_level: 0.55,
      resident_focus_level: 0.35,
      worker_focus_level: 0.55,
      rent_sensitivity_level: 0.35,
      competition_tolerance_level: 0.85,
    },
  },
  {
    item_id: "AREA_07",
    area_name: "목5동",
    area_profile_type: "residential",
    sales_amount: 2200000000,
    weekend_sales_ratio: 0.42,
    evening_sales_ratio: 0.25,
    resident_population: 42100,
    worker_population: 12000,
    subway_commercial_trend_score: 0.62,
    category_opportunity_score: 0.61,
    demand_gap_score: 0.52,
    vector: {
      budget_level: 0.4,
      stability_level: 0.85,
      subway_dependency_level: 0.5,
      weekend_preference_level: 0.62,
      evening_preference_level: 0.32,
      resident_focus_level: 0.88,
      worker_focus_level: 0.28,
      rent_sensitivity_level: 0.55,
      competition_tolerance_level: 0.35,
    },
  },
  {
    item_id: "AREA_08",
    area_name: "가산동",
    area_profile_type: "office",
    sales_amount: 4100000000,
    weekend_sales_ratio: 0.12,
    evening_sales_ratio: 0.52,
    resident_population: 18100,
    worker_population: 114000,
    subway_commercial_trend_score: 0.88,
    category_opportunity_score: 0.71,
    demand_gap_score: 0.76,
    vector: {
      budget_level: 0.7,
      stability_level: 0.6,
      subway_dependency_level: 0.82,
      weekend_preference_level: 0.15,
      evening_preference_level: 0.72,
      resident_focus_level: 0.25,
      worker_focus_level: 0.88,
      rent_sensitivity_level: 0.45,
      competition_tolerance_level: 0.68,
    },
  },
]

/**
 * 사용자의 설문 답변을 기반으로 9대 프로필 지표를 계산하는 함수
 */
export const calculateUserProfile = (
  answers: Record<string, string | string[]>,
  categoryCode: string,
  profileName = "설문 결과 프로필"
): UserProfile => {
  // 기본값 설정
  const result: Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  > = {
    budget_level: 0.5,
    stability_level: 0.5,
    subway_dependency_level: 0.5,
    weekend_preference_level: 0.5,
    evening_preference_level: 0.5,
    resident_focus_level: 0.5,
    worker_focus_level: 0.5,
    rent_sensitivity_level: 0.5,
    competition_tolerance_level: 0.5,
  }

  // 각 지표의 누적 점수와 카운트
  const accumulator: Record<
    keyof typeof result,
    { total: number; count: number }
  > = {
    budget_level: { total: 0, count: 0 },
    stability_level: { total: 0, count: 0 },
    subway_dependency_level: { total: 0, count: 0 },
    weekend_preference_level: { total: 0, count: 0 },
    evening_preference_level: { total: 0, count: 0 },
    resident_focus_level: { total: 0, count: 0 },
    worker_focus_level: { total: 0, count: 0 },
    rent_sensitivity_level: { total: 0, count: 0 },
    competition_tolerance_level: { total: 0, count: 0 },
  }

  // 1~10번 답변 파싱 및 가중치 반영
  QUESTIONS.forEach((q) => {
    const answer = answers[q.id]
    if (!answer) return

    if (q.type === "single" && typeof answer === "string") {
      const selectedOption = q.options.find((opt) => opt.code === answer)
      if (selectedOption) {
        Object.entries(selectedOption.weights).forEach(([key, value]) => {
          const k = key as keyof typeof result
          if (value !== undefined) {
            accumulator[k].total += value
            accumulator[k].count++
          }
        })
      }
    } else if (q.type === "multi" && Array.isArray(answer)) {
      answer.forEach((code) => {
        const selectedOption = q.options.find((opt) => opt.code === code)
        if (selectedOption) {
          Object.entries(selectedOption.weights).forEach(([key, value]) => {
            const k = key as keyof typeof result
            if (value !== undefined) {
              accumulator[k].total += value
              accumulator[k].count++
            }
          })
        }
      })
    }
  })

  // 평균 계산 및 결과 주입 (기본값 0.5에서 시작해 답변 가중치 기반으로 조정)
  Object.keys(result).forEach((key) => {
    const k = key as keyof typeof result
    const acc = accumulator[k]
    if (acc.count > 0) {
      // 0과 1 사이로 정규화
      const avg = acc.total / acc.count
      result[k] = Math.max(0.0, Math.min(1.0, Number(avg.toFixed(2))))
    }
  })

  return {
    user_id: "survey_user_" + Math.random().toString(36).substring(2, 9),
    profile_name: profileName,
    preferred_category_code: categoryCode,
    ...result,
  }
}

/**
 * 유저 프로필 지표와 상권 벡터 간 매칭 점수를 구하는 함수 (유클리디안 거리 기반 유사도 계산)
 */
export const calculateMatchScore = (
  userProfile: UserProfile,
  area: CommercialArea
): number => {
  const keys: Array<
    keyof Omit<
      UserProfile,
      "user_id" | "profile_name" | "preferred_category_code"
    >
  > = [
    "budget_level",
    "stability_level",
    "subway_dependency_level",
    "weekend_preference_level",
    "evening_preference_level",
    "resident_focus_level",
    "worker_focus_level",
    "rent_sensitivity_level",
    "competition_tolerance_level",
  ]

  let sumSquaredDiff = 0
  keys.forEach((key) => {
    const uVal = userProfile[key] ?? 0.5
    const aVal = area.vector[key] ?? 0.5
    sumSquaredDiff += Math.pow(uVal - aVal, 2)
  })

  const distance = Math.sqrt(sumSquaredDiff)
  // 최대 거리는 sqrt(9) = 3 임. 유사도 = 1 - (거리 / 3)
  const similarity = 1 - distance / 3

  // 3.582114 형태의 원본 score와 유사하게 만들기 위해 스케일링 수행 (2.5 ~ 4.5 범위)
  return 2.0 + similarity * 2.5
}

/**
 * 문자열 해시를 통해 0.0 ~ 1.0 사이의 시드 값을 얻는 함수
 */
const getSeedFromCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) / 2147483647
}

/**
 * LCG(Linear Congruential Generator) 기반 결정론적 난수 생성기
 */
const makePRNG = (seed: number) => {
  let state = Math.floor(seed * 1000000)
  return () => {
    const x = Math.sin(state++) * 10000
    return x - Math.floor(x)
  }
}

/**
 * profile_code가 주어졌을 때 일관된 응답 결과를 결정론적으로 복구하는 함수
 */
export const getDeterministicProfileAndPrediction = (
  profileCode: string,
  preferredCategoryCode = "CS100005"
) => {
  const seed = getSeedFromCode(profileCode)
  const random = makePRNG(seed)

  // 1~9번 질문에 대한 임의의 답변 결정론적 선택
  const answers: Record<string, string | string[]> = {}
  QUESTIONS.forEach((q) => {
    if (q.type === "single") {
      const idx = Math.floor(random() * q.options.length)
      answers[q.id] = q.options[idx].code
    } else {
      // q10의 경우 1~3개 다중 선택
      const numSelections = Math.floor(random() * 3) + 1
      const shuffledOptions = [...q.options].sort(() => random() - 0.5)
      answers[q.id] = shuffledOptions.slice(0, numSelections).map((o) => o.code)
    }
  })

  // 카테고리 코드 결정론적 선택 (입력된게 없을 경우)
  const finalCategory =
    preferredCategoryCode ||
    CATEGORY_OPTIONS[Math.floor(random() * CATEGORY_OPTIONS.length)].code

  const profile = calculateUserProfile(
    answers,
    finalCategory,
    "공유 링크 분석 프로필"
  )
  profile.user_id = `survey_shared_${profileCode}`

  // 상권 매칭 점수 계산
  const recommendations: RecommendationItem[] = COMMERCIAL_AREAS.map((area) => {
    const rawScore = calculateMatchScore(profile, area)

    // 업종명 가져오기
    const catOpt = CATEGORY_OPTIONS.find((o) => o.code === finalCategory)
    const categoryName = catOpt ? catOpt.label : "서비스점"

    return {
      rank: 0,
      score: rawScore,
      item_id: `${area.item_id}:${finalCategory}`,
      area_name: area.area_name,
      service_category_name: categoryName,
      area_profile_type: area.area_profile_type,
      sales_amount: area.sales_amount,
      weekend_sales_ratio: area.weekend_sales_ratio,
      evening_sales_ratio: area.evening_sales_ratio,
      resident_population: area.resident_population,
      worker_population: area.worker_population,
      subway_commercial_trend_score: area.subway_commercial_trend_score,
      category_opportunity_score: area.category_opportunity_score,
      demand_gap_score: area.demand_gap_score,
    }
  })
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }))

  return {
    profile: {
      auth_user_uuid: null,
      profile_code: profileCode,
      profile_schema_version: 3,
      survey_response_id: 100 + Math.floor(seed * 1000),
      survey_slug: "founder-fit-10-final",
      survey_version: 1,
      survey_code: "A",
      scoring_version: "founder_fit_v1",
      share_path: `/example/two-tower-designs/design2/${profileCode}`,
      share_url: `http://localhost:3000/example/two-tower-designs/design2/${profileCode}`,
      source: "shared_url",
      updated_at: new Date(2026, 5, 21, 12, 0, 0).toISOString(),
      raw_answers: answers,
      user_profile: profile,
    },
    prediction: {
      trained_at: new Date(2026, 5, 21, 11, 22, 33).toISOString(),
      model_signature: `onboarding_two_tower:mock_${profileCode}`,
      top_k: 5,
      profile_code: profileCode,
      profile_schema_version: 3,
      survey_code: "A",
      share_path: `/example/two-tower-designs/design2/${profileCode}`,
      share_url: `http://localhost:3000/example/two-tower-designs/design2/${profileCode}`,
      user_profile: profile,
      recommendations: recommendations.slice(0, 5),
    },
  }
}
