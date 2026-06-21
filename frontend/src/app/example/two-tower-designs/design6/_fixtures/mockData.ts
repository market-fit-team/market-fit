// 업종(카테고리) 정의 인터페이스
export interface Category {
  code: string
  name: string
  emoji: string
  description: string
}

// 설문 질문 및 옵션 정의 인터페이스
export interface QuestionOption {
  code: string
  label: string
}

export interface Question {
  id: string
  selection_type: "single" | "multi"
  prompt: string
  max_selections: number | null
  options: QuestionOption[]
}

// 상권 데이터 정의 인터페이스
export interface AreaData {
  area_name: string
  area_profile_type: "residential" | "office" | "subway" | "mixed"
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
}

// 추천 상권 최종 아웃풋 인터페이스
export interface Recommendation {
  rank: number
  score: number
  item_id: string // area_name과 category_code 조합
  area_name: string
  service_category_name: string
  area_profile_type: "residential" | "office" | "subway" | "mixed"
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
}

// 사용자 지표 점수 인터페이스
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

// 설문 응답 결과 데이터 구조
export interface SurveyResponsePayload {
  preferred_category_code: string
  profile_name: string
  answers: {
    [questionId: string]: string | string[]
  }
}

// 결과 조회용 최종 응답 구조
export interface FullSurveyResult {
  survey: {
    id: number
    slug: string
    version: number
    survey_code: string
    scoring_version: string
    title: string
    description: string
    question_count: number
  }
  survey_response_id: number
  profile: {
    auth_user_uuid: string | null
    profile_code: string
    profile_schema_version: number
    survey_response_id: number
    survey_slug: string
    survey_version: number
    survey_code: string
    scoring_version: string
    share_path: string
    share_url: string
    source: string
    updated_at: string
    raw_answers: {
      [questionId: string]: string | string[]
    }
    user_profile: UserProfile
  }
  prediction: {
    trained_at: string
    model_signature: string
    top_k: number
    profile_code: string
    profile_schema_version: number
    survey_code: string
    share_path: string
    share_url: string
    user_profile: UserProfile
    recommendations: Recommendation[]
  }
}

// 업종 카테고리 정의
export const CATEGORIES: Category[] = [
  {
    code: "CS100001",
    name: "한식음식점",
    emoji: "🍚",
    description: "정갈하고 든든한 한국 전통 식사 전문점",
  },
  {
    code: "CS100005",
    name: "제과점",
    emoji: "🍞",
    description: "아침을 깨우는 고소한 베이커리와 구움과자 전문점",
  },
  {
    code: "CS100010",
    name: "커피전문점",
    emoji: "☕",
    description: "깊은 풍미의 원두커피와 여유로운 힐링 공간",
  },
  {
    code: "CS100007",
    name: "치킨전문점",
    emoji: "🍗",
    description: "바삭하고 고소한 치킨과 온 가족이 즐기는 간식",
  },
  {
    code: "CS100008",
    name: "분식전문점",
    emoji: "🍢",
    description: "매콤한 떡볶이와 바삭한 튀김 등 대중적인 분식",
  },
  {
    code: "CS100009",
    name: "호프-간이주점",
    emoji: "🍺",
    description: "하루의 피로를 풀어내는 캐주얼하고 유쾌한 요리 주점",
  },
]

