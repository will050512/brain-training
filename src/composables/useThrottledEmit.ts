/**
 * useThrottledEmit - 節流 emit 工具
 * 用於限制遊戲狀態更新頻率，避免高頻 emit 影響效能
 */

import { ref } from 'vue'
import type { GameStatusUpdate } from '@/types'

/**
 * 建立節流 emit 函數
 * @param emit - Vue emit 函數
 * @param interval - 節流間隔（毫秒），預設 100ms
 * @returns throttledEmit 函數
 */
export function useThrottledEmit(
  emit: (event: 'status-update', data: GameStatusUpdate) => void,
  interval: number = 100
) {
  const lastEmitTime = ref(0)
  const pendingData = ref<GameStatusUpdate | null>(null)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * 節流 emit 狀態更新
   * @param data - 遊戲狀態數據
   */
  function throttledEmit(data: GameStatusUpdate) {
    const now = Date.now()
    pendingData.value = data

    // 如果距離上次 emit 時間足夠長，立即 emit
    if (now - lastEmitTime.value >= interval) {
      emit('status-update', data)
      lastEmitTime.value = now
      pendingData.value = null
      
      // 清除待處理的 timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    } else if (!timeoutId) {
      // 否則設定 timeout 確保最後一次更新會被 emit
      const remaining = interval - (now - lastEmitTime.value)
      timeoutId = setTimeout(() => {
        if (pendingData.value) {
          emit('status-update', pendingData.value)
          lastEmitTime.value = Date.now()
          pendingData.value = null
        }
        timeoutId = null
      }, remaining)
    }
  }

  /**
   * 立即 emit（繞過節流，用於重要狀態如遊戲結束）
   * @param data - 遊戲狀態數據
   */
  function immediateEmit(data: GameStatusUpdate) {
    // 清除待處理的 timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    emit('status-update', data)
    lastEmitTime.value = Date.now()
    pendingData.value = null
  }

  /**
   * 清理函數（在元件卸載時呼叫）
   */
  function cleanup() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return {
    throttledEmit,
    immediateEmit,
    cleanup
  }
}
