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
      <div class="p-4 section-stack">
        <!-- 外觀主題設定 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">🎨 外觀主題</h3>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="settingsStore.setThemeMode('light')"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'light' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl">☀️</span>
              <span class="text-sm text-[var(--color-text)]">淺色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('dark')"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'dark' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl">🌙</span>
              <span class="text-sm text-[var(--color-text)]">深色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('system')"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'system' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl">🖥️</span>
              <span class="text-sm text-[var(--color-text)]">自動</span>
            </button>
          </div>
        </div>

        <!-- 訓練目標設定 -->
        <div class="card">
          <TrainingGoalSettings />
        </div>

        <!-- 外觀與無障礙 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">外觀與無障礙</h3>

          <!-- 字體大小 -->
          <div class="mb-4">
            <div class="text-sm font-medium text-[var(--color-text)] mb-2">字體大小</div>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="option in fontSizeOptions"
                :key="option.value"
                @click="settingsStore.setFontSize(option.value)"
                class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
                :class="settingsStore.fontSize === option.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                  : 'border-[var(--color-border)]'"
              >
                <span class="text-sm font-semibold text-[var(--color-text)]">{{ option.label }}</span>
              </button>
            </div>
          </div>

          <!-- 高對比 -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">高對比模式</div>
              <div class="text-xs text-[var(--color-text-muted)]">提升文字與背景對比</div>
            </div>
            <button
              @click="settingsStore.highContrast = !settingsStore.highContrast"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.highContrast }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <!-- 減少動畫 -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">減少動畫</div>
              <div class="text-xs text-[var(--color-text-muted)]">降低動態效果帶來的不適</div>
            </div>
            <button
              @click="settingsStore.reduceMotion = !settingsStore.reduceMotion"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.reduceMotion }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>

        <!-- 螢幕方向設定 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">📱 螢幕方向</h3>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              @click="settingsStore.setOrientationPreference('portrait')"
              class="flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[60px] sm:min-h-[80px]"
              :class="settingsStore.orientationPreference === 'portrait'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl sm:text-2xl">📱</span>
              <span class="text-xs sm:text-sm text-[var(--color-text)]">直向</span>
            </button>

            <button
              @click="settingsStore.setOrientationPreference('landscape')"
              class="flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[60px] sm:min-h-[80px]"
              :class="settingsStore.orientationPreference === 'landscape'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl sm:text-2xl">📺</span>
              <span class="text-xs sm:text-sm text-[var(--color-text)]">橫向</span>
            </button>

            <button
              @click="settingsStore.setOrientationPreference('auto')"
              class="flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[60px] sm:min-h-[80px]"
              :class="settingsStore.orientationPreference === 'auto'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                : 'border-[var(--color-border)]'"
            >
              <span class="text-xl sm:text-2xl">🔄</span>
              <span class="text-xs sm:text-sm text-[var(--color-text)]">自動</span>
            </button>
          </div>
          
          <!-- 不支援提示 -->
          <p 
            v-if="!settingsStore.orientationSupported" 
            class="text-xs text-[var(--color-text-muted)] mt-3 flex items-center gap-1"
          >
            <span>⚠️</span>
            <span>您的裝置/瀏覽器不支援自動方向鎖定，請手動旋轉螢幕</span>
          </p>
        </div>

        <!-- 音效與回饋 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">🔊 音效與回饋</h3>
          
          <!-- 遊戲音效 -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">遊戲音效</div>
            </div>
            <button
              @click="settingsStore.toggleSound()"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.soundEnabled }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>
          
          <!-- 背景音樂 -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">背景音樂</div>
            </div>
            <button
              @click="settingsStore.toggleMusic()"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.musicEnabled }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <!-- 語音提示 -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">語音提示</div>
              <div class="text-xs text-[var(--color-text-muted)]">提供語音引導（若有支援）</div>
            </div>
            <button
              @click="settingsStore.enableVoicePrompts = !settingsStore.enableVoicePrompts"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.enableVoicePrompts }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <!-- 震動回饋 -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">震動回饋</div>
              <div class="text-xs text-[var(--color-text-muted)]">在支援裝置提供觸覺回饋</div>
            </div>
            <button
              @click="settingsStore.enableHapticFeedback = !settingsStore.enableHapticFeedback"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.enableHapticFeedback }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>

        <!-- 提醒設定 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">🔔 提醒設定</h3>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">每月評估提醒</div>
              <div class="text-xs text-[var(--color-text-muted)]">距離上次 Mini-Cog/評估超過 30 天會提醒</div>
            </div>
            <button
              @click="settingsStore.assessmentReminderEnabled = !settingsStore.assessmentReminderEnabled"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.assessmentReminderEnabled }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>

        <!-- 隱私與同意 -->
        <div v-if="userStore.isLoggedIn" class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">隱私與同意</h3>

          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">雲端備份（Google Sheets）</div>
              <div class="text-xs text-[var(--color-text-muted)]">允許將訓練資料備份到雲端</div>
            </div>
            <button
              @click="toggleCloudBackup()"
              class="toggle-switch"
              :class="{ 'toggle-on': consentState?.analyticsConsent }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-[var(--color-text)]">使用分析（本機）</div>
              <div class="text-xs text-[var(--color-text-muted)]">啟用行為記錄以產生訓練洞察</div>
            </div>
            <button
              @click="toggleUsageAnalytics()"
              class="toggle-switch"
              :class="{ 'toggle-on': settingsStore.enableBehaviorTracking }"
            >
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <div class="text-xs text-[var(--color-text-muted)] mt-2">
            資料預設只儲存在您的裝置上，雲端備份為選用功能且需要 Google 帳戶授權。
          </div>
        </div>

        <!-- 資料同步 -->
        <div v-if="userStore.isLoggedIn" class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-3">資料同步</h3>
          <p class="text-xs text-[var(--color-text-muted)] mb-3">
            會將遊戲與個人資料同步到 Google Sheet，方便後續分析。
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">同步許可</span>
              <span :class="syncStatusClass">{{ syncStatusLabel }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">手動同步</span>
              <SyncStatusIndicator />
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">上次手動同步</span>
              <span class="text-[var(--color-text)]">{{ formatSyncTime(settingsStore.lastManualSyncAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">最近上傳（遊戲）</span>
              <span class="text-[var(--color-text)]">{{ formatSyncTime(syncStatus.session.lastSuccessAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">最近上傳（個人）</span>
              <span class="text-[var(--color-text)]">{{ formatSyncTime(syncStatus.user.lastSuccessAt) }}</span>
            </div>
            <div v-if="settingsStore.lastManualSyncError" class="text-xs text-red-600">
              同步失敗：{{ settingsStore.lastManualSyncError }}
            </div>
            <div v-if="syncStatus.session.lastErrorAt || syncStatus.user.lastErrorAt" class="text-xs text-red-600">
              最近同步失敗：{{ formatSyncTime(syncStatus.session.lastErrorAt || syncStatus.user.lastErrorAt) }}
            </div>
          </div>
          <button
            class="btn btn-secondary w-full mt-3 py-2 text-sm"
            :disabled="!canManualSync"
            @click="handleManualSync"
          >
            立即同步
          </button>
          <div class="text-xs text-[var(--color-text-muted)] mt-3">
            需開啟「雲端備份」才會同步，離線時將在恢復連線後補傳。
          </div>
        </div>

        <!-- 帳號資訊 -->
        <div v-if="userStore.isLoggedIn" class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-3">👤 帳號資訊</h3>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">姓名</span>
              <span class="text-[var(--color-text)]">{{ userStore.currentUser?.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">年齡</span>
              <span class="text-[var(--color-text)]">{{ userStore.userAge }} 歲</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">登入來源</span>
              <span class="text-[var(--color-text)]">{{ authProviderLabel }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">使用裝置</span>
              <span class="text-[var(--color-text)]">{{ clientSourceLabel }}</span>
            </div>
          </div>
          
          <button 
            @click="handleLogout" 
            class="btn btn-secondary w-full mt-4 py-2 text-sm"
          >
            切換帳號
          </button>
        </div>

        <!-- 訓練統計 -->
        <div v-if="userStore.isLoggedIn && userStore.currentStats" class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-3">📊 訓練統計</h3>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg text-center">
              <div class="text-lg font-bold text-[var(--color-primary)]">{{ totalGamesPlayed }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">遊戲次數</div>
            </div>
            <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg text-center">
              <div class="text-lg font-bold text-green-500">{{ userStore.currentStats.averageScore }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">平均分數</div>
            </div>
            <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg text-center">
              <div class="text-lg font-bold text-purple-500">{{ formatPlayTime(userStore.currentStats.totalPlayTime) }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">總時長</div>
            </div>
            <div class="p-3 bg-[var(--color-surface-alt)] rounded-lg text-center">
              <div class="text-lg font-bold text-orange-500">{{ userStore.currentStats.streak }}</div>
              <div class="text-xs text-[var(--color-text-muted)]">連續天數</div>
            </div>
          </div>
        </div>

        <!-- 其他設定 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-3">⚙️ 其他</h3>
          
          <button 
            @click="resetWelcome" 
            class="btn btn-secondary w-full mb-2 py-2 text-sm"
          >
            重新顯示歡迎畫面
          </button>
          
          <button 
            v-if="userStore.isLoggedIn"
            @click="confirmClearData" 
            class="btn btn-danger w-full py-2 text-sm"
          >
            清除所有遊戲記錄
          </button>
        </div>

        <!-- 關於 -->
        <div class="card p-4">
          <div class="text-center text-sm">
            <img src="@/assets/logo.svg" alt="愛護腦" class="w-12 h-12 mx-auto mb-3" />
            <p class="font-semibold text-[var(--color-text)]">愛護腦 Al MindCare</p>
            <p class="text-[var(--color-text-muted)]">版本 {{ appVersion }}</p>
          </div>
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
  if (!syncStatus.value.online || syncStatus.value.consent !== 'allowed') return 'text-amber-600'
  return 'text-green-600'
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
