/**
 * PWA 更新管理 Composable
 * 處理 Service Worker 更新、版本檢查與用戶通知
 */

import { ref, onMounted, onUnmounted } from 'vue'

export interface PWAUpdateInfo {
  isUpdateAvailable: boolean
  isOfflineReady: boolean
  needRefresh: boolean
}

export function usePWA() {
  const isUpdateAvailable = ref(false)
  const isOfflineReady = ref(false)
  const needRefresh = ref(false)
  const isUpdating = ref(false)
  let hasReloaded = false
  
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
  let registration: ServiceWorkerRegistration | undefined

  /**
   * 檢查更新
   */
  async function checkForUpdates() {
    if (registration) {
      try {
        await registration.update()
        console.log('[PWA] 手動檢查更新完成')
      } catch (error) {
        console.error('[PWA] 檢查更新失敗:', error)
      }
    }
  }

  /**
   * 應用更新並重新載入
   */
  async function applyUpdate() {
    if (updateSW) {
      isUpdating.value = true
      try {
        await updateSW(false)
      } catch (error) {
        console.error('[PWA] 應用更新失敗:', error)
        isUpdating.value = false
      }
    }
  }

  /**
   * 跳過等待並啟用新版本
   */
  function skipWaiting() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  /**
   * 初始化 PWA 更新監聽
   */
  async function initPWA() {
    // 動態引入 virtual:pwa-register 模組
    try {
      const { registerSW } = await import('virtual:pwa-register')
      
      updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] 新版本可用，需要重新整理')
          needRefresh.value = true
          isUpdateAvailable.value = true
        },
        onOfflineReady() {
          console.log('[PWA] 應用程式已準備好離線使用')
          isOfflineReady.value = true
        },
        onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
          registration = r
          console.log('[PWA] Service Worker 已註冊:', swUrl)
          
          // 定期檢查更新（每小時）
          if (r) {
            setInterval(async () => {
              if (navigator.onLine) {
                try {
                  await r.update()
                  console.log('[PWA] 定期更新檢查完成')
                } catch (error) {
                  console.error('[PWA] 定期更新檢查失敗:', error)
                }
              }
            }, 60 * 60 * 1000) // 每小時檢查一次
          }
        },
        onRegisterError(error: Error) {
          console.error('[PWA] Service Worker 註冊失敗:', error)
        }
      })
    } catch (error) {
      console.error('[PWA] 初始化失敗:', error)
    }
  }

  // 監聽頁面可見性變化，當用戶切回應用時檢查更新
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      checkForUpdates()
    }
  }

  // 監聯網路恢復，自動檢查更新
  function handleOnline() {
    console.log('[PWA] 網路已恢復，檢查更新...')
    checkForUpdates()
  }

  // 監聽 Service Worker 控制器變化
  function handleControllerChange() {
    if (hasReloaded) return
    if (!isUpdating.value) {
      console.log('[PWA] Service Worker 控制器已變更，等待使用者更新')
      return
    }
    hasReloaded = true
    console.log('[PWA] Service Worker 控制器已變更，重新載入頁面')
    window.location.reload()
  }

  onMounted(() => {
    initPWA()
    
    // 添加事件監聽器
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  })

  return {
    isUpdateAvailable,
    isOfflineReady,
    needRefresh,
    isUpdating,
    checkForUpdates,
    applyUpdate,
    skipWaiting
  }
}
