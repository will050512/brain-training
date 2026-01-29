<script setup lang="ts">
import { ref, onMounted, watch, computed, provide, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore, useSettingsStore } from '@/stores'
import { dataInitService } from '@/services/dataInitService'
import { useTheme } from '@/composables/useTheme'
import { useResponsive } from '@/composables/useResponsive'
import { useNotification } from '@/composables/useNotification'
import { useToast } from '@/composables/useToast'
import { useUiScale } from '@/composables/useUiScale'
import { usePWA } from '@/composables/usePWA'
import { backfillUserSessionsToSheet } from '@/services/googleSheetSyncService'
import { syncUserProfileToSheet } from '@/services/userSheetSyncService'
import { backfillAllUserDataToSheet } from '@/services/userDataSheetSyncService'
import AppShell from '@/components/layout/AppShell.vue'
import DesktopLayout from '@/components/layout/DesktopLayout.vue'
import MobileBottomNav from '@/components/ui/MobileBottomNav.vue'
import InstallPrompt from '@/components/ui/InstallPrompt.vue'
import ConsentModal from '@/components/ui/ConsentModal.vue'
import EducationPromptModal from '@/components/ui/EducationPromptModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import PWAUpdateBanner from '@/components/ui/PWAUpdateBanner.vue'
import { getDataConsent, checkConsentVersionNeedsUpdate } from '@/services/db'
import type { DataConsentOptions } from '@/types/user'
import type { LayoutType } from '@/types/layout'

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const { isMobile, isTablet, isDesktop } = useResponsive()
const { checkTrainingReminder, checkAssessmentReminder } = useNotification()
const toast = useToast()
useUiScale()
const { isOfflineReady, needRefresh, isUpdating, checkForUpdates, applyUpdate } = usePWA()

// 初始化主題系統
const { initTheme } = useTheme()

// 同意對話框狀態
const showConsentModal = ref(false)
const consentModalRef = ref<InstanceType<typeof ConsentModal> | null>(null)
const showEducationModal = ref(false)
const needsEducationYears = computed(() => {
  const user = userStore.currentUser
  if (!user) return false
  if (user.authProvider !== 'firebase') return false
  return !user.educationYears || user.educationYears <= 0
})

const updateGateState = ref<'checking' | 'blocked' | 'ready'>('checking')
const bootGateState = ref<'loading' | 'ready' | 'error'>('loading')
const refreshGateState = ref<'idle' | 'loading' | 'error'>('idle')
const isGameRoute = computed(() => route.meta.isGame === true || route.meta.layout === 'game')

const showUpdateGate = computed(() => updateGateState.value !== 'ready' || isUpdating.value)
const showLoadGate = computed(() => {
  if (showUpdateGate.value) return false
  if (bootGateState.value !== 'ready') return true
  if (refreshGateState.value === 'loading' || refreshGateState.value === 'error') {
    return !isGameRoute.value
  }
  return false
})

const updateGateMessage = computed(() => {
  if (isUpdating.value) return '正在更新版本，完成後會自動重新載入。'
  if (updateGateState.value === 'blocked') return '偵測到新版本，請先更新才能繼續。'
  return '請稍等，確認最新版後再開始使用。'
})

const updateGateTitle = computed(() => {
  if (isUpdating.value) return '版本更新中'
  if (updateGateState.value === 'blocked') return '需要更新'
  return '正在確認更新'
})

const loadGateTitle = computed(() => {
  if (bootGateState.value === 'loading') return '正在載入資料'
  if (refreshGateState.value === 'loading') return '同步最新資料'
  return '載入失敗'
})

const loadGateMessage = computed(() => {
  if (bootGateState.value === 'loading') return '請稍等，完成後會自動進入。'
  if (refreshGateState.value === 'loading') return '正在更新內容，請稍候。'
  return '載入時發生問題，請重新嘗試。'
})

watch(needsEducationYears, (needs) => {
  showEducationModal.value = needs
}, { immediate: true })

watch(needRefresh, (available) => {
  if (available) {
    updateGateState.value = 'blocked'
    return
  }
  if (updateGateState.value !== 'checking') {
    updateGateState.value = 'ready'
  }
})

// ===== 佈局系統 =====

