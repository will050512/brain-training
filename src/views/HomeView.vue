<template>
  <div class="app-page">
    <!-- 首次使用歡迎彈窗 -->
    <WelcomeModal 
      v-if="showWelcome" 
      @close="handleWelcomeClose"
      @enable-sound="handleEnableSound"
    />

    <!-- 訓練目標設定彈窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div 
          v-if="showGoalSettings" 
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          @click.self="showGoalSettings = false"
        >
          <div class="bg-[var(--color-surface)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <TrainingGoalSettings 
              :show-save-button="true"
              @save="showGoalSettings = false"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 訓練歷史彈窗 -->
    <TrainingHistoryModal
      :is-open="showHistoryModal"
      :date="selectedHistoryDate"
      :sessions="selectedDateSessions"
      @close="showHistoryModal = false"
    />

    <!-- APP 頭部 -->
    <header class="app-header">
      <div class="app-header-action">
        <router-link to="/settings" class="text-2xl">⚙️</router-link>
      </div>
      <div class="flex items-center gap-2">
        <img src="@/assets/logo.svg" alt="愛護腦" class="w-8 h-8" />
        <h1 class="text-lg font-bold text-[var(--color-text)]">愛護腦</h1>
      </div>
      <div class="app-header-action text-right">
        <button v-if="userStore.isLoggedIn" @click="handleLogout" class="text-sm text-[var(--color-text-muted)]">
          切換
        </button>
      </div>
    </header>

    <!-- 可滾動內容區 -->
    <div class="app-content-scroll">
      <div class="container mx-auto px-4 py-4 sm:px-6 sm:py-6 max-w-4xl">
      <div class="space-y-6">

      <!-- 使用者狀態（精簡版） -->
      <div v-if="userStore.isLoggedIn" class="flex items-center gap-3 mb-6 p-3 bg-[var(--color-surface)] rounded-xl">
        <div class="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xl">
          👤
        </div>
        <div class="flex-1">
          <p class="font-semibold text-[var(--color-text)]">{{ userStore.currentUser?.name }}</p>
          <p class="text-sm text-[var(--color-text-muted)]">{{ userStore.userAge }} 歲</p>
        </div>
      </div>
      <div v-if="trainingReminder || assessmentReminder?.needsAssessment" class="space-y-3">
        <h2 class="text-sm font-semibold text-[var(--color-text-muted)]">提醒與通知</h2>
        <!-- 訓練提醒 -->
        <div v-if="trainingReminder?.shouldRemind">
          <div class="alert alert--info">
            <span class="alert__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path>
                <path d="M13.7 21a2 2 0 01-3.4 0"></path>
              </svg>
            </span>
            <p class="alert__content text-sm">{{ trainingReminder.message }}</p>
            <button 
              @click="trainingReminder = null"
              class="alert__action text-xl"
            >×</button>
          </div>
        </div>

        <!-- 月度評估提醒 -->
        <div v-if="assessmentReminder?.needsAssessment">
          <div 
            class="alert"
            :class="assessmentReminder.daysSinceLastAssessment >= 60 ? 'alert--danger' : 'alert--warning'"
          >
            <span class="alert__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                <path d="M16 3v4M8 3v4M3 11h18"></path>
              </svg>
            </span>
            <div class="alert__content">
              <p class="text-sm font-medium">
                {{ assessmentReminder.message }}
              </p>
              <router-link 
                to="/assessment" 
                class="inline-block mt-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                :class="assessmentReminder.daysSinceLastAssessment >= 60 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-amber-500 text-white hover:bg-amber-600'"
              >
                前往評估
              </router-link>
            </div>
            <button 
              @click="snoozeAssessmentReminder(); assessmentReminder = null"
              class="alert__action text-xl"
            >×</button>
          </div>
        </div>
      </div>

      <!-- 評估引導卡片（未完成評估時顯示） -->
      <div v-if="userStore.isLoggedIn && !settingsStore.hasCompletedAssessment" class="mb-6">
        <div class="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 rounded-2xl p-4 text-white shadow-lg">
          <div class="flex items-center gap-3 mb-3">
            <span class="text-3xl">🧪</span>
            <div>
              <h2 class="font-bold">認知評估</h2>
              <p class="text-orange-100 text-sm">完成評估後即可開始訓練</p>
            </div>
          </div>
          
          <router-link 
            to="/assessment" 
            class="block w-full py-2.5 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-xl font-semibold text-center
                   hover:bg-orange-50 transition-colors shadow-md text-sm"
          >
            開始評估（約 5 分鐘）
          </router-link>
        </div>
      </div>

      <h2 v-if="userStore.isLoggedIn" class="text-sm font-semibold text-[var(--color-text-muted)]">今日訓練</h2>
      <!-- 訓練目標卡片（新增：圓形進度 + 目標設定） -->
      <div v-if="userStore.isLoggedIn" class="mb-6">
        <div class="bg-gradient-to-r from-[var(--color-primary)] to-purple-500 dark:from-indigo-600 dark:to-purple-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
          <!-- 標題與設定按鈕 -->
          <div class="flex items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <div class="flex-1 min-w-0">
              <h2 class="font-bold text-base sm:text-lg truncate">訓練目標</h2>
              <p class="text-blue-100 text-xs sm:text-sm leading-tight">
                每週 {{ settingsStore.weeklyTrainingGoal }} 天 · {{ settingsStore.dailyTrainingDuration }} 分鐘/天
              </p>
            </div>
            <button
              @click="showGoalSettings = true"
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 dark:bg-gray-700/50 flex items-center justify-center hover:bg-white/30 dark:hover:bg-gray-600/60 transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" class="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <!-- 圓形進度與週訓練統計 -->
          <div class="flex items-center justify-center sm:justify-around gap-4 sm:gap-0">
            <!-- 圓形進度 -->
            <div class="flex-shrink-0">
              <CircularProgress
                :value="weeklyProgress.completedDays"
                :max="settingsStore.weeklyTrainingGoal"
                :size="100"
                :stroke-width="8"
                progress-color="#ffffff"
                track-color="rgba(255,255,255,0.3)"
                :show-percentage="false"
              >
                <div class="text-center">
                  <span class="text-2xl sm:text-3xl font-bold">{{ weeklyProgress.completedDays }}</span>
                  <span class="text-xs sm:text-sm opacity-80">/{{ settingsStore.weeklyTrainingGoal }}</span>
                  <span class="block text-xs opacity-70">天</span>
                </div>
              </CircularProgress>
            </div>

            <!-- 週統計 -->
            <div class="space-y-2 sm:space-y-3 flex-1 sm:flex-initial">
              <div class="flex items-center gap-2 sm:gap-3">
                <span class="text-xl sm:text-2xl">⏱️</span>
                <div class="min-w-0 flex-1">
                  <p class="text-lg sm:text-xl font-bold truncate">{{ weeklyProgress.totalMinutes }}</p>
                  <p class="text-xs opacity-70">本週訓練分鐘</p>
                </div>
              </div>
              <div class="flex items-center gap-2 sm:gap-3">
                <span class="text-xl sm:text-2xl">🎮</span>
                <div class="min-w-0 flex-1">
                  <p class="text-lg sm:text-xl font-bold truncate">{{ weeklyProgress.totalSessions }}</p>
                  <p class="text-xs opacity-70">遊戲次數</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 開始訓練按鈕 -->
          <router-link
            to="/daily-challenge"
            class="block w-full py-2.5 sm:py-3 mt-3 sm:mt-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl font-semibold text-center
                   hover:bg-blue-50 transition-colors shadow-md text-sm sm:text-base"
          >
            {{ dailyProgress.completed ? '繼續訓練' : '開始今日訓練' }}
          </router-link>
        </div>
      </div>

      <h2 v-if="userStore.isLoggedIn" class="text-sm font-semibold text-[var(--color-text-muted)]">本週紀錄</h2>
      <div v-if="userStore.isLoggedIn" class="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>顯示</span>
        <div class="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] p-1 border border-[var(--color-border)]">
          <button
            class="px-2 py-1 rounded-full transition-colors"
            :class="activityFilter === 'daily' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'"
            @click="activityFilter = 'daily'"
          >
            每日訓練
          </button>
          <button
            class="px-2 py-1 rounded-full transition-colors"
            :class="activityFilter === 'all' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'"
            @click="activityFilter = 'all'"
          >
            全部活動
          </button>
        </div>
      </div>
      <!-- 週曆 -->
      <div v-if="userStore.isLoggedIn" class="mb-6">
        <WeekCalendar
          :training-data="weeklyTrainingData"
          @date-select="handleDateSelect"
          @week-change="handleWeekChange"
        />
      </div>

      <h2 v-if="userStore.isLoggedIn && settingsStore.hasCompletedAssessment" class="text-sm font-semibold text-[var(--color-text-muted)]">趨勢摘要</h2>
      <!-- 認知趨勢概覽（精簡版） -->
      <div v-if="userStore.isLoggedIn && settingsStore.hasCompletedAssessment" class="mb-6">
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-[var(--color-text)]">📊 認知趨勢</h3>
            <router-link v-if="hasSufficientData" to="/report" class="text-sm text-[var(--color-primary)]">
              詳情 →
            </router-link>
          </div>
          
          <!-- 未達到 5 場遊戲時的解鎖進度 -->
          <div v-if="!hasSufficientData" class="p-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">🔒</span>
              <span class="text-sm text-[var(--color-text)]">完成 {{ unlockProgress.remaining }} 場遊戲後解鎖</span>
            </div>
            <div class="h-2 bg-[var(--color-primary)]/10 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-[var(--color-primary)] to-purple-500 rounded-full transition-all duration-500"
                :style="{ width: unlockProgress.percentage + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- 有足夠數據時顯示趨勢 -->
          <template v-else-if="cognitiveTrend">
            <!-- 退化警告 -->
            <div v-if="hasDeclineWarning" class="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span class="text-sm text-yellow-700 dark:text-yellow-300">⚠️ 偵測到表現變化，建議持續練習</span>
            </div>
            
            <!-- 維度摘要 -->
            <div class="grid grid-cols-3 gap-2">
              <div 
                v-for="dim in topDimensions" 
                :key="dim.dimension"
                class="text-center p-2 bg-[var(--color-surface-alt)] rounded-lg"
              >
                <span class="text-xl">{{ dim.icon }}</span>
                <p class="text-sm font-bold" :class="dim.trendClass">{{ dim.score }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ dim.name }}</p>
              </div>
            </div>
          </template>
        </div>
      </div>

      <h2 class="text-sm font-semibold text-[var(--color-text-muted)]">快速開始</h2>
      <!-- 主要按鈕區（更緊湊） -->
      <div class="space-y-3 mb-6">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/games" class="btn btn-primary btn-lg w-full shadow-lg">
            <span class="text-xl mr-2">🎮</span>
            開始訓練
          </router-link>
          
          <div class="grid grid-cols-2 gap-3">
            <router-link to="/report" class="btn btn-secondary w-full py-3">
              <span class="text-lg mr-1">📊</span>
              報告
            </router-link>
            
            <router-link to="/nutrition" class="btn btn-secondary w-full py-3">
              <span class="text-lg mr-1">🥗</span>
              營養
            </router-link>
          </div>
        </template>
        
        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-lg w-full shadow-lg">
            <span class="text-xl mr-2">👋</span>
            開始使用
          </router-link>
        </template>
      </div>

      <!-- 統計摘要（精簡版） -->
      <div v-if="userStore.isLoggedIn && userStore.currentStats" class="mb-6">
        <h2 class="text-sm font-semibold text-[var(--color-text-muted)] mb-3">訓練統計</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div class="text-center p-2 sm:p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-lg sm:text-xl font-bold text-blue-500">
              {{ userStore.currentStats.totalGamesPlayed }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">次數</div>
          </div>
          <div class="text-center p-2 sm:p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-lg sm:text-xl font-bold text-green-500">
              {{ userStore.currentStats.averageScore }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">平均</div>
          </div>
          <div class="text-center p-2 sm:p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-lg sm:text-xl font-bold text-purple-500">
              {{ formatPlayTime(userStore.currentStats.totalPlayTime) }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">時長</div>
          </div>
          <div class="text-center p-2 sm:p-3 bg-[var(--color-surface)] rounded-xl">
            <div class="text-lg sm:text-xl font-bold text-orange-500">
              {{ userStore.currentStats.streak }}
            </div>
            <div class="text-xs text-[var(--color-text-muted)]">連續</div>
          </div>
        </div>
      </div>


      </div>
    </div>
    </div>

    <!-- 版本資訊 -->
    <footer class="flex-shrink-0 py-2 text-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
      愛護腦 Al MindCare © 2026
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore } from '@/stores'
import { useGameStore } from '@/stores/gameStore'
import { COGNITIVE_DIMENSIONS, type CognitiveDimensionInfo, type CognitiveDimension } from '@/types/cognitive'
import WelcomeModal from '@/components/ui/WelcomeModal.vue'
import CircularProgress from '@/components/ui/CircularProgress.vue'
import WeekCalendar from '@/components/ui/WeekCalendar.vue'
import TrainingGoalSettings from '@/components/ui/TrainingGoalSettings.vue'
import TrainingHistoryModal from '@/components/ui/TrainingHistoryModal.vue'
import { getOverallDeclineSummary } from '@/services/declineDetectionService'
import { getTodayTrainingStatus } from '@/services/dailyTrainingService'
import { getGameSessionsByDate, getLatestMiniCogResult } from '@/services/db'
import { useNotification } from '@/composables/useNotification'
import type { GameSession } from '@/types/game'
import {
  getTotalGamesPlayed,
  getNutritionUnlockPercent,
  getNutritionUnlockProgress,
  NUTRITION_UNLOCK_REQUIRED_TRAININGS
} from '@/utils/trainingStats'
import { getLocalDateKey } from '@/utils/dateKey'

const router = useRouter()
const userStore = useUserStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()
const { checkTrainingReminder, checkAssessmentReminder, snoozeAssessmentReminder, requestPermission } = useNotification()

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 是否顯示歡迎彈窗
const showWelcome = computed(() => !settingsStore.hasSeenWelcome)

// 目標設定彈窗
const showGoalSettings = ref(false)

// 歷史紀錄彈窗
const showHistoryModal = ref(false)
const selectedHistoryDate = ref('')
const selectedDateSessions = ref<Array<{ gameId: string; score?: number; duration?: number; timestamp: string | number }>>([])

// 每日訓練進度
const dailyProgress = ref({ percentage: 0, completed: false })

// 週訓練進度
const weeklyProgress = ref({ completedDays: 0, totalMinutes: 0, totalSessions: 0 })

// 週曆訓練資料
const weeklyTrainingData = ref<Record<string, { minutes: number; completed: boolean; sessions: number }>>({})
const activityFilter = ref<'daily' | 'all'>('daily')

// 提醒訊息
const trainingReminder = ref<{ shouldRemind: boolean; daysMissed: number; message: string } | null>(null)
const assessmentReminder = ref<{ needsAssessment: boolean; daysSinceLastAssessment: number; message: string } | null>(null)

// 認知趨勢資料
const cognitiveTrend = ref<{
  dimensions: Record<CognitiveDimension, { score: number; trend: number }>
  hasDecline: boolean
} | null>(null)

// 是否有退化警告
const hasDeclineWarning = computed(() => cognitiveTrend.value?.hasDecline || false)

// 遊戲次數
const gamesPlayedCount = computed(() =>
  getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
)

// 是否有足夠數據（5場遊戲）
const hasSufficientData = computed(() => gamesPlayedCount.value >= NUTRITION_UNLOCK_REQUIRED_TRAININGS)

// 解鎖進度
const unlockProgress = computed(() => {
  const current = getNutritionUnlockProgress(gamesPlayedCount.value)
  return {
    current,
    percentage: getNutritionUnlockPercent(gamesPlayedCount.value),
    remaining: Math.max(0, NUTRITION_UNLOCK_REQUIRED_TRAININGS - current)
  }
})

// 維度圖示對照
const dimensionMeta: Record<CognitiveDimension, { icon: string; name: string }> = {
  reaction: { icon: '⚡', name: '反應力' },
  logic: { icon: '🧩', name: '邏輯力' },
  memory: { icon: '🧠', name: '記憶力' },
  cognition: { icon: '🎯', name: '認知力' },
  coordination: { icon: '🤝', name: '協調力' },
  attention: { icon: '🔍', name: '注意力' }
}

// 前三個維度顯示
const topDimensions = computed(() => {
  if (!cognitiveTrend.value) return []
  
  const dims = Object.entries(cognitiveTrend.value.dimensions) as [CognitiveDimension, { score: number; trend: number }][]
  
  return dims
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([dimension, data]) => ({
      dimension,
      icon: dimensionMeta[dimension].icon,
      name: dimensionMeta[dimension].name,
      score: Math.round(data.score),
      trend: Math.round(data.trend),
      trendClass: data.trend > 0 ? 'trend-up' : data.trend < 0 ? 'trend-down' : 'trend-neutral'
    }))
})

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`
  return `${Math.floor(seconds / 3600)}時`
}

function filterSessionsByMode(records: GameSession[]): GameSession[] {
  if (activityFilter.value === 'daily') {
    return records.filter(r => r.result?.mode === 'daily')
  }
  return records
}

// 處理歡迎彈窗關閉
function handleWelcomeClose(): void {
  settingsStore.markWelcomeSeen()
}

// 處理開啟音效
function handleEnableSound(): void {
  settingsStore.toggleSound(true)
  settingsStore.markWelcomeSeen()
}

// 處理登出
function handleLogout(): void {
  userStore.logout()
  localStorage.removeItem('brain-training-current-user')
  router.push('/login')
}

// 載入認知趨勢
async function loadCognitiveTrend(): Promise<void> {
  try {
    const summary = await getOverallDeclineSummary()
    
    const dimensions: Record<CognitiveDimension, { score: number; trend: number }> = {
      reaction: { score: 0, trend: 0 },
      logic: { score: 0, trend: 0 },
      memory: { score: 0, trend: 0 },
      cognition: { score: 0, trend: 0 },
      coordination: { score: 0, trend: 0 },
      attention: { score: 0, trend: 0 }
    }
    
    let hasDecline = false
    
    summary.dimensions.forEach(dim => {
      dimensions[dim.dimension] = {
        score: dim.currentAverage,
        trend: -dim.declinePercentage // 負數表示下降
      }
      if (dim.isDeclined) {
        hasDecline = true
      }
    })
    
    cognitiveTrend.value = { dimensions, hasDecline }
  } catch (error) {
    console.error('載入認知趨勢失敗:', error)
  }
}

// 載入每日訓練狀態
async function loadDailyProgress(): Promise<void> {
  try {
    const status = await getTodayTrainingStatus()
    dailyProgress.value = {
      percentage: status.progress,
      completed: status.completed
    }
  } catch (error) {
    console.error('載入每日進度失敗:', error)
  }
}

// 載入週訓練資料
async function loadWeeklyData(): Promise<void> {
  try {
    const odId = userStore.currentUser?.id
    if (!odId) return

    weeklyProgress.value = { completedDays: 0, totalMinutes: 0, totalSessions: 0 }
    
    // 建構週曆資料
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const trainingData: Record<string, { minutes: number; completed: boolean; sessions: number }> = {}
    let totalMinutes = 0
    let totalSessions = 0
    let completedDays = 0
    
    // 獲取本週每天的訓練記錄
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateKey = getLocalDateKey(date)
      if (!dateKey) continue
      
      // 從資料庫查詢該日的訓練記錄
      const records: GameSession[] = await getGameSessionsByDate(odId, dateKey)
      const filteredRecords = filterSessionsByMode(records)
      
      if (filteredRecords && filteredRecords.length > 0) {
        const dayMinutes = filteredRecords.reduce((sum: number, r: GameSession) => sum + Math.round((r.result?.duration || 0) / 60), 0)
        totalMinutes += dayMinutes
        totalSessions += filteredRecords.length
        if (dayMinutes >= settingsStore.dailyTrainingDuration) {
          completedDays += 1
        }
        trainingData[dateKey] = {
          minutes: dayMinutes,
          completed: dayMinutes >= settingsStore.dailyTrainingDuration,
          sessions: filteredRecords.length
        }
      }
    }
    
    // 更新總分鐘數
    weeklyProgress.value.totalMinutes = totalMinutes
    weeklyProgress.value.totalSessions = totalSessions
    weeklyProgress.value.completedDays = completedDays
    weeklyTrainingData.value = trainingData
  } catch (error) {
    console.error('載入週訓練資料失敗:', error)
  }
}

// 處理週曆日期選擇
async function handleDateSelect(dateKey: string): Promise<void> {
  try {
    selectedHistoryDate.value = dateKey
    const odId = userStore.currentUser?.id
    if (!odId) return
    
    // 載入該日期的訓練記錄
    const records: GameSession[] = await getGameSessionsByDate(odId, dateKey)
    const filteredRecords = filterSessionsByMode(records)
    
    selectedDateSessions.value = filteredRecords.map((r: GameSession) => ({
      gameId: r.gameId,
      score: r.result?.score,
      duration: r.result?.duration,
      timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : dateKey
    }))
    
    showHistoryModal.value = true
  } catch (error) {
    console.error('載入訓練記錄失敗:', error)
    selectedDateSessions.value = []
  }
}

// 處理週曆週變更
async function handleWeekChange(startDate: string, endDate: string): Promise<void> {
  try {
    // 重新載入該週的訓練資料
    const trainingData: Record<string, { minutes: number; completed: boolean; sessions: number }> = {}
    const odId = userStore.currentUser?.id
    if (!odId) return
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = getLocalDateKey(d)
      if (!dateKey) continue
      
      const records: GameSession[] = await getGameSessionsByDate(odId, dateKey)
      const filteredRecords = filterSessionsByMode(records)
      
      if (filteredRecords && filteredRecords.length > 0) {
        const totalMinutes = filteredRecords.reduce((sum: number, r: GameSession) => sum + Math.round((r.result?.duration || 0) / 60), 0)
        trainingData[dateKey] = {
          minutes: totalMinutes,
          completed: totalMinutes >= settingsStore.dailyTrainingDuration,
          sessions: filteredRecords.length
        }
      }
    }
    
    weeklyTrainingData.value = trainingData
  } catch (error) {
    console.error('載入週資料失敗:', error)
  }
}

// 初始化
onMounted(async () => {
  // 嘗試恢復登入狀態
  const savedUserId = localStorage.getItem('brain-training-current-user')
  if (savedUserId && !userStore.isLoggedIn) {
    await userStore.quickLogin(savedUserId)
  }
  
  // 載入額外資料
  if (userStore.isLoggedIn) {
    await Promise.all([
      loadCognitiveTrend(),
      loadDailyProgress()
    ])
    
    // 檢查訓練提醒
    const reminder = checkTrainingReminder()
    trainingReminder.value = reminder.shouldRemind ? reminder : null
    
    // 檢查月度評估提醒（統一策略：30天，並支援 snooze / 可關閉）
    const userId = userStore.currentUser?.id
    let lastAssessmentDate: string | null = settingsStore.assessmentResult?.completedAt || null
    if (userId) {
      try {
        const latestMiniCog = await getLatestMiniCogResult(userId)
        if (latestMiniCog?.completedAt) {
          lastAssessmentDate = latestMiniCog.completedAt
        }
      } catch (e) {
        console.error('取得 Mini-Cog 失敗', e)
      }
    }

    const assessment = checkAssessmentReminder(lastAssessmentDate)
    if (assessment.shouldRemind) {
      assessmentReminder.value = {
        needsAssessment: true,
        daysSinceLastAssessment: assessment.daysSinceAssessment,
        message: assessment.message
      }
    }
    
    // 嘗試請求通知權限（僅在支援的環境）
    requestPermission()
  }
})

watch(activityFilter, () => {
  if (userStore.isLoggedIn) {
    loadWeeklyData()
  }
})
</script>