// 설문 질문 목록
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    selection_type: "single",
    prompt: "내 가게에 가장 자주 왔으면 하는 손님은 어떤 분인가요?",
    max_selections: null,
    options: [
      { code: "A", label: "집 근처라 자주 오는 동네 주민" },
      { code: "B", label: "점심이나 퇴근길에 들르는 직장인" },
      { code: "C", label: "일부러 찾아오는 목적형 손님" },
      { code: "D", label: "주말에 가족이나 연인과 오는 손님" },
    ],
  },
  {
    id: "q2",
    selection_type: "single",
    prompt: "가게가 가장 바빴으면 하는 시간대는 언제인가요?",
    max_selections: null,
    options: [
      { code: "A", label: "평일 점심" },
      { code: "B", label: "평일 저녁" },
      { code: "C", label: "주말 낮" },
      { code: "D", label: "주말 저녁" },
    ],
  },
  {
    id: "q3",
    selection_type: "single",
    prompt: "자리 고를 때 지하철역과의 거리는 얼마나 중요하다고 느끼시나요?",
    max_selections: null,
    options: [
      { code: "A", label: "역이 가까워야 거의 안심이 된다" },
      { code: "B", label: "가까우면 좋지만 절대 조건은 아니다" },
      { code: "C", label: "크게 신경 쓰지 않는다" },
      { code: "D", label: "골목이나 생활권 안쪽도 괜찮다" },
    ],
  },
  {
    id: "q4",
    selection_type: "single",
    prompt: "창업 초기에 가장 중요하게 생각하는 것은 무엇인가요?",
    max_selections: null,
    options: [
      { code: "A", label: "초기 투자금을 최대한 낮게 시작하는 것" },
      { code: "B", label: "투자금이 들더라도 좋은 자리를 잡는 것" },
      { code: "C", label: "초반 수익이 늦어도 버틸 여유를 남기는 것" },
      { code: "D", label: "빠르게 매출을 만들고 회수하는 것" },
    ],
  },
  {
    id: "q5",
    selection_type: "single",
    prompt: "같은 돈을 쓴다면 어디에 더 쓰고 싶으신가요?",
    max_selections: null,
    options: [
      { code: "A", label: "월세와 보증금 부담을 낮추는 데" },
      { code: "B", label: "월세가 높아도 더 좋은 위치를 잡는 데" },
      { code: "C", label: "운영자금까지 남겨두는 데" },
      { code: "D", label: "초반 홍보와 빠른 자리 잡기에" },
    ],
  },
  {
    id: "q6",
    selection_type: "single",
    prompt: "창업 후 1~2년 동안 어떤 흐름이 더 마음 편할 것 같나요?",
    max_selections: null,
    options: [
      { code: "A", label: "크게 안 벌어도 꾸준히 유지되는 흐름" },
      { code: "B", label: "변동이 있어도 성장 가능성이 큰 흐름" },
      { code: "C", label: "위험은 적지만 확장성도 크지 않은 흐름" },
      { code: "D", label: "리스크가 있더라도 빨리 커질 수 있는 흐름" },
    ],
  },
  {
    id: "q7",
    selection_type: "single",
    prompt: "경쟁이 많은 상권을 보면 어떤 생각이 드나요?",
    max_selections: null,
    options: [
      { code: "A", label: "이미 수요가 검증된 곳이라 오히려 괜찮다" },
      { code: "B", label: "굳이 그 안에서 싸우고 싶지는 않다" },
      { code: "C", label: "내가 더 잘할 수 있다면 들어갈 수 있다" },
      { code: "D", label: "상황을 조금 더 지켜본 뒤 판단하고 싶다" },
    ],
  },
  {
    id: "q8",
    selection_type: "single",
    prompt: "내가 생각하는 좋은 상권은 어떤 모습에 더 가깝나요?",
    max_selections: null,
    options: [
      { code: "A", label: "아파트와 빌라가 많아 생활 수요가 보이는 곳" },
      { code: "B", label: "오피스 건물이 많아 점심과 퇴근 수요가 보이는 곳" },
      { code: "C", label: "역세권이라 유동인구가 계속 흐르는 곳" },
      { code: "D", label: "너무 한쪽으로 치우치지 않은 혼합형 상권" },
    ],
  },
  {
    id: "q9",
    selection_type: "single",
    prompt: "장사가 안 되는 날, 어떤 상황이 가장 불안할 것 같나요?",
    max_selections: null,
    options: [
      { code: "A", label: "평일 점심에 직장인 손님이 안 오는 것" },
      { code: "B", label: "저녁 시간인데 가게가 한산한 것" },
      { code: "C", label: "주말인데 생각보다 조용한 것" },
      { code: "D", label: "며칠 연속으로 전체 흐름이 꺾이는 것" },
    ],
  },
  {
    id: "q10",
    selection_type: "multi",
    prompt: "자영업을 통해 이루고 싶은 것을 골라주세요.",
    max_selections: 3,
    options: [
      { code: "A", label: "안정적인 생활 기반" },
      { code: "B", label: "높은 수익과 확장 가능성" },
      { code: "C", label: "자유로운 시간과 운영 방식" },
      { code: "D", label: "동네에서 오래 인정받는 가게" },
      { code: "E", label: "내 감각이 드러나는 브랜드" },
    ],
  },
]

