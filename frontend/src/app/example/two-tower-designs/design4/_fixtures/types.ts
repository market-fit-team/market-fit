/**
 * Design4 설문 및 결과 관련 타입 정의
 */

/** 설문 선택지 */
export interface SurveyOption {
  code: string
  label: string
}

/** 설문 문항 */
export interface SurveyQuestion {
  id: string
  selection_type: "single" | "multi"
  prompt: string
  max_selections: number | null
  options: SurveyOption[]
}

/** 설문 정의 */
export interface SurveyDefinition {
  id: number
  slug: string
  version: number
  survey_code: string
  scoring_version: string
  title: string
  description: string
  question_count: number
  questions: SurveyQuestion[]
}

/** 사용자 프로필 수치 */
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

/** 추천 상권 아이템 */
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

/** 설문 응답 (각 문항에 대한 답변) */
export type SurveyAnswers = Record<string, string | string[]>

/** 프로필 정보 */
export interface ProfileInfo {
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
  raw_answers: SurveyAnswers
  user_profile: UserProfile
}

/** 예측 결과 */
export interface PredictionResult {
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

/** 전체 응답 구조 (POST /surveys/active/preview) */
export interface PreviewResponse {
  survey: Omit<SurveyDefinition, "questions">
  survey_response_id: number
  profile: ProfileInfo
  prediction: PredictionResult
}
