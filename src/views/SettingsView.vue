<template>
  <div class="app-page">
    <!-- APP 頭部 -->
    <header class="app-header">
      <router-link to="/" class="text-2xl">←</router-link>
      <h1 class="text-lg font-bold text-[var(--color-text)]">設定</h1>
      <div class="w-8"></div>
    </header>

    <!-- 可滾動內容區 -->
    <div class="app-content-scroll">
      <div class="p-3 sm:p-4 max-w-3xl mx-auto flex flex-col gap-3">
        <!-- 外觀主題設定 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🎨</span>
            <h3 class="font-semibold text-[var(--color-text)]">外觀主題</h3>
          </div>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="settingsStore.setThemeMode('light')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'light' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]' 
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">☀️</span>
              <span class="text-sm font-medium">淺色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('dark')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'dark' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]' 
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">🌙</span>
              <span class="text-sm font-medium">深色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('system')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'system' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]' 
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">🖥️</span>
              <span class="text-sm font-medium">自動</span>
            </button>
          </div>
        </div>

        <!-- 訓練目標設定 -->
        <div class="card overflow-hidden">
          <TrainingGoalSettings />
        </div>

        <!-- 外觀與無障礙 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">👁️</span>
            <h3 class="font-semibold text-[var(--color-text)]">外觀與無障礙</h3>
          </div>

          <!-- 字體大小 -->
          <div class="mb-4">
            <div class="text-sm font-medium text-[var(--color-text-secondary)] mb-2 px-1">字體大小</div>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="option in fontSizeOptions"
                :key="option.value"
                @click="settingsStore.setFontSize(option.value)"
                class="btn-option flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-h-[44px]"
                :class="settingsStore.fontSize === option.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
              >
                <span class="font-bold" :style="{ fontSize: option.value === 'small' ? '0.75rem' : option.value === 'large' ? '1.125rem' : option.value === 'xlarge' ? '1.25rem' : '0.875rem' }">A</span>
                <span class="text-[10px] sm:text-xs mt-1 opacity-80">{{ option.label }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <!-- 高對比 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.highContrast = !settingsStore.highContrast">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">高對比模式</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">提升文字與背景對比度</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.highContrast }"
                aria-label="切換高對比模式"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <!-- 減少動畫 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.reduceMotion = !settingsStore.reduceMotion">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">減少動畫</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">降低動態效果，減少視覺干擾</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.reduceMotion }"
                aria-label="切換減少動畫"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- 螢幕方向設定 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">📱</span>
            <h3 class="font-semibold text-[var(--color-text)]">螢幕方向</h3>
          </div>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="settingsStore.setOrientationPreference('portrait')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.orientationPreference === 'portrait'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">📱</span>
              <span class="text-sm font-medium">直向</span>
            </button>

            <button
              @click="settingsStore.setOrientationPreference('landscape')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.orientationPreference === 'landscape'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">📺</span>
              <span class="text-sm font-medium">橫向</span>
            </button>

            <button
              @click="settingsStore.setOrientationPreference('auto')"
              class="btn-option flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all"
              :class="settingsStore.orientationPreference === 'auto'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]'"
            >
              <span class="text-2xl">🔄</span>
              <span class="text-sm font-medium">自動</span>
            </button>
          </div>
          
          <!-- 不支援提示 -->
          <p 
            v-if="!settingsStore.orientationSupported" 
            class="text-xs text-[var(--color-warning)] bg-[var(--color-warning-bg)] p-2 rounded-lg mt-3 flex items-start gap-2"
          >
            <span class="mt-0.5">⚠️</span>
            <span>您的裝置不支援自動旋轉鎖定，請使用系統設定調整。</span>
          </p>
        </div>

        <!-- 音效與回饋 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🔊</span>
            <h3 class="font-semibold text-[var(--color-text)]">音效與回饋</h3>
          </div>
          
          <div class="space-y-4">
            <!-- 遊戲音效 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.toggleSound()">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">遊戲音效</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">答對、答錯等互動音效</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.soundEnabled }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>
            
            <!-- 背景音樂 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.toggleMusic()">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">背景音樂</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">遊戲過程中的背景音樂</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.musicEnabled }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <!-- 語音提示 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.enableVoicePrompts = !settingsStore.enableVoicePrompts">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">語音提示</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">提供語音引導（若支援）</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.enableVoicePrompts }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <!-- 震動回饋 -->
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.enableHapticFeedback = !settingsStore.enableHapticFeedback">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">震動回饋</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">觸控時的輕微震動</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.enableHapticFeedback }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- 提醒設定 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🔔</span>
            <h3 class="font-semibold text-[var(--color-text)]">提醒設定</h3>
          </div>

          <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="settingsStore.assessmentReminderEnabled = !settingsStore.assessmentReminderEnabled">
            <div class="flex-1 pr-4">
              <div class="text-base font-medium text-[var(--color-text)]">每月評估提醒</div>
              <div class="text-xs text-[var(--color-text-muted)] mt-0.5">距離上次評估超過 30 天提醒</div>
            </div>
            <button
              class="toggle-switch flex-shrink-0"
              :class="{ 'toggle-on': settingsStore.assessmentReminderEnabled }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>

        <!-- 隱私與同意 -->
        <div v-if="userStore.isLoggedIn" class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🔒</span>
            <h3 class="font-semibold text-[var(--color-text)]">隱私與同意</h3>
          </div>

          <div class="space-y-4">
            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="toggleCloudBackup()">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">雲端備份</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">允許將資料備份到雲端</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': consentState?.analyticsConsent }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <div class="setting-item flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors" @click="toggleUsageAnalytics()">
              <div class="flex-1 pr-4">
                <div class="text-base font-medium text-[var(--color-text)]">使用分析（本機）</div>
                <div class="text-xs text-[var(--color-text-muted)] mt-0.5">啟用行為記錄以產生洞察</div>
              </div>
              <button
                class="toggle-switch flex-shrink-0"
                :class="{ 'toggle-on': settingsStore.enableBehaviorTracking }"
              >
                <span class="toggle-thumb"></span>
              </button>
            </div>

            <div class="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] p-3 rounded-lg leading-relaxed">
              資料預設儲存在您的裝置上。雲端備份為選用功能，需要 Google 帳戶授權。我們重視您的隱私，不會在未經許可的情況下分享您的資料。
            </div>
          </div>
        </div>

        <!-- 資料同步 -->
        <div v-if="userStore.isLoggedIn" class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">☁️</span>
            <h3 class="font-semibold text-[var(--color-text)]">資料同步</h3>
          </div>
          
          <div class="bg-[var(--color-bg-soft)] rounded-lg p-3 mb-3">
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-[var(--color-border-light)]">
              <span class="text-sm font-medium text-[var(--color-text-secondary)]">同步狀態</span>
              <span class="text-sm font-bold" :class="syncStatusClass">{{ syncStatusLabel }}</span>
            </div>
            
            <div class="space-y-2 text-xs text-[var(--color-text-muted)]">
               <div class="flex justify-between">
                <span>手動同步</span>
                <SyncStatusIndicator />
              </div>
              <div class="flex justify-between">
                <span>上次同步</span>
                <span class="font-mono text-[var(--color-text)]">{{ formatSyncTime(settingsStore.lastManualSyncAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span>遊戲記錄上傳</span>
                <span class="font-mono text-[var(--color-text)]">{{ formatSyncTime(syncStatus.session.lastSuccessAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span>個人資料上傳</span>
                <span class="font-mono text-[var(--color-text)]">{{ formatSyncTime(syncStatus.user.lastSuccessAt) }}</span>
              </div>
            </div>
          </div>

          <div v-if="settingsStore.lastManualSyncError" class="text-xs text-[var(--color-danger)] mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
            ⚠️ 同步失敗：{{ settingsStore.lastManualSyncError }}
          </div>
          <div v-if="syncStatus.session.lastErrorAt || syncStatus.user.lastErrorAt" class="text-xs text-[var(--color-danger)] mb-2 bg-[var(--color-danger-bg)] p-2 rounded">
            ⚠️ 最近同步失敗：{{ formatSyncTime(syncStatus.session.lastErrorAt || syncStatus.user.lastErrorAt) }}
          </div>

          <button
            class="btn btn-secondary w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
            :disabled="!canManualSync"
            @click="handleManualSync"
          >
            <span>🔄</span> 立即同步
          </button>
          
          <p class="text-xs text-[var(--color-text-muted)] mt-2 text-center">
            需開啟「雲端備份」且在連線狀態下才能同步
          </p>
        </div>

        <!-- 帳號資訊 -->
        <div v-if="userStore.isLoggedIn" class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">👤</span>
            <h3 class="font-semibold text-[var(--color-text)]">帳號資訊</h3>
          </div>
          
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-4 mb-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] flex items-center justify-center text-xl font-bold">
              {{ userStore.currentUser?.name?.charAt(0) || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-lg text-[var(--color-text)] truncate">{{ userStore.currentUser?.name }}</div>
              <div class="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                <span class="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">{{ userStore.userAge }} 歲</span>
                <span class="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">{{ authProviderLabel }}</span>
              </div>
            </div>
          </div>
          
          <button 
            @click="handleLogout" 
            class="btn btn-outline w-full py-2.5 text-sm font-medium border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
          >
            登出 / 切換帳號
          </button>
        </div>

        <!-- 訓練統計 (精簡版) -->
        <div v-if="userStore.isLoggedIn && userStore.currentStats" class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">📊</span>
            <h3 class="font-semibold text-[var(--color-text)]">訓練概況</h3>
          </div>
          
          <div class="grid grid-cols-4 gap-2">
            <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="text-lg font-bold text-[var(--color-primary)]">{{ totalGamesPlayed }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)]">次數</span>
            </div>
            <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="text-lg font-bold text-[var(--color-score-good)]">{{ Math.round(userStore.currentStats.averageScore) }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)]">均分</span>
            </div>
            <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="text-lg font-bold text-[var(--color-combo)]">{{ userStore.currentStats.streak }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)]">連勝</span>
            </div>
            <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
              <span class="text-sm font-bold text-[var(--color-progress)] mt-1">{{ formatPlayTime(userStore.currentStats.totalPlayTime).replace('小時','h').replace('分','m').replace('秒','s') }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)]">時長</span>
            </div>
          </div>
        </div>

        <!-- 其他設定 -->
        <div class="card p-3 sm:p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">⚙️</span>
            <h3 class="font-semibold text-[var(--color-text)]">進階操作</h3>
          </div>
          
          <div class="flex flex-col gap-2">
            <button 
              @click="resetWelcome" 
              class="btn bg-[var(--color-bg-soft)] text-[var(--color-text)] hover:bg-[var(--color-border-light)] w-full py-3 text-sm font-medium rounded-xl transition-colors text-left px-4 flex justify-between items-center"
            >
              <span>重新顯示歡迎畫面</span>
              <span class="text-[var(--color-text-muted)]">→</span>
            </button>
            
            <button 
              v-if="userStore.isLoggedIn"
              @click="confirmClearData" 
              class="btn bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:opacity-80 dark:hover:bg-[var(--color-danger-bg)] dark:hover:opacity-80 w-full py-3 text-sm font-medium rounded-xl transition-colors text-left px-4 flex justify-between items-center"
            >
              <span>清除所有遊戲記錄</span>
              <span>🗑️</span>
            </button>
          </div>
        </div>

        <!-- 關於 -->
        <div class="text-center py-6 pb-10">
          <img src="@/assets/logo.svg" alt="愛護腦" class="w-12 h-12 mx-auto mb-3 opacity-80 filter grayscale hover:grayscale-0 transition-all duration-500" />
          <p class="font-bold text-[var(--color-text)] text-sm mb-1">愛護腦 AI MindCare</p>
          <p class="text-[var(--color-text-muted)] text-xs">v{{ appVersion }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore, useGameStore } from '@/stores'
import { clearUserGameSessions, getDataConsent, saveDataConsent } from '@/services/db'
import TrainingGoalSettings from '@/components/ui/TrainingGoalSettings.vue'
import SyncStatusIndicator from '@/components/common/SyncStatusIndicator.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTotalGamesPlayed } from '@/utils/trainingStats'
import { loadClientSourceForUser } from '@/services/clientSource'
import { backfillUserSessionsToSheet, loadSessionSyncStatus } from '@/services/googleSheetSyncService'
import { backfillAllUserDataToSheet } from '@/services/userDataSheetSyncService'
import { loadUserSyncStatus } from '@/services/userSheetSyncService'
import { FONT_SIZE_LABELS, type FontSize } from '@/stores/settingsStore'
import { CURRENT_CONSENT_VERSION, defaultDataConsent, type DataConsentOptions } from '@/types/user'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()
const appVersion = __APP_VERSION__ || 'Unknown'
const fontSizeOptions = (Object.entries(FONT_SIZE_LABELS) as Array<[FontSize, string]>).map(([value, label]) => ({
  value,
  label
}))

const syncStatus = ref({
  session: {
    lastAttemptAt: null as string | null,
    lastSuccessAt: null as string | null,
    lastErrorAt: null as string | null,
    lastErrorMessage: null as string | null,
  },
  user: {
    lastAttemptAt: null as string | null,
    lastSuccessAt: null as string | null,
    lastErrorAt: null as string | null,
    lastErrorMessage: null as string | null,
  },
  consent: 'unknown' as 'allowed' | 'blocked' | 'unknown',
  online: true,
})
const consentState = ref<DataConsentOptions | null>(null)

const totalGamesPlayed = computed(() => {
  return getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
})

const authProviderLabel = computed(() => {
  const provider = userStore.currentUser?.authProvider
  if (provider === 'firebase') return 'App / Firebase'
  if (provider === 'local') return '本機帳號'
  return '未知'
})

const clientSourceLabel = computed(() => {
  const odId = userStore.currentUser?.id
  const source = userStore.currentUser?.clientSource || (odId ? loadClientSourceForUser(odId) : undefined)
  switch (source) {
    case 'app-android':
      return 'App Android'
    case 'app-ios':
      return 'App iOS'
    case 'app-web':
      return 'App Web'
    case 'pwa':
      return 'PWA'
    case 'web':
      return '瀏覽器'
    case 'unknown':
      return '未知'
    default:
      return source ? String(source) : '未知'
  }
})

const syncStatusLabel = computed(() => {
  if (!userStore.isLoggedIn) return '未登入'
  if (!syncStatus.value.online) return '離線'
  if (syncStatus.value.consent === 'blocked') return '未啟用'
  if (syncStatus.value.consent === 'unknown') return '未知'
  return '啟用中'
})

const syncStatusClass = computed(() => {
  if (!userStore.isLoggedIn) return 'text-[var(--color-text-muted)]'
  if (!syncStatus.value.online || syncStatus.value.consent !== 'allowed') return 'text-[var(--color-warning)]'
  return 'text-[var(--color-success)]'
})

const canManualSync = computed(() => {
  if (!userStore.isLoggedIn) return false
  if (!settingsStore.enableBehaviorTracking) return false
  if (syncStatus.value.consent !== 'allowed') return false
  if (!syncStatus.value.online) return false
  return settingsStore.syncUiStatus !== 'syncing'
})

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  const hours = Math.floor(seconds / 3600)
  return `${hours}時`
}

function formatSyncTime(value: string | null): string {
  if (!value) return '尚未同步'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '尚未同步'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}

function refreshSyncStatus(): void {
  const odId = userStore.currentUser?.id
  if (!odId) return
  syncStatus.value.session = loadSessionSyncStatus(odId)
  syncStatus.value.user = loadUserSyncStatus(odId)
  syncStatus.value.online = typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function refreshConsentStatus(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  try {
    const consent = await getDataConsent(odId)
    syncStatus.value.consent = consent?.analyticsConsent ? 'allowed' : 'blocked'
    consentState.value = consent || {
      ...defaultDataConsent(odId),
      essentialConsent: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: CURRENT_CONSENT_VERSION
    }
  } catch {
    syncStatus.value.consent = 'unknown'
  }
}

async function toggleCloudBackup(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  const base = consentState.value || {
    ...defaultDataConsent(odId),
    essentialConsent: true,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  const next = {
    ...base,
    analyticsConsent: !base.analyticsConsent,
    behaviorTrackingConsent: base.analyticsConsent ? false : base.behaviorTrackingConsent,
    detailedBehaviorConsent: base.analyticsConsent ? false : base.detailedBehaviorConsent,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  consentState.value = next
  await saveDataConsent(next)
  syncStatus.value.consent = next.analyticsConsent ? 'allowed' : 'blocked'
}

async function toggleUsageAnalytics(): Promise<void> {
  const enabled = !settingsStore.enableBehaviorTracking
  settingsStore.toggleBehaviorTracking(enabled)
  const odId = userStore.currentUser?.id
  if (!odId) return
  const base = consentState.value || {
    ...defaultDataConsent(odId),
    essentialConsent: true,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  const next = {
    ...base,
    behaviorTrackingConsent: enabled,
    detailedBehaviorConsent: enabled ? base.detailedBehaviorConsent : false,
    consentTimestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION
  }
  consentState.value = next
  await saveDataConsent(next)
}

// 登出
function handleLogout(): void {
  userStore.logout()
  localStorage.removeItem('brain-training-current-user')
  router.push('/login')
}

// 重置歡迎畫面
function resetWelcome(): void {
  settingsStore.resetWelcome()
  alert('下次進入首頁時將顯示歡迎畫面')
}

// 確認清除資料
async function confirmClearData(): Promise<void> {
  if (!userStore.currentUser) return
  
  const confirmed = confirm('確定要清除所有遊戲記錄嗎？此操作無法復原。')
  if (!confirmed) return
  
  try {
    await clearUserGameSessions(userStore.currentUser.id)
    await gameStore.loadUserSessions(userStore.currentUser.id)
    await userStore.updateStats({
      totalGamesPlayed: 0,
      totalPlayTime: 0,
      averageScore: 0,
      bestScores: {},
      lastPlayedAt: null,
      streak: 0,
    })
    alert('遊戲記錄已清除')
  } catch {
    alert('清除失敗，請稍後再試')
  }
}

function handleStatusRefresh(): void {
  refreshSyncStatus()
  refreshConsentStatus()
}

async function handleManualSync(): Promise<void> {
  const odId = userStore.currentUser?.id
  if (!odId) return
  if (!settingsStore.enableBehaviorTracking) {
    console.info('[Sync] Skipped: behavior tracking disabled.')
    return
  }
  if (syncStatus.value.consent !== 'allowed') {
    settingsStore.setSyncUiStatus('error', '需同意分析資料收集')
    return
  }
  if (!syncStatus.value.online) {
    settingsStore.setSyncUiStatus('error', '目前離線，無法同步')
    return
  }
  settingsStore.setSyncUiStatus('syncing')
  try {
    await backfillAllUserDataToSheet(odId, { force: true })
    await backfillUserSessionsToSheet(odId)
    settingsStore.setSyncUiStatus('success')
    refreshSyncStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync failed'
    settingsStore.setSyncUiStatus('error', message)
  }
}

watch(() => userStore.currentUser?.id, (id) => {
  if (id) {
    handleStatusRefresh()
  }
})

onMounted(() => {
  handleStatusRefresh()
  window.addEventListener('online', handleStatusRefresh)
  window.addEventListener('focus', handleStatusRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleStatusRefresh)
  window.removeEventListener('focus', handleStatusRefresh)
})
</script>

<style scoped>
/* Toggle Switch 開關樣式 */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 9999px;
  background-color: var(--color-bg-muted, #e5e7eb);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;
}

.toggle-switch.toggle-on {
  background-color: var(--color-primary, #6366f1);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-switch.toggle-on .toggle-thumb {
  transform: translateX(24px);
}
</style>