// 서울 주요 모의 상권 데이터 12개 정의
export const MOCK_AREAS: AreaData[] = [
  {
    area_name: "망원2동",
    area_profile_type: "residential",
    sales_amount: 1950000000,
    weekend_sales_ratio: 0.62,
    evening_sales_ratio: 0.28,
    resident_population: 23110,
    worker_population: 9110,
    subway_commercial_trend_score: 0.58,
    category_opportunity_score: 0.81,
    demand_gap_score: 0.72,
  },
  {
    area_name: "성수1가1동",
    area_profile_type: "mixed",
    sales_amount: 2840000000,
    weekend_sales_ratio: 0.58,
    evening_sales_ratio: 0.45,
    resident_population: 18450,
    worker_population: 25400,
    subway_commercial_trend_score: 0.88,
    category_opportunity_score: 0.74,
    demand_gap_score: 0.85,
  },
  {
    area_name: "역삼1동",
    area_profile_type: "office",
    sales_amount: 5410000000,
    weekend_sales_ratio: 0.18,
    evening_sales_ratio: 0.68,
    resident_population: 12050,
    worker_population: 86400,
    subway_commercial_trend_score: 0.94,
    category_opportunity_score: 0.65,
    demand_gap_score: 0.59,
  },
  {
    area_name: "여의동",
    area_profile_type: "office",
    sales_amount: 4120000000,
    weekend_sales_ratio: 0.12,
    evening_sales_ratio: 0.72,
    resident_population: 8900,
    worker_population: 74200,
    subway_commercial_trend_score: 0.86,
    category_opportunity_score: 0.78,
    demand_gap_score: 0.64,
  },
  {
    area_name: "혜화동",
    area_profile_type: "subway",
    sales_amount: 2210000000,
    weekend_sales_ratio: 0.52,
    evening_sales_ratio: 0.59,
    resident_population: 14500,
    worker_population: 18900,
    subway_commercial_trend_score: 0.82,
    category_opportunity_score: 0.85,
    demand_gap_score: 0.79,
  },
  {
    area_name: "잠실본동",
    area_profile_type: "mixed",
    sales_amount: 3200000000,
    weekend_sales_ratio: 0.48,
    evening_sales_ratio: 0.54,
    resident_population: 27800,
    worker_population: 14500,
    subway_commercial_trend_score: 0.79,
    category_opportunity_score: 0.72,
    demand_gap_score: 0.81,
  },
  {
    area_name: "연남동",
    area_profile_type: "mixed",
    sales_amount: 2950000000,
    weekend_sales_ratio: 0.68,
    evening_sales_ratio: 0.51,
    resident_population: 15400,
    worker_population: 11200,
    subway_commercial_trend_score: 0.85,
    category_opportunity_score: 0.89,
    demand_gap_score: 0.88,
  },
  {
    area_name: "서교동",
    area_profile_type: "subway",
    sales_amount: 6100000000,
    weekend_sales_ratio: 0.55,
    evening_sales_ratio: 0.63,
    resident_population: 21000,
    worker_population: 43000,
    subway_commercial_trend_score: 0.96,
    category_opportunity_score: 0.68,
    demand_gap_score: 0.75,
  },
  {
    area_name: "상계2동",
    area_profile_type: "residential",
    sales_amount: 1420000000,
    weekend_sales_ratio: 0.45,
    evening_sales_ratio: 0.35,
    resident_population: 32400,
    worker_population: 7800,
    subway_commercial_trend_score: 0.54,
    category_opportunity_score: 0.79,
    demand_gap_score: 0.69,
  },
  {
    area_name: "가산동",
    area_profile_type: "office",
    sales_amount: 3450000000,
    weekend_sales_ratio: 0.15,
    evening_sales_ratio: 0.58,
    resident_population: 11200,
    worker_population: 94000,
    subway_commercial_trend_score: 0.89,
    category_opportunity_score: 0.71,
    demand_gap_score: 0.62,
  },
  {
    area_name: "화곡1동",
    area_profile_type: "residential",
    sales_amount: 1720000000,
    weekend_sales_ratio: 0.49,
    evening_sales_ratio: 0.32,
    resident_population: 42100,
    worker_population: 9500,
    subway_commercial_trend_score: 0.62,
    category_opportunity_score: 0.73,
    demand_gap_score: 0.76,
  },
  {
    area_name: "명동",
    area_profile_type: "subway",
    sales_amount: 5890000000,
    weekend_sales_ratio: 0.42,
    evening_sales_ratio: 0.48,
    resident_population: 3200,
    worker_population: 58000,
    subway_commercial_trend_score: 0.95,
    category_opportunity_score: 0.76,
    demand_gap_score: 0.55,
  },
]