/**
 * 根據路由 meta 和裝置類型決定實際佈局
 */
const effectiveLayout = computed<LayoutType>(() => {
  const routeLayout = route.meta.layout as LayoutType | undefined
  
  // 如果路由明確指定非 default 佈局，優先使用
  if (routeLayout && routeLayout !== 'default') {
    return routeLayout
  }
  
  // default 或未指定：根據裝置自動選擇
  if (isMobile.value) {
    return 'app'
  }
  
  return 'desktop'
})

/**
 * 是否使用 AppShell 佈局
 */
const useAppShell = computed(() => effectiveLayout.value === 'app')

/**
 * 是否使用 DesktopLayout 佈局
 */
const useDesktopLayout = computed(() => effectiveLayout.value === 'desktop')

/**
 * 是否為遊戲或全螢幕佈局（不使用外層包裝）
 */
const isFullscreenLayout = computed(() => 
  effectiveLayout.value === 'game' || effectiveLayout.value === 'fullscreen'
)

/**
 * 是否顯示手機底部導航
 * 只在手機 APP 佈局且非遊戲頁面時顯示
 */
const showMobileBottomNav = computed(() => {
  // 只在 AppShell 佈局時顯示
  if (!useAppShell.value) return false
  
  // 特定頁面不顯示底部導航
  const hiddenRoutes = ['game-play', 'game-preview', 'onboarding', 'login', 'assessment']
  if (hiddenRoutes.includes(route.name as string)) return false
  
  return true
})

/**
 * 當前頁面標題
 */
const pageTitle = computed(() => route.meta.title as string || '')

/**
 * 側邊欄收合狀態（從 settingsStore 讀取）
 */
const sidebarCollapsed = computed({
  get: () => settingsStore.sidebarCollapsed,
  set: (val) => settingsStore.setSidebarCollapsed(val)
})

// Provide 給子元件使用
provide('layoutInfo', {
  effectiveLayout,
  isMobile,
  isTablet,
  isDesktop,
  sidebarCollapsed,
})

// ===== 同意對話框邏輯 =====

// 檢查是否需要顯示同意對話框
// - 無記錄時需要同意
// - 版本更新時需要重新同意（CURRENT_CONSENT_VERSION 變更）
async function checkConsentStatus(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) {
    console.log('checkConsentStatus: No user ID available')
    return
  }
  
  try {
    const consent = await getDataConsent(odId)
    console.log('checkConsentStatus: Consent record for', odId, ':', consent)
    
    // 沒有同意記錄：需要顯示同意書
    if (!consent) {
      console.log('checkConsentStatus: No consent record, showing modal')
      showConsentModal.value = true
      return
    }
    
    // 版本更新時需要重新同意
    const needsUpdate = await checkConsentVersionNeedsUpdate(odId)
    console.log('checkConsentStatus: Needs update:', needsUpdate)
    if (needsUpdate) {
      showConsentModal.value = true
    }
  } catch (error) {
    console.error('Failed to check consent status:', error)
  }
}

// 處理同意確認
function handleConsentConfirmed(consent: DataConsentOptions): void {
  console.log('Consent confirmed:', consent)
  showConsentModal.value = false
  if (userStore.currentUser?.id) {
    backfillAllUserDataToSheet(userStore.currentUser.id, { force: true })
  }
}

// 處理跳過同意
function handleConsentSkipped(): void {
  console.log('Consent skipped')
  showConsentModal.value = false
}

async function handleEducationSave(years: number): Promise<void> {
  await userStore.updateEducationYears(years)
  await syncUserProfileToSheet(userStore.currentUser)
  showEducationModal.value = false
}

function reloadForLoadGate(): void {
  window.location.reload()
}

// 監聽使用者登入狀態變化
watch(() => userStore.currentUser, (newUser) => {
  if (newUser?.id) {
    settingsStore.setAssessmentUser(newUser.id)
    // 延遲檢查，確保 ID 已完全載入
    setTimeout(() => {
      checkConsentStatus()
      syncUserProfileToSheet(newUser)
      backfillAllUserDataToSheet(newUser.id)
    }, 100)
  } else {
    settingsStore.setAssessmentUser(null)
  }
}, { immediate: false })

