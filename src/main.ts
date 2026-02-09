import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { registerAllGames } from './games'
import { initDatabase } from './services/db'
import { initMigrations } from './services/migrationService'
import { initExternalAuthBridge } from './services/externalAuthBridge'
import { dataInitService } from './services/dataInitService'
import { initAutoSync } from './services/offlineSyncService'
import { setStoredBuildHash } from './services/versionService'
import { useUserStore } from './stores/userStore'
import { perfEnd, perfStart } from './utils/perf'
import './style.css'

let viewportRafId: number | null = null
let viewportObserver: ResizeObserver | null = null
const ultraShortQuery = window.matchMedia('(orientation: landscape) and (max-height: 400px)')
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

const isEditableElement = (element: Element | null): boolean => {
  if (!element) return false
  if (element instanceof HTMLInputElement) return true
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLSelectElement) return true
  if (element instanceof HTMLElement && element.isContentEditable) return true
  return false
}

const applyUltraShortClass = (): void => {
  const root = document.documentElement
  if (ultraShortQuery.matches) {
    root.classList.add('is-ultra-short')
    return
  }
  root.classList.remove('is-ultra-short')
}

function setViewportHeight(): void {
  if (viewportRafId !== null) return
  viewportRafId = window.requestAnimationFrame(() => {
    viewportRafId = null
    const viewport = window.visualViewport
    const viewportHeight = viewport?.height ?? window.innerHeight
    document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`)

    if (viewport && viewport.offsetTop > 0 && !isEditableElement(document.activeElement)) {
      window.scrollTo(0, 0)
    }

    applyUltraShortClass()
  })
}

function initViewportHeightFix(): void {
  setViewportHeight()
  window.addEventListener('resize', setViewportHeight)
  window.addEventListener('orientationchange', setViewportHeight)
  window.visualViewport?.addEventListener('resize', setViewportHeight)
  window.visualViewport?.addEventListener('scroll', setViewportHeight)

  if ('ResizeObserver' in window) {
    viewportObserver = new ResizeObserver(() => {
      setViewportHeight()
    })
    viewportObserver.observe(document.documentElement)
  }

  if (typeof ultraShortQuery.addEventListener === 'function') {
    ultraShortQuery.addEventListener('change', setViewportHeight)
  } else if (typeof (ultraShortQuery as LegacyMediaQueryList).addListener === 'function') {
    ultraShortQuery.addListener(setViewportHeight)
  }
}

// 建立應用程式
const app = createApp(App)

// 使用 Pinia 狀態管理
const pinia = createPinia()
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 應用程式初始化
registerAllGames()

async function bootstrap() {
  try {
    perfStart('bootstrap')
    initViewportHeightFix()

    // 啟動外部登入橋接（供 App / Firebase WebView 傳遞用戶資料）
    // 先註冊 message 監聽，避免 WebView 提早送出而遺失
    initExternalAuthBridge()

    // 初始化資料庫
    perfStart('initDatabase')
    await initDatabase()
    perfEnd('initDatabase')
    console.log('Database initialized')
    
    // 執行資料遷移
    perfStart('initMigrations')
    await initMigrations()
    perfEnd('initMigrations')
    console.log('Migrations completed')

    // 初始化同步與資料訂閱（每日訓練狀態、離線同步）
    perfStart('dataInitService.initialize')
    await dataInitService.initialize()
    perfEnd('dataInitService.initialize')
    initAutoSync()

    // 恢復使用者 session（避免直接進入需要登入的頁面造成狀態不一致）
    const userStore = useUserStore()
    const savedUserId = localStorage.getItem('brain-training-current-user')
      || localStorage.getItem('brain-training-last-user')
    if (savedUserId && !userStore.isLoggedIn) {
      perfStart('userStore.quickLogin')
      void userStore.quickLogin(savedUserId).finally(() => {
        perfEnd('userStore.quickLogin')
      })
    }
    
    // 掛載應用程式
    app.mount('#app')
    console.log('App mounted')
    perfEnd('bootstrap')

    if (__BUILD_HASH__) {
      perfStart('setStoredBuildHash')
      await setStoredBuildHash(__BUILD_HASH__)
      perfEnd('setStoredBuildHash')
    }
    window.__APP_BOOT_READY__ = true
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // 即使初始化失敗也嘗試掛載應用程式
    app.mount('#app')
    window.__APP_BOOT_READY__ = true
  }
}

bootstrap()