/**
 * 0.0 ~ 1.0 범위로 지표 값을 제한하는 도우미 함수
 */
function clamp(val: number): number {
  return Math.max(0.05, Math.min(0.95, parseFloat(val.toFixed(2))))
}

/**
 * 설문 응답을 분석하여 9가지 성향 지표를 계산하는 함수
 */
export function calculateUserProfile(
  preferredCategoryCode: string,
  profileName: string,
  answers: { [qId: string]: string | string[] }
): UserProfile {
  // 기본값 설정 (중간 수준인 0.5)
  let budget_level = 0.5
  let stability_level = 0.5
  let subway_dependency_level = 0.5
  let weekend_preference_level = 0.5
  let evening_preference_level = 0.5
  let resident_focus_level = 0.5
  let worker_focus_level = 0.5
  let rent_sensitivity_level = 0.5
  let competition_tolerance_level = 0.5

  // Q1: 희망 주 손님
  const q1 = answers["q1"] as string
  if (q1 === "A") {
    resident_focus_level += 0.3
    worker_focus_level -= 0.2
  } else if (q1 === "B") {
    worker_focus_level += 0.3
    resident_focus_level -= 0.2
  } else if (q1 === "C") {
    competition_tolerance_level += 0.25
  } else if (q1 === "D") {
    weekend_preference_level += 0.3
  }

  // Q2: 희망 바쁜 시간대
  const q2 = answers["q2"] as string
  if (q2 === "A") {
    worker_focus_level += 0.2
    evening_preference_level -= 0.2
  } else if (q2 === "B") {
    evening_preference_level += 0.3
  } else if (q2 === "C") {
    weekend_preference_level += 0.2
    evening_preference_level -= 0.1
  } else if (q2 === "D") {
    weekend_preference_level += 0.2
    evening_preference_level += 0.2
  }

  // Q3: 지하철역과의 거리 중요도
  const q3 = answers["q3"] as string
  if (q3 === "A") {
    subway_dependency_level += 0.4
    rent_sensitivity_level -= 0.15
  } else if (q3 === "B") {
    subway_dependency_level += 0.2
  } else if (q3 === "C") {
    subway_dependency_level -= 0.2
  } else if (q3 === "D") {
    subway_dependency_level -= 0.3
    rent_sensitivity_level += 0.25
  }

  // Q4: 창업 초기 최우선 사항
  const q4 = answers["q4"] as string
  if (q4 === "A") {
    budget_level = 0.25
    rent_sensitivity_level += 0.3
  } else if (q4 === "B") {
    budget_level = 0.75
    rent_sensitivity_level -= 0.2
  } else if (q4 === "C") {
    stability_level += 0.3
    budget_level = 0.4
  } else if (q4 === "D") {
    stability_level -= 0.2
    budget_level = 0.6
    competition_tolerance_level += 0.2
  }

  // Q5: 재정 투입 희망 분야
  const q5 = answers["q5"] as string
  if (q5 === "A") {
    rent_sensitivity_level += 0.3
    budget_level -= 0.1
  } else if (q5 === "B") {
    rent_sensitivity_level -= 0.3
    subway_dependency_level += 0.2
  } else if (q5 === "C") {
    stability_level += 0.3
  } else if (q5 === "D") {
    competition_tolerance_level += 0.3
  }

  // Q6: 1~2년 차 희망 흐름
  const q6 = answers["q6"] as string
  if (q6 === "A") {
    stability_level += 0.3
    competition_tolerance_level -= 0.2
  } else if (q6 === "B") {
    stability_level -= 0.2
    competition_tolerance_level += 0.3
  } else if (q6 === "C") {
    stability_level += 0.2
  } else if (q6 === "D") {
    stability_level -= 0.3
    competition_tolerance_level += 0.4
  }

  // Q7: 경쟁이 치열한 상권을 대하는 자세
  const q7 = answers["q7"] as string
  if (q7 === "A") {
    competition_tolerance_level += 0.3
  } else if (q7 === "B") {
    competition_tolerance_level -= 0.3
  } else if (q7 === "C") {
    competition_tolerance_level += 0.4
  } else if (q7 === "D") {
    stability_level += 0.2
  }

  // Q8: 생각하는 좋은 상권의 모습
  const q8 = answers["q8"] as string
  if (q8 === "A") {
    resident_focus_level += 0.3
  } else if (q8 === "B") {
    worker_focus_level += 0.3
  } else if (q8 === "C") {
    subway_dependency_level += 0.3
  } else if (q8 === "D") {
    resident_focus_level += 0.1
    worker_focus_level += 0.1
  }

  // Q9: 매출 저조 시 가장 불안한 상황
  const q9 = answers["q9"] as string
  if (q9 === "A") {
    worker_focus_level += 0.2
    stability_level -= 0.1
  } else if (q9 === "B") {
    evening_preference_level += 0.2
    stability_level -= 0.1
  } else if (q9 === "C") {
    weekend_preference_level += 0.2
    stability_level -= 0.1
  } else if (q9 === "D") {
    stability_level -= 0.3
  }

  // Q10: 자영업을 통해 추구하는 가치 (다중 선택)
  const q10 = (answers["q10"] as string[]) || []
  q10.forEach((choice) => {
    if (choice === "A") stability_level += 0.2
    else if (choice === "B") {
      competition_tolerance_level += 0.25
      stability_level -= 0.1
    } else if (choice === "C") stability_level += 0.1
    else if (choice === "D") resident_focus_level += 0.2
    else if (choice === "E") competition_tolerance_level += 0.25
  })

  return {
    user_id: "survey_a_preview",
    profile_name: profileName || "설문 결과 프로필",
    preferred_category_code: preferredCategoryCode,
    budget_level: clamp(budget_level),
    stability_level: clamp(stability_level),
    subway_dependency_level: clamp(subway_dependency_level),
    weekend_preference_level: clamp(weekend_preference_level),
    evening_preference_level: clamp(evening_preference_level),
    resident_focus_level: clamp(resident_focus_level),
    worker_focus_level: clamp(worker_focus_level),
    rent_sensitivity_level: clamp(rent_sensitivity_level),
    competition_tolerance_level: clamp(competition_tolerance_level),
  }
}