async function handleOnline(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  if (refreshGateState.value !== 'loading' && !isGameRoute.value) {
    refreshGateState.value = 'loading'
  }
  try {
    await dataInitService.refreshUserDataFromSheet(odId, { mode: 'delta' })
    backfillUserSessionsToSheet(odId)
    syncUserProfileToSheet(userStore.currentUser)
    backfillAllUserDataToSheet(odId)
    refreshGateState.value = 'idle'
  } catch (error) {
    console.error('Failed to refresh user data:', error)
    refreshGateState.value = 'error'
  }
}

onMounted(async () => {
  bootGateState.value = 'loading'
  updateGateState.value = 'checking'
  await checkForUpdates()
  await new Promise(resolve => setTimeout(resolve, 600))
  if (!needRefresh.value) {
    updateGateState.value = 'ready'
  }

  try {
    // 初始化主題
    initTheme()
    
    // 載入設定
    settingsStore.loadSettings()
    
    // 嘗試恢復登入狀態
    await userStore.restoreSession()
    
    // 恢復登入後檢查同意狀態（確保 ID 存在）
    if (userStore.currentUser?.id) {
      settingsStore.setAssessmentUser(userStore.currentUser.id)
      await checkConsentStatus()
      // 舊用戶資料回填至 Google Sheet（背景執行）
      backfillUserSessionsToSheet(userStore.currentUser.id)
      syncUserProfileToSheet(userStore.currentUser)
      backfillAllUserDataToSheet(userStore.currentUser.id)
    }

    // 初始化數據同步服務
    await dataInitService.initialize()
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleOnline)
    bootGateState.value = 'ready'
  } catch (error) {
    console.error('Failed to bootstrap app:', error)
    bootGateState.value = 'error'
  }

  // 檢查提醒（延遲執行以免影響首屏載入）
  setTimeout(() => {
    // 1. 訓練提醒
    const trainingReminder = checkTrainingReminder()
    if (trainingReminder.shouldRemind && route.path !== '/') {
      toast.info(trainingReminder.message, { duration: 5000, icon: 'i' })
    }

    // 2. 評估提醒
    const lastAssessmentDate = settingsStore.assessmentResult?.completedAt || null
    const assessmentReminder = checkAssessmentReminder(lastAssessmentDate)
    if (assessmentReminder.shouldRemind) {
      // 如果從未評估過，且不是在 onboarding 或 assessment 頁面，才提醒
      const isAssessmentPage = route.path.includes('assessment') || route.path.includes('onboarding')
      if (!isAssessmentPage && route.path !== '/') {
        toast.warning(assessmentReminder.message, { duration: 8000, icon: '!' })
      }
    }
  }, 2000)
})

onUnmounted(() => {
  dataInitService.destroy()
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('focus', handleOnline)
})
</script>

