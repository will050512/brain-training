/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface Window {
    __PWA_TEST__?: {
      setNeedRefresh: () => void
      clearNeedRefresh: () => void
      setOfflineReady: () => void
      setVisibility: (state: 'visible' | 'hidden') => void
      setUpdating: (value: boolean) => void
      triggerVisibilityChange: () => void
      setSkipReload: (value: boolean) => void
      completeUpdate: () => void
      getState: () => {
        needRefresh: boolean
        isUpdating: boolean
        isUserActive: boolean
        pendingAutoUpdate: boolean
      }
    }
  }

  const __APP_VERSION__: string
}

// PWA 虛擬模組型別宣告
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: Error) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

export {}

declare const __APP_VERSION__: string