/**
 * 사용자 프로필 지표를 토대로 서울 12개 상권 데이터셋에서 최적의 추천 상권 5개를 산출하는 추천 엔진
 */
export function getRecommendations(
  userProfile: UserProfile,
  categoryCode: string
): Recommendation[] {
  const category =
    CATEGORIES.find((c) => c.code === categoryCode) || CATEGORIES[1] // 기본 베이커리

  // 각 상권별 적합도 점수 연산
  const scoredAreas = MOCK_AREAS.map((area) => {
    let score = 3.0 // 기본 스코어 기저

    // 1. 프로필 타입 가중치 (주거, 오피스, 역세권)
    if (area.area_profile_type === "residential") {
      score += userProfile.resident_focus_level * 0.8
      score -= userProfile.worker_focus_level * 0.3
    } else if (area.area_profile_type === "office") {
      score += userProfile.worker_focus_level * 0.8
      score -= userProfile.resident_focus_level * 0.3
    } else if (area.area_profile_type === "subway") {
      score += userProfile.subway_dependency_level * 0.8
    } else if (area.area_profile_type === "mixed") {
      score +=
        (userProfile.resident_focus_level + userProfile.worker_focus_level) *
        0.4
    }

    // 2. 주말 선호도 매칭
    const weekendDiff = Math.abs(
      area.weekend_sales_ratio - userProfile.weekend_preference_level
    )
    score += (1.0 - weekendDiff) * 0.5

    // 3. 저녁 영업 선호도 매칭
    const eveningDiff = Math.abs(
      area.evening_sales_ratio - userProfile.evening_preference_level
    )
    score += (1.0 - eveningDiff) * 0.5

    // 4. 임대료 민감도 & 상권 규모 매칭
    // 임대료 민감도(rent_sensitivity_level)가 높은 사람(낮은 지출 희망)은 매출규모(sales_amount) 및 지하철 상권 지수가 낮은 곳 선호
    if (userProfile.rent_sensitivity_level > 0.6) {
      if (area.sales_amount < 2500000000) {
        score += 0.4
      } else {
        score -= 0.3
      }
    } else {
      // 임대료 민감도가 낮고 좋은 자리를 잡으려는 사람은 고매출 상권 선호
      if (area.sales_amount >= 3000000000) {
        score += 0.4
      }
    }

    // 5. 경쟁 허용도 매칭 (기회 지수 등 활용)
    if (userProfile.competition_tolerance_level > 0.6) {
      // 경쟁을 무서워하지 않는 경우 기회 및 갭 점수 가중
      score +=
        area.category_opportunity_score * 0.3 + area.demand_gap_score * 0.2
    } else {
      // 경쟁을 피하려는 경우 기회지수가 더 높은 블루오션 상권 우선 가중
      score += area.demand_gap_score * 0.5
    }

    // 소수점 둘째 자리 반올림
    score = parseFloat(score.toFixed(4))

    return {
      score,
      area_name: area.area_name,
      service_category_name: category.name,
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

  // 점수가 높은 순으로 정렬 후 상위 5개 반환 및 순위(rank) 매기기
  const sorted = scoredAreas.sort((a, b) => b.score - a.score).slice(0, 5)

  return sorted.map((item, idx) => ({
    rank: idx + 1,
    item_id: `${11000000 + idx}:${categoryCode}`,
    ...item,
  }))
}

/**
 * 설문 데이터를 풀 응답 객체(FullSurveyResult) 형태로 감싸서 반환하는 헬퍼 함수
 */
export function buildFullSurveyResult(
  profileCode: string,
  preferredCategoryCode: string,
  profileName: string,
  answers: { [qId: string]: string | string[] },
  authUserUuid: string | null = null,
  source: string = "survey"
): FullSurveyResult {
  const userProfile = calculateUserProfile(
    preferredCategoryCode,
    profileName,
    answers
  )
  const recommendations = getRecommendations(userProfile, preferredCategoryCode)
  const timestamp = new Date().toISOString()

  return {
    survey: {
      id: 1,
      slug: "founder-fit-10-final",
      version: 1,
      survey_code: "A",
      scoring_version: "founder_fit_v1",
      title: "창업 성향 설문 10문항 최종",
      description:
        "비회원도 바로 응답하고 base36 추천 코드를 받을 수 있는 현재 활성 설문 정의다.",
      question_count: 10,
    },
    survey_response_id: Math.floor(Math.random() * 1000) + 1,
    profile: {
      auth_user_uuid: authUserUuid,
      profile_code: profileCode,
      profile_schema_version: 3,
      survey_response_id: 100 + Math.floor(Math.random() * 100),
      survey_slug: "founder-fit-10-final",
      survey_version: 1,
      survey_code: "A",
      scoring_version: "founder_fit_v1",
      share_path: `/example/two-tower-designs/design6/${profileCode}`,
      share_url: `http://localhost:3000/example/two-tower-designs/design6/${profileCode}`,
      source,
      updated_at: timestamp,
      raw_answers: answers,
      user_profile: userProfile,
    },
    prediction: {
      trained_at: timestamp,
      model_signature: `onboarding_two_tower:${timestamp}`,
      top_k: 5,
      profile_code: profileCode,
      profile_schema_version: 3,
      survey_code: "A",
      share_path: `/example/two-tower-designs/design6/${profileCode}`,
      share_url: `http://localhost:3000/example/two-tower-designs/design6/${profileCode}`,
      user_profile: userProfile,
      recommendations,
    },
  }
}

/**
 * 공유 코드를 기반으로 결정론적(deterministic) 모의 데이터를 생성하는 백업 유틸리티
 * 데이터베이스가 없으므로 localStorage에 없을 시 공유 코드를 해싱하여 일정한 결과를 보여줍니다.
 */
export function getDeterministicResultFromCode(
  profileCode: string
): FullSurveyResult {
  // 간단한 해시 함수를 통해 profileCode 문자열에서 고정된 응답값을 매핑해 냅니다.
  let hash = 0
  for (let i = 0; i < profileCode.length; i++) {
    hash = profileCode.charCodeAt(i) + ((hash << 5) - hash)
  }

  // 해시값에 따라 균등하게 뿌릴 수 있는 대표적인 3가지 응답 패턴
  const index = Math.abs(hash) % 3

  const answersPatterns = [
    // 패턴 1: 안정형 주거지역 베이커리 (망원동 등 매칭 목적)
    {
      preferred: "CS100005",
      name: "안정 지향 주거 베이커리 대표님",
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
    },
    // 패턴 2: 성장형 오피스 커피전문점 (역삼동, 여의도 매칭 목적)
    {
      preferred: "CS100010",
      name: "고수익 오피스 카페 대표님",
      answers: {
        q1: "B",
        q2: "A",
        q3: "A",
        q4: "B",
        q5: "B",
        q6: "B",
        q7: "C",
        q8: "B",
        q9: "A",
        q10: ["B", "E"],
      },
    },
    // 패턴 3: 개성파 역세권 한식/치킨점 (성수동, 혜화동 매칭 목적)
    {
      preferred: "CS100007",
      name: "트렌디 역세권 치킨 대표님",
      answers: {
        q1: "C",
        q2: "D",
        q3: "B",
        q4: "D",
        q5: "D",
        q6: "D",
        q7: "A",
        q8: "C",
        q9: "B",
        q10: ["C", "E", "D"],
      },
    },
  ]

  const pattern = answersPatterns[index]

  return buildFullSurveyResult(
    profileCode,
    pattern.preferred,
    pattern.name,
    pattern.answers,
    null,
    "shared_url"
  )
}
