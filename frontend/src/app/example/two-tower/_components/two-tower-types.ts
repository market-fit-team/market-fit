export type UserProfile = {
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

export type FeatureControl = {
  name: keyof Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  >
  label: string
  description: string
  minimum: number
  maximum: number
  step: number
}

export type CategoryOption = {
  code: string
  label: string
}

export type EvaluationResponse = {
  model_id: string
  trained_at: string
  epochs: number
  rows: number
  user_count: number
  item_count: number
  embedding_dim: number
  final_loss: number
  hit_rate_at_3: number
  mrr: number
  artifact_paths: Record<string, string>
  user_string_features: string[]
  user_numeric_features: string[]
  item_string_features: string[]
  item_numeric_features: string[]
}

export type RecommendationItem = {
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

export type PredictResponse = {
  trained_at: string
  model_signature: string
  top_k: number
  profile_code: string
  profile_schema_version: number
  share_path: string
  share_url: string
  user_profile: UserProfile
  recommendations: RecommendationItem[]
}

export type StoredUserTowerProfile = {
  auth_user_uuid: string | null
  profile_code: string
  profile_schema_version: number
  share_path: string
  share_url: string
  source: string
  updated_at: string | null
  raw_answers: Record<string, unknown> | null
  user_profile: UserProfile
}

export type ResolvedProfileResponse = {
  profile: StoredUserTowerProfile
  prediction: PredictResponse
}

export type CatalogResponse = {
  model_id: string
  profile_code_prefix: string
  profile_schema_version: number
  feature_controls: FeatureControl[]
  category_options: CategoryOption[]
  sample_profiles: UserProfile[]
  item_preview: Array<{
    item_id: string
    area_name: string
    service_category_name: string
    area_profile_type: string
    sales_amount: number
    weekend_sales_ratio: number
    evening_sales_ratio: number
  }>
  evaluation: EvaluationResponse
}
