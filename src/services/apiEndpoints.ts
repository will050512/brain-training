/**
 * API 端點定義
 * 所有後端 API 呼叫集中於此
 */

import { apiClient } from './apiClient'
import type {
  ApiResponse,
  NutritionRecommendation,
  NutritionRecommendationRequest,
  BehaviorLogUploadRequest,
  AssessmentUploadRequest,
  TrendAnalysisResponse,
  SyncStatus,
} from './apiTypes'

// ===== 營養品推薦 API =====

/**
 * 取得營養品推薦
 */
export async function getNutritionRecommendations(
  request: NutritionRecommendationRequest,
  signal?: AbortSignal
): Promise<ApiResponse<NutritionRecommendation[]>> {
  return apiClient.post<NutritionRecommendation[]>('/nutrition/recommendations', request, signal)
}

/**
 * 取得營養品詳細資訊
 */
export async function getNutritionDetails(
  supplementType: string,
  signal?: AbortSignal
): Promise<ApiResponse<NutritionRecommendation>> {
  return apiClient.get<NutritionRecommendation>(`/nutrition/${supplementType}`, undefined, signal)
}

// ===== 行為日誌 API =====

/**
 * 上傳行為日誌（批量）
 */
export async function uploadBehaviorLogs(
  request: BehaviorLogUploadRequest,
  signal?: AbortSignal
): Promise<ApiResponse<{ uploadedCount: number }>> {
  return apiClient.post<{ uploadedCount: number }>('/analytics/behavior-logs', request, signal)
}

/**
 * 取得同步狀態
 */
export async function getSyncStatus(
  odId: string,
  signal?: AbortSignal
): Promise<ApiResponse<SyncStatus>> {
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
  return apiClient.get<TrendAnalysisResponse>('/analytics/trends', {
    odId,
    start: period?.start,
    end: period?.end,
  }, signal)
}

// ===== 使用者資料 API =====

/**
 * 取得雲端備份的使用者資料
 */
export async function getCloudUserData(
  odId: string,
  signal?: AbortSignal
): Promise<ApiResponse<{
  lastBackupAt: string
  hasData: boolean
}>> {
  return apiClient.get<{
    lastBackupAt: string
    hasData: boolean
  }>('/users/cloud-data', { odId }, signal)
}

/**
 * 備份使用者資料到雲端
 */
export async function backupUserData(
  odId: string,
  data: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ApiResponse<{ backupId: string }>> {
  return apiClient.post<{ backupId: string }>('/users/backup', { odId, data }, signal)
}

// ===== 健康檢查 API =====

/**
 * API 健康檢查
 */
export async function healthCheck(
  signal?: AbortSignal
): Promise<ApiResponse<{ status: 'ok' | 'degraded'; timestamp: string }>> {
  return apiClient.get<{ status: 'ok' | 'degraded'; timestamp: string }>('/health', undefined, signal)
}
