<script setup lang="ts">
import { ref, onMounted, watch, computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore, useSettingsStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import { useResponsive } from '@/composables/useResponsive'
import AppShell from '@/components/layout/AppShell.vue'
import DesktopLayout from '@/components/layout/DesktopLayout.vue'
import InstallPrompt from '@/components/ui/InstallPrompt.vue'
import ConsentModal from '@/components/ui/ConsentModal.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { getDataConsent, checkConsentVersionNeedsUpdate } from '@/services/db'
import type { DataConsentOptions } from '@/types/user'
import type { LayoutType } from '@/types/layout'

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const { isMobile, isTablet, isDesktop } = useResponsive()

// 初始化主題系統
const { initTheme } = useTheme()

// 同意對話框狀態
const showConsentModal = ref(false)
const consentModalRef = ref<InstanceType<typeof ConsentModal> | null>(null)

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
async function checkConsentStatus(): Promise<void> {
  if (!userStore.currentUser?.id) return
  
  const odId = userStore.currentUser.id
  
  try {
    const consent = await getDataConsent(odId)
    
    // 沒有同意記錄，需要顯示對話框
    if (!consent) {
      showConsentModal.value = true
      return
    }
    
    // 檢查版本是否需要更新
    const needsUpdate = await checkConsentVersionNeedsUpdate(odId)
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
}

// 處理跳過同意
function handleConsentSkipped(): void {
  console.log('Consent skipped')
  showConsentModal.value = false
}

// 監聽使用者登入狀態變化
watch(() => userStore.currentUser, (newUser) => {
  if (newUser) {
    checkConsentStatus()
  }
}, { immediate: false })

onMounted(async () => {
  // 初始化主題
  initTheme()
  
  // 載入設定
  settingsStore.loadSettings()
  
  // 嘗試恢復登入狀態
  await userStore.restoreSession()
  
  // 恢復登入後檢查同意狀態
  if (userStore.currentUser) {
    await checkConsentStatus()
  }
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
    
    <!-- 全螢幕/遊戲佈局（無外層包裝） -->
    <template v-else>
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
