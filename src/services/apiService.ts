/**
 * API 服務整合層
 * 統一 API 呼叫入口，自動處理 Mock 模式切換
 */

import { apiClient } from './apiClient'
import { mockHandlers, isMockEnabled } from './mockHandlers'
import type {
  ApiResponse,
  NutritionRecommendation,
  NutritionRecommendationRequest,
  BehaviorLogUploadRequest,
  AssessmentUploadRequest,
  TrendAnalysisResponse,
  SyncStatus,
} from './apiTypes'

/**
 * 包裝 Mock 回應為 ApiResponse 格式
 */
function wrapMockResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `mock_${Date.now().toString(36)}`,
      version: 'mock-1.0',
    },
  }
}

/**
 * 包裝 Mock 錯誤為 ApiResponse 格式
 */
function wrapMockError<T>(message: string): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: 'MOCK_ERROR',
      message,
    },
  }
}

// ===== 營養品推薦 API =====

/**
 * 取得營養品推薦（推薦使用）
 */
export async function getNutritionRecommendations(
  request: NutritionRecommendationRequest,
  signal?: AbortSignal
): Promise<ApiResponse<NutritionRecommendation[]>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.getNutritionRecommendations(request)
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.post<NutritionRecommendation[]>('/nutrition/recommendations', request, signal)
}

/**
 * 取得營養品詳細資訊
 */
export async function getNutritionDetails(
  supplementType: string,
  signal?: AbortSignal
): Promise<ApiResponse<NutritionRecommendation | null>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.getNutritionDetails(supplementType)
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.get<NutritionRecommendation | null>(`/nutrition/${supplementType}`, undefined, signal)
}

// ===== 行為日誌 API =====

/**
 * 上傳行為日誌（批量）
 */
export async function uploadBehaviorLogs(
  request: BehaviorLogUploadRequest,
  signal?: AbortSignal
): Promise<ApiResponse<{ uploadedCount: number }>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.uploadBehaviorLogs(request.logs)
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.post<{ uploadedCount: number }>('/analytics/behavior-logs', request, signal)
}

/**
 * 取得同步狀態
 */
export async function getSyncStatus(
  odId: string,
  signal?: AbortSignal
): Promise<ApiResponse<SyncStatus>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.getSyncStatus(odId)
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.get<SyncStatus>('/sync/status', { odId }, signal)
}

// ===== 評估結果 API =====

/**
 * 上傳評估結果
 */
export async function uploadAssessment(
  request: AssessmentUploadRequest,
  signal?: AbortSignal
): Promise<ApiResponse<{ assessmentId: string }>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.uploadAssessment()
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.post<{ assessmentId: string }>('/assessments', request, signal)
}

/**
 * 取得趨勢分析
 */
export async function getTrendAnalysis(
  odId: string,
  period?: { start: string; end: string },
  signal?: AbortSignal
): Promise<ApiResponse<TrendAnalysisResponse>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.getTrendAnalysis(odId, period)
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.get<TrendAnalysisResponse>('/analytics/trends', {
    odId,
    start: period?.start,
    end: period?.end,
  }, signal)
}

// ===== 健康檢查 API =====

/**
 * API 健康檢查
 */
export async function healthCheck(
  signal?: AbortSignal
): Promise<ApiResponse<{ status: 'ok' | 'degraded'; timestamp: string }>> {
  if (isMockEnabled()) {
    try {
      const data = await mockHandlers.healthCheck()
      return wrapMockResponse(data)
    } catch (error) {
      return wrapMockError((error as Error).message)
    }
  }
  return apiClient.get<{ status: 'ok' | 'degraded'; timestamp: string }>('/health', undefined, signal)
}

// 導出配置函數
export { configureApi, getApiConfig } from './apiClient'
export { setMockEnabled, isMockEnabled } from './mockHandlers'

// 重新導出類型
export type {
  ApiResponse,
  ApiError,
  ApiMeta,
  PaginationParams,
  PaginatedResponse,
  SyncStatus,
  NutritionRecommendationRequest,
  NutritionRecommendation,
  BehaviorLogUploadRequest,
  AssessmentUploadRequest,
  TrendAnalysisResponse,
} from './apiTypes'
