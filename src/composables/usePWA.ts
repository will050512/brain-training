/**
 * PWA 更新管理 Composable
 * 處理 Service Worker 更新、版本檢查與用戶通知
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { getStoredBuildHash } from '@/services/versionService'

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
  const isUserActive = ref(true)
  const pendingAutoUpdate = ref(false)
  let hasReloaded = false
  let visibilityOverride: 'visible' | 'hidden' | null = null
  let skipReloadForTests = false
  let pendingReload = false
  let autoUpdateScheduled = false
  
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
  let registration: ServiceWorkerRegistration | undefined
  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const versionProbePath = `${normalizedBaseUrl}version.json`
  const isIOSDevice = (() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isAppleDevice = /iP(hone|od|ad)/.test(ua)
    const isMacTouch = ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document
    return isAppleDevice || isMacTouch
  })()

  /**
   * 檢查更新
   */
  async function checkForUpdates() {
    let currentRegistration = registration
    if (!currentRegistration && 'serviceWorker' in navigator) {
      try {
        currentRegistration = await navigator.serviceWorker.getRegistration()
        if (currentRegistration) registration = currentRegistration
      } catch (error) {
        console.error('[PWA] 取得 Service Worker 註冊失敗:', error)
      }
    }

    if (currentRegistration) {
      try {
        await currentRegistration.update()
        console.log('[PWA] 手動檢查更新完成')
        if (currentRegistration.waiting) {
          void handleNeedRefresh()
        }
      } catch (error) {
        console.error('[PWA] 檢查更新失敗:', error)
      }
    }
  }

  async function probeVersion(): Promise<string | null> {
    try {
      const probeUrl = new URL(`${versionProbePath}?t=${Date.now()}`, window.location.origin)
      const response = await fetch(probeUrl.toString(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) return null
      const data = await response.json() as { version?: string } | null
      if (!data || typeof data.version !== 'string') return null
      return data.version
    } catch (error) {
      console.warn('[PWA] 版本探針失敗:', error)
      return null
    }
  }

  async function checkForUpdatesWithProbe(): Promise<void> {
    if (!navigator.onLine) return
    const probedVersion = await probeVersion()
    if (probedVersion && __APP_VERSION__ && probedVersion === __APP_VERSION__) {
      return
    }
    await checkForUpdates()
  }

  /**
   * 應用更新並重新載入
   */
  async function applyUpdate() {
    if (updateSW) {
      isUpdating.value = true
      try {
        if (skipReloadForTests) {
          return
        }
        const shouldUpdate = await shouldApplyUpdate()
        if (!shouldUpdate) {
          isUpdating.value = false
          needRefresh.value = false
          isUpdateAvailable.value = false
          pendingAutoUpdate.value = false
          console.log('[PWA] 版本相同，略過更新套用')
          return
        }
        skipWaiting()
        await updateSW(true)
      } catch (error) {
        console.error('[PWA] 應用更新失敗:', error)
        isUpdating.value = false
      }
    }
  }

  function getVisibilityState() {
    return visibilityOverride ?? document.visibilityState
  }

  function updateUserActiveState() {
    isUserActive.value = getVisibilityState() === 'visible'
  }

  async function handleNeedRefresh(force: boolean = false) {
    if (!force) {
      const shouldUpdate = await shouldApplyUpdate()
      if (!shouldUpdate) {
        console.log('[PWA] 偵測到更新但版本相同，略過套用')
        return
      }
    }

    needRefresh.value = true
    isUpdateAvailable.value = true
    updateUserActiveState()
    pendingAutoUpdate.value = true
    scheduleAutoApplyUpdate()
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
        immediate: false,
        onNeedRefresh() {
          console.log('[PWA] 新版本可用，需要重新整理')
          void handleNeedRefresh(true)
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
    updateUserActiveState()
    if (getVisibilityState() === 'visible') {
      if (navigator.onLine) {
        if (isIOSDevice) {
          void checkForUpdatesWithProbe()
        } else {
          checkForUpdates()
        }
      }
      return
    }
    if (pendingAutoUpdate.value && needRefresh.value && !isUpdating.value) {
      pendingAutoUpdate.value = false
      void applyUpdate()
    }
  }

  // 監聯網路恢復，自動檢查更新
  function handleOnline() {
    console.log('[PWA] 網路已恢復，檢查更新...')
    if (getVisibilityState() === 'visible') {
      void checkForUpdatesWithProbe()
    }
  }

  function handlePageShow(event: PageTransitionEvent) {
    if (!isIOSDevice) return
    if (!navigator.onLine) return
    if (event.persisted || getVisibilityState() === 'visible') {
      void checkForUpdatesWithProbe()
    }
  }

  function handleFocus() {
    if (!isIOSDevice) return
    if (navigator.onLine) {
      void checkForUpdatesWithProbe()
    }
  }

  // 監聽 Service Worker 控制器變化
  function handleControllerChange() {
    if (hasReloaded) return
    if (!isUpdating.value) {
      console.log('[PWA] Service Worker 控制器已變更，等待使用者更新')
      return
    }
    pendingReload = true
    scheduleReloadWhenReady()
  }

  async function shouldApplyUpdate(): Promise<boolean> {
    const waitingHash = await getWaitingServiceWorkerHash()
    const currentHash = __BUILD_HASH__ || (await getStoredBuildHash()) || ''

    if (waitingHash && currentHash) {
      return waitingHash !== currentHash
    }

    console.warn('[PWA] 版本資訊不足，允許套用更新')
    return true
  }

  async function getWaitingServiceWorkerHash(): Promise<string | null> {
    const waiting = registration?.waiting
    if (!waiting) return null

    return new Promise(resolve => {
      const channel = new MessageChannel()
      const timeoutId = window.setTimeout(() => {
        resolve(null)
      }, 1500)

      channel.port1.onmessage = event => {
        window.clearTimeout(timeoutId)
        const buildHash = (event.data as { buildHash?: string } | undefined)?.buildHash
        resolve(buildHash ?? null)
      }

      waiting.postMessage({ type: 'GET_VERSION' }, [channel.port2])
    })
  }

  function isBootReady(): boolean {
    return window.__APP_BOOT_READY__ === true
  }

  function scheduleAutoApplyUpdate(): void {
    if (autoUpdateScheduled || isUpdating.value) return
    autoUpdateScheduled = true
    const attempt = () => {
      if (isUpdating.value) {
        autoUpdateScheduled = false
        return
      }
      if (!isBootReady()) {
        window.setTimeout(attempt, 300)
        return
      }
      autoUpdateScheduled = false
      pendingAutoUpdate.value = false
      void applyUpdate()
    }
    attempt()
  }

  function scheduleReloadWhenReady() {
    if (!pendingReload || hasReloaded) return
    if (!isBootReady()) {
      window.setTimeout(scheduleReloadWhenReady, 200)
      return
    }
    pendingReload = false
    hasReloaded = true
    console.log('[PWA] Service Worker 控制器已變更，重新載入頁面')
    window.location.reload()
  }

  onMounted(() => {
    const scheduleInit = () => {
      initPWA()
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(scheduleInit, { timeout: 2500 })
    } else {
      setTimeout(scheduleInit, 1500)
    }
    updateUserActiveState()
    
    // 添加事件監聽器
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleFocus)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    }

    if (navigator.webdriver && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      window.__PWA_TEST__ = {
        setNeedRefresh: () => {
          needRefresh.value = true
          isUpdateAvailable.value = true
          updateUserActiveState()
          if (getVisibilityState() !== 'visible') {
            pendingAutoUpdate.value = true
            return
          }
          void handleNeedRefresh()
        },
        clearNeedRefresh: () => {
          needRefresh.value = false
          isUpdateAvailable.value = false
          pendingAutoUpdate.value = false
        },
        setOfflineReady: () => {
          isOfflineReady.value = true
        },
        setVisibility: (state: 'visible' | 'hidden') => {
          visibilityOverride = state
          updateUserActiveState()
        },
        setUpdating: (value: boolean) => {
          isUpdating.value = value
        },
        triggerVisibilityChange: () => handleVisibilityChange(),
        setSkipReload: (value: boolean) => {
          skipReloadForTests = value
        },
        completeUpdate: () => {
          isUpdating.value = false
          needRefresh.value = false
          isUpdateAvailable.value = false
          pendingAutoUpdate.value = false
        },
        getState: () => ({
          needRefresh: needRefresh.value,
          isUpdating: isUpdating.value,
          isUserActive: isUserActive.value,
          pendingAutoUpdate: pendingAutoUpdate.value,
        }),
      }
    }
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener('focus', handleFocus)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }

    if (window.__PWA_TEST__) {
      window.__PWA_TEST__ = undefined
    }
  })

  return {
    isUpdateAvailable,
    isOfflineReady,
    needRefresh,
    isUpdating,
    isUserActive,
    checkForUpdates,
    applyUpdate,
    skipWaiting
  }
}
