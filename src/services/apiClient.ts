/**
 * API 客戶端
 * 封裝 HTTP 請求，提供統一的錯誤處理和重試機制
 */

import type { ApiResponse, ApiError } from './apiTypes'

// API 配置
export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

// 預設配置
const defaultConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
}

let config = { ...defaultConfig }

/**
 * 設定 API 配置
 */
export function configureApi(newConfig: Partial<ApiConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * 取得目前 API 配置
 */
export function getApiConfig(): ApiConfig {
  return { ...config }
}

/**
 * 執行 API 請求
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  options?: {
    body?: unknown
    params?: Record<string, string | number | boolean | undefined>
    headers?: Record<string, string>
    signal?: AbortSignal
  }
): Promise<ApiResponse<T>> {
  const url = new URL(`${config.baseUrl}${endpoint}`, window.location.origin)
  
  // 添加查詢參數
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: options?.signal,
  }

  if (options?.body && method !== 'GET') {
    requestOptions.body = JSON.stringify(options.body)
  }

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)
      
      const response = await fetch(url.toString(), {
        ...requestOptions,
        signal: options?.signal || controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const apiError: ApiError = {
          code: `HTTP_${response.status}`,
          message: errorData.message || response.statusText,
          details: errorData,
        }
        return { success: false, error: apiError }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('X-Request-Id') || crypto.randomUUID(),
          version: response.headers.get('X-Api-Version') || '1.0',
        },
      }
    } catch (error) {
      lastError = error as Error
      
      // 不重試中止的請求
      if ((error as Error).name === 'AbortError') {
        break
      }
      
      // 等待後重試
      if (attempt < config.retryAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)))
      }
    }
  }

  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: lastError?.message || '網路請求失敗',
    },
  }
}

// HTTP 方法封裝
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    request<T>('GET', endpoint, { params, signal }),
    
  post: <T>(endpoint: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('POST', endpoint, { body, signal }),
    
  put: <T>(endpoint: string, body?: unknown, signal?: AbortSignal) =>
    request<T>('PUT', endpoint, { body, signal }),
    
  delete: <T>(endpoint: string, signal?: AbortSignal) =>
    request<T>('DELETE', endpoint, { signal }),
}
