/** POST /surveys/active/preview 응답 목 데이터 */
export interface Recommendation {
  rank: number
  score: number
  item_id: string
  area_name: string
  service_category_name: string
  area_profile_type: string
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
}

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

export interface PreviewResponse {
  survey_response_id: number
  profile: {
    profile_code: string
    share_path: string
    share_url: string
    user_profile: UserProfile
  }
  prediction: {
    top_k: number
    user_profile: UserProfile
    recommendations: Recommendation[]
  }
}

/** 목 응답 데이터 — 실제 API 연동 없이 사용 */
export const MOCK_PREVIEW_RESPONSE: PreviewResponse = {
  survey_response_id: 12,
  profile: {
    profile_code: "r3a3lz4o0x8w1f2j",
    share_path: "/example/two-tower/r3a3lz4o0x8w1f2j",
    share_url: "http://localhost:3000/example/two-tower/r3a3lz4o0x8w1f2j",
    user_profile: {
      user_id: "survey_a_preview",
      profile_name: "설문 결과 프로필",
      preferred_category_code: "CS100005",
      budget_level: 0.28,
      stability_level: 0.82,
      subway_dependency_level: 0.11,
      weekend_preference_level: 0.72,
      evening_preference_level: 0.36,
      resident_focus_level: 0.84,
      worker_focus_level: 0.15,
      rent_sensitivity_level: 0.74,
      competition_tolerance_level: 0.19,
    },
  },
  prediction: {
    top_k: 5,
    user_profile: {
      user_id: "survey_a_preview",
      profile_name: "설문 결과 프로필",
      preferred_category_code: "CS100005",
      budget_level: 0.28,
      stability_level: 0.82,
      subway_dependency_level: 0.11,
      weekend_preference_level: 0.72,
      evening_preference_level: 0.36,
      resident_focus_level: 0.84,
      worker_focus_level: 0.15,
      rent_sensitivity_level: 0.74,
      competition_tolerance_level: 0.19,
    },
    recommendations: [
      {
        rank: 1,
        score: 3.582114,
        item_id: "11230536:CS100005",
        area_name: "망원2동",
        service_category_name: "제과점",
        area_profile_type: "residential",
        sales_amount: 1950000000,
        weekend_sales_ratio: 0.52,
        evening_sales_ratio: 0.22,
        resident_population: 23110,
        worker_population: 9110,
        subway_commercial_trend_score: 0.73,
        category_opportunity_score: 0.68,
        demand_gap_score: 0.59,
      },
      {
        rank: 2,
        score: 3.441892,
        item_id: "11230537:CS100005",
        area_name: "성산1동",
        service_category_name: "제과점",
        area_profile_type: "residential",
        sales_amount: 1720000000,
        weekend_sales_ratio: 0.48,
        evening_sales_ratio: 0.25,
        resident_population: 20540,
        worker_population: 7830,
        subway_commercial_trend_score: 0.61,
        category_opportunity_score: 0.72,
        demand_gap_score: 0.64,
      },
      {
        rank: 3,
        score: 3.298451,
        item_id: "11410210:CS100005",
        area_name: "연희동",
        service_category_name: "제과점",
        area_profile_type: "mixed",
        sales_amount: 2100000000,
        weekend_sales_ratio: 0.55,
        evening_sales_ratio: 0.29,
        resident_population: 18200,
        worker_population: 11340,
        subway_commercial_trend_score: 0.58,
        category_opportunity_score: 0.65,
        demand_gap_score: 0.51,
      },
      {
        rank: 4,
        score: 3.172033,
        item_id: "11500105:CS100005",
        area_name: "합정동",
        service_category_name: "제과점",
        area_profile_type: "commercial",
        sales_amount: 2870000000,
        weekend_sales_ratio: 0.61,
        evening_sales_ratio: 0.34,
        resident_population: 14980,
        worker_population: 16450,
        subway_commercial_trend_score: 0.88,
        category_opportunity_score: 0.59,
        demand_gap_score: 0.42,
      },
      {
        rank: 5,
        score: 3.041798,
        item_id: "11230112:CS100005",
        area_name: "서교동",
        service_category_name: "제과점",
        area_profile_type: "commercial",
        sales_amount: 3120000000,
        weekend_sales_ratio: 0.67,
        evening_sales_ratio: 0.38,
        resident_population: 12300,
        worker_population: 18900,
        subway_commercial_trend_score: 0.91,
        category_opportunity_score: 0.54,
        demand_gap_score: 0.38,
      },
    ],
  },
}
