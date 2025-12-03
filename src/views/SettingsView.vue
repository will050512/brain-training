<template>
  <div class="min-h-screen bg-[var(--color-bg)] py-8 transition-colors duration-300">
    <div class="container mx-auto px-4">
      <!-- 頭部 -->
      <div class="flex items-center justify-between mb-8">
        <router-link to="/" class="btn btn-secondary">
          ← 返回首頁
        </router-link>
        <h1 class="title-md">設定</h1>
        <div class="w-24"></div>
      </div>

      <div class="max-w-lg mx-auto space-y-6">
        <!-- 外觀主題設定 -->
        <div class="card">
          <h3 class="title-sm mb-6">🎨 外觀主題</h3>
          
          <div class="grid grid-cols-3 gap-3">
            <button
              @click="settingsStore.setThemeMode('light')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'light' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)] hover:border-[var(--color-primary-light)]'"
            >
              <span class="text-2xl">☀️</span>
              <span class="font-medium text-[var(--color-text)]">淺色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('dark')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'dark' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)] hover:border-[var(--color-primary-light)]'"
            >
              <span class="text-2xl">🌙</span>
              <span class="font-medium text-[var(--color-text)]">深色</span>
            </button>
            
            <button
              @click="settingsStore.setThemeMode('system')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
              :class="settingsStore.themeMode === 'system' 
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' 
                : 'border-[var(--color-border)] hover:border-[var(--color-primary-light)]'"
            >
              <span class="text-2xl">🖥️</span>
              <span class="font-medium text-[var(--color-text)]">自動</span>
            </button>
          </div>
          
          <p class="text-sm text-[var(--color-text-muted)] mt-4 text-center">
            {{ themeDescription }}
          </p>
        </div>

        <!-- 音效設定 -->
        <div class="card">
          <h3 class="title-sm mb-6">🔊 音效設定</h3>
          
          <!-- 遊戲音效 -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="font-medium text-[var(--color-text)]">遊戲音效</div>
              <div class="text-sm text-[var(--color-text-muted)]">點擊、成功、錯誤等音效</div>
            </div>
            <button
              @click="settingsStore.toggleSound()"
              class="w-16 h-8 rounded-full transition-colors relative"
              :class="settingsStore.soundEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-muted)]'"
            >
              <span
                class="absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow"
                :class="settingsStore.soundEnabled ? 'translate-x-9' : 'translate-x-1'"
              ></span>
            </button>
          </div>
          
          <!-- 音效音量 -->
          <div v-if="settingsStore.soundEnabled" class="mb-6">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-[var(--color-text-secondary)]">音效音量</span>
              <span class="text-[var(--color-text)]">{{ Math.round(settingsStore.soundVolume * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              :value="settingsStore.soundVolume"
              @input="(e) => settingsStore.setSoundVolume(parseFloat((e.target as HTMLInputElement).value))"
              class="w-full h-2 bg-[var(--color-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
          </div>
          
          <!-- 背景音樂 -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="font-medium text-[var(--color-text)]">背景音樂</div>
              <div class="text-sm text-[var(--color-text-muted)]">遊戲時的背景音樂</div>
            </div>
            <button
              @click="settingsStore.toggleMusic()"
              class="w-16 h-8 rounded-full transition-colors relative"
              :class="settingsStore.musicEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-muted)]'"
            >
              <span
                class="absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow"
                :class="settingsStore.musicEnabled ? 'translate-x-9' : 'translate-x-1'"
              ></span>
            </button>
          </div>
          
          <!-- 音樂音量 -->
          <div v-if="settingsStore.musicEnabled">
            <div class="flex justify-between text-sm mb-2">
              <span class="text-[var(--color-text-secondary)]">音樂音量</span>
              <span class="text-[var(--color-text)]">{{ Math.round(settingsStore.musicVolume * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              :value="settingsStore.musicVolume"
              @input="(e) => settingsStore.setMusicVolume(parseFloat((e.target as HTMLInputElement).value))"
              class="w-full h-2 bg-[var(--color-bg-muted)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
          </div>
        </div>

        <!-- 帳號資訊 -->
        <div v-if="userStore.isLoggedIn" class="card">
          <h3 class="title-sm mb-6">👤 帳號資訊</h3>
          
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">姓名</span>
              <span class="font-medium text-[var(--color-text)]">{{ userStore.currentUser?.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">生日</span>
              <span class="text-[var(--color-text)]">{{ formatDate(userStore.currentUser?.birthday) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">年齡</span>
              <span class="text-[var(--color-text)]">{{ userStore.userAge }} 歲</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">註冊日期</span>
              <span class="text-[var(--color-text)]">{{ formatDate(userStore.currentUser?.createdAt) }}</span>
            </div>
          </div>
          
          <button 
            @click="handleLogout" 
            class="btn btn-secondary w-full mt-6"
          >
            切換帳號
          </button>
        </div>

        <!-- 訓練統計 -->
        <div v-if="userStore.isLoggedIn && userStore.currentStats" class="card">
          <h3 class="title-sm mb-6">📊 訓練統計</h3>
          
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">總遊戲次數</span>
              <span class="font-medium text-[var(--color-text)]">{{ userStore.currentStats.totalGamesPlayed }} 次</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">總訓練時長</span>
              <span class="text-[var(--color-text)]">{{ formatPlayTime(userStore.currentStats.totalPlayTime) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">平均分數</span>
              <span class="text-[var(--color-text)]">{{ userStore.currentStats.averageScore }} 分</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--color-text-muted)]">連續訓練天數</span>
              <span class="text-[var(--color-text)]">{{ userStore.currentStats.streak }} 天</span>
            </div>
          </div>
        </div>

        <!-- 其他設定 -->
        <div class="card">
          <h3 class="title-sm mb-6">⚙️ 其他</h3>
          
          <button 
            @click="resetWelcome" 
            class="btn btn-secondary w-full mb-3"
          >
            重新顯示歡迎畫面
          </button>
          
          <button 
            v-if="userStore.isLoggedIn"
            @click="confirmClearData" 
            class="btn btn-danger w-full"
          >
            清除所有遊戲記錄
          </button>
        </div>

        <!-- 關於 -->
        <div class="card">
          <h3 class="title-sm mb-6">ℹ️ 關於</h3>
          
          <div class="text-center text-[var(--color-text-muted)]">
            <p class="text-lg font-medium text-[var(--color-text)] mb-2">健腦訓練 Brain Training</p>
            <p>版本 1.0.0</p>
            <p class="mt-4 text-sm">
              專為認知訓練設計的遊戲網站<br>
              透過有趣的遊戲活化大腦
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore, useGameStore } from '@/stores'
import { clearUserGameSessions } from '@/services/db'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()

// 主題描述
const themeDescription = computed(() => {
  switch (settingsStore.themeMode) {
    case 'light':
      return '使用淺色主題，適合白天使用'
    case 'dark':
      return '使用深色主題，減少眼睛疲勞'
    case 'system':
      return '自動跟隨系統設定切換主題'
    default:
      return ''
  }
})

// 格式化日期
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分鐘`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours} 小時 ${mins} 分鐘`
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
