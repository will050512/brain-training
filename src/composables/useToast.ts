/**
 * Toast 通知系統 Composable
 * 用於顯示各種提示訊息
 */
import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
  icon?: string
}

const toasts = ref<Toast[]>([])
let toastId = 0

/**
 * 產生唯一 ID
 */
function generateId(): string {
  return `toast-${++toastId}-${Date.now()}`
}

/**
 * 取得類型對應的預設圖示
 */
function getDefaultIcon(type: ToastType): string {
  const icons: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type]
}

/**
 * 顯示 Toast 通知
 */
function show(
  message: string,
  type: ToastType = 'info',
  options: { duration?: number; icon?: string } = {}
): string {
  const { duration = 3000, icon } = options
  
  const toast: Toast = {
    id: generateId(),
    message,
    type,
    duration,
    icon: icon || getDefaultIcon(type)
  }
  
  toasts.value.push(toast)
  
  // 自動移除
  if (duration > 0) {
    setTimeout(() => {
      remove(toast.id)
    }, duration)
  }
  
  return toast.id
}

/**
 * 移除 Toast
 */
function remove(id: string): void {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

/**
 * 清除所有 Toast
 */
function clearAll(): void {
  toasts.value = []
}

/**
 * 便捷方法
 */
function success(message: string, options?: { duration?: number; icon?: string }): string {
  return show(message, 'success', options)
}

function error(message: string, options?: { duration?: number; icon?: string }): string {
  return show(message, 'error', options)
}

function warning(message: string, options?: { duration?: number; icon?: string }): string {
  return show(message, 'warning', options)
}

function info(message: string, options?: { duration?: number; icon?: string }): string {
  return show(message, 'info', options)
}

/**
 * useToast composable
 */
export function useToast() {
  return {
    toasts: readonly(toasts),
    show,
    remove,
    clearAll,
    success,
    error,
    warning,
    info
  }
}

// 匯出單例供全域使用
export const toast = {
  show,
  remove,
  clearAll,
  success,
  error,
  warning,
  info
}
