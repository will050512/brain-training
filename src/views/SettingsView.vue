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
      <div class="p-4 space-y-4">
        <!-- 外觀主題設定（已禁用，固定為明亮模式）
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
        -->

        <!-- 訓練目標設定 -->
        <div class="card">
          <TrainingGoalSettings />
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

        <!-- 音效設定 -->
        <div class="card p-4">
          <h3 class="font-semibold text-[var(--color-text)] mb-4">🔊 音效設定</h3>
          
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
          <div class="flex items-center justify-between">
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
            <p class="text-[var(--color-text-muted)]">版本 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore, useGameStore } from '@/stores'
import { clearUserGameSessions } from '@/services/db'
import TrainingGoalSettings from '@/components/ui/TrainingGoalSettings.vue'
import { computed } from 'vue'
import { getTotalGamesPlayed } from '@/utils/trainingStats'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()

const totalGamesPlayed = computed(() => {
  return getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
})

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  const hours = Math.floor(seconds / 3600)
  return `${hours}時`
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