<template>
  <div 
    class="app-container"
    :class="{
      'layout-app': useAppShell,
      'layout-desktop': useDesktopLayout,
      'layout-fullscreen': isFullscreenLayout,
    }"
  >
    <div v-if="showUpdateGate" class="app-update-gate" role="alertdialog" aria-live="assertive">
      <div class="app-update-card">
        <div class="text-3xl">🔄</div>
        <h2 class="app-update-title">{{ updateGateTitle }}</h2>
        <p class="app-update-message">{{ updateGateMessage }}</p>
        <div class="update-gate-visual" aria-hidden="true">
          <div class="funnel-spinner">
            <span class="funnel-emoji" aria-hidden="true">⏳</span>
          </div>
          <div class="update-progress">
            <div class="update-progress-bar"></div>
          </div>
        </div>
        <div class="app-update-actions">
          <button
            v-if="updateGateState === 'blocked'"
            class="btn btn-primary"
            :disabled="isUpdating"
            @click="applyUpdate"
          >
            {{ isUpdating ? '更新中...' : '立即更新' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLoadGate" class="app-update-gate" role="status" aria-live="polite">
      <div class="app-update-card">
        <div class="text-3xl">⏳</div>
        <h2 class="app-update-title">{{ loadGateTitle }}</h2>
        <p class="app-update-message">{{ loadGateMessage }}</p>
        <div class="update-gate-visual" aria-hidden="true">
          <div class="funnel-spinner">
            <span class="funnel-emoji" aria-hidden="true">⏳</span>
          </div>
          <div class="update-progress">
            <div class="update-progress-bar"></div>
          </div>
        </div>
        <div class="app-update-actions">
          <button
            v-if="bootGateState === 'error' || refreshGateState === 'error'"
            class="btn btn-primary"
            @click="reloadForLoadGate"
          >
            重新載入
          </button>
        </div>
      </div>
    </div>

    <!-- 桌面版佈局 -->
    <DesktopLayout 
      v-if="useDesktopLayout"
      :default-collapsed="sidebarCollapsed"
      @update:collapsed="sidebarCollapsed = $event"
    >
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition 
          :name="currentRoute.meta.transition as string || 'fade'" 
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </DesktopLayout>
    
    <!-- 手機 APP 佈局 -->
    <AppShell 
      v-else-if="useAppShell"
      :title="pageTitle"
      :show-back="!!route.meta.showBack"
      :scrollable="true"
      :has-bottom-nav="showMobileBottomNav"
    >
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition 
          :name="currentRoute.meta.transition as string || 'fade'" 
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </AppShell>
    
    <!-- 手機底部導航列 -->
    <MobileBottomNav v-if="showMobileBottomNav" />
    
    <!-- 全螢幕/遊戲佈局（無外層包裝） -->
    <template v-if="isFullscreenLayout">
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition 
          :name="currentRoute.meta.transition as string || 'fade'" 
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </template>
    
    <!-- PWA 安裝提示 -->
    <InstallPrompt />
    
    <!-- PWA 更新提示 -->
    <PWAUpdateBanner
      :need-refresh="needRefresh"
      :is-offline-ready="isOfflineReady"
      :is-updating="isUpdating"
      :force-update="needRefresh"
      :on-apply-update="applyUpdate"
    />

    <!-- 學歷補充對話框（外部登入） -->
    <EducationPromptModal
      v-model="showEducationModal"
      :initial-years="userStore.currentUser?.educationYears ?? null"
      @save="handleEducationSave"
    />
    
    <!-- 資料使用同意對話框 -->
    <ConsentModal
      ref="consentModalRef"
      v-model="showConsentModal"
      :allow-skip="true"
      @confirmed="handleConsentConfirmed"
      @skipped="handleConsentSkipped"
    />
    
    <!-- Toast 通知 -->
    <ToastNotification />

  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  min-height: 100dvh;
  min-height: var(--app-height);
}

.app-update-gate {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: var(--color-overlay);
}

.app-update-card {
  width: min(420px, 100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-lg);
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.app-update-title {
  margin: var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.app-update-message {
  margin: 0 0 var(--spacing-md);
  color: var(--color-text-secondary);
}

.app-update-actions {
  display: flex;
  justify-content: center;
}

.update-gate-visual {
  display: grid;
  gap: var(--spacing-sm);
  justify-items: center;
  margin: 0 0 var(--spacing-md);
}

.funnel-spinner {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  animation: funnel-spin 2.8s linear infinite;
}

.funnel-emoji {
  font-size: 20px;
  line-height: 1;
}

.update-progress {
  width: min(280px, 70vw);
  height: 8px;
  border-radius: 999px;
  background: var(--color-border);
  overflow: hidden;
}

.update-progress-bar {
  width: 45%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent, var(--color-primary)));
  animation: progress-sweep 1.6s ease-in-out infinite;
}

@keyframes funnel-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes progress-sweep {
  0% {
    transform: translateX(-70%);
  }
  50% {
    transform: translateX(60%);
  }
  100% {
    transform: translateX(140%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .funnel-spinner,
  .update-progress-bar {
    animation: none;
  }
}

/* 桌面佈局時，內容已由 DesktopLayout 處理 */
.layout-desktop {
  /* DesktopLayout 會自行處理 flex 佈局 */
}

/* 手機 APP 佈局時，內容已由 AppShell 處理 */
.layout-app {
  /* AppShell 會自行處理 flex 佈局 */
}

/* 全螢幕佈局 */
.layout-fullscreen {
  display: flex;
  flex-direction: column;
}

/* 頁面過渡動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
