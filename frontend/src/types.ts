export type ColumnSchema = {
  name: string
  dtype: string
  null_ratio: number
  n_unique: number
  sample_values: string[]
}

export type Dataset = {
  id: number
  name: string
  filename: string
  file_format: string
  rows: number
  cols: number
  columns: ColumnSchema[]
  created_at: string
}

export type AnalysisReport = {
  profile?: {
    dataset_health?: Record<string, unknown>
    target_suitability?: Record<string, unknown>
    warnings?: string[]
    blocking_errors?: string[]
    task_type_hint?: string | null
  }
  model?: {
    kind?: string
    validation_strategy?: string
    confidence?: string
    cv_metrics?: Record<string, number>
  }
  grouped_drivers?: { feature: string; mean_abs_shap: number; mean_signed_shap: number; direction: string }[]
  data_warnings?: string[]
  user_message?: string | null
  fallbacks?: string[]
}

export type Analysis = {
  id: number
  dataset_id: number
  target: string
  task_type: string | null
  status: string
  metrics: Record<string, number> | null
  insights: {
    feature: string
    kind: string
    task_type: string
    summary: string
    mean_abs_shap: number
    grouped_feature?: string
    confidence?: string
  }[] | null
  recommendations: string[] | null
  feature_importance: { feature: string; importance: number; mean_abs_shap: number }[] | null
  shap_summary: {
    feature: string
    mean_abs_shap: number
    mean_signed_shap: number
    direction: string
    xgb_importance: number
  }[] | null
  shap_summary_image_url: string | null
  report: AnalysisReport | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export type DatasetProfile = {
  ok: boolean
  blocking_errors: string[]
  warnings: string[]
  dataset_health: Record<string, unknown>
  target_suitability: Record<string, unknown>
  task_type_hint: string | null
}
