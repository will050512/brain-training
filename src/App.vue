<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUserStore, useSettingsStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import InstallPrompt from '@/components/ui/InstallPrompt.vue'
import ConsentModal from '@/components/ui/ConsentModal.vue'
import { getDataConsent, checkConsentVersionNeedsUpdate } from '@/services/db'
import type { DataConsentOptions } from '@/types/user'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 初始化主題系統
const { initTheme } = useTheme()

// 同意對話框狀態
const showConsentModal = ref(false)
const consentModalRef = ref<InstanceType<typeof ConsentModal> | null>(null)

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
  <div class="app-container">
    <router-view v-slot="{ Component, route }">
      <transition 
        :name="route.meta.transition as string || 'fade'" 
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </router-view>
    
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
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  min-height: 100dvh;
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
