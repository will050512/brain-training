/**
 * API 層 - 類型定義
 */

// API 回應基礎結構
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

// API 錯誤
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// API 元資料
export interface ApiMeta {
  timestamp: string
  requestId: string
  version: string
}

// 分頁參數
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 分頁回應
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// 同步狀態
export interface SyncStatus {
  lastSyncAt: string | null
  pendingCount: number
  syncInProgress: boolean
}

// 營養品推薦請求
export interface NutritionRecommendationRequest {
  odId: string
  cognitiveScores: {
    reaction: number
    logic: number
    memory: number
    cognition: number
    coordination: number
    attention: number
  }
  declineAreas?: string[]
  age?: number
}

// 營養品推薦回應
export interface NutritionRecommendation {
  id: string
  supplementType: string
  name: string
  description: string
  dimension: string
  priority: 'low' | 'medium' | 'high'
  reason: string
  scientificBasis?: string
  dosageRecommendation?: string
  warnings?: string[]
}

// 行為日誌上傳請求
export interface BehaviorLogUploadRequest {
  odId: string
  logs: Array<{
    eventType: string
    gameId: string
    sessionId: string
    timestamp: string
    data: Record<string, unknown>
  }>
}

// 評估結果上傳請求
export interface AssessmentUploadRequest {
  odId: string
  assessmentType: 'mini-cog' | 'baseline' | 'game-session'
  data: Record<string, unknown>
  anonymized?: boolean
}

// 趨勢分析回應
export interface TrendAnalysisResponse {
  odId: string
  period: {
    start: string
    end: string
  }
  trends: {
    dimension: string
    trend: 'improving' | 'stable' | 'declining'
    changePercent: number
    confidence: number
  }[]
  recommendations: string[]
}
