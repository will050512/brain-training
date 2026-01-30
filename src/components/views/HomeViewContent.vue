<template>
  <PageShell>
    <HomeOverlays
      :show-welcome="showWelcome"
      :show-goal-settings="showGoalSettings"
      :show-history-modal="showHistoryModal"
      :selected-history-date="selectedHistoryDate"
      :selected-date-sessions="selectedDateSessions"
      :show-guided-tour="showGuidedTour"
      @close-welcome="handleWelcomeClose"
      @enable-sound="handleEnableSound"
      @close-goal-settings="showGoalSettings = false"
      @close-history="showHistoryModal = false"
      @update-guided-tour="handleGuidedTourToggle"
    />

    <SectionStack>
      <HomeUserStatusCard
        v-if="userStore.isLoggedIn"
        :user-name="userStore.currentUser?.name || ''"
        :user-age="userStore.userAge ?? '-'"
        :transfer-code-label="transferCodeLabel"
        :copied-transfer-code="copiedTransferCode"
        :sync-status-icon="syncStatusIcon"
        :sync-status-text="syncStatusText"
        :is-syncing="settingsStore.syncUiStatus === 'syncing'"
        @copy-transfer-code="handleCopyTransferCode"
        @logout="handleLogout"
      />

      <HomeGuidedTourCard
        v-if="userStore.isLoggedIn && !guidedTourDismissed"
        @dismiss="dismissGuidedTour"
        @open="openGuidedTour"
      />

      <HomeReminderSection
        :training-reminder="trainingReminder"
        :assessment-reminder="assessmentReminder"
        @dismiss-training="trainingReminder = null"
        @dismiss-assessment="assessmentReminder = null"
        @snooze-assessment="snoozeAssessmentReminder"
      />

      <HomeAssessmentPromptCard
        v-if="userStore.isLoggedIn && !settingsStore.hasCompletedAssessment"
      />

      <HomeDailyGoalCard
        v-if="userStore.isLoggedIn"
        :weekly-progress="weeklyProgress"
        :daily-progress="dailyProgress"
        :weekly-training-goal="settingsStore.weeklyTrainingGoal"
        :daily-training-duration="settingsStore.dailyTrainingDuration"
        @open-goal-settings="showGoalSettings = true"
      />

      <HomeWeeklyRecordSection
        v-if="userStore.isLoggedIn"
        v-model:activityFilter="activityFilter"
        :training-data="weeklyTrainingData"
        @date-select="handleDateSelect"
        @week-change="handleWeekChange"
      />

      <HomeTrendSummaryCard
        v-if="userStore.isLoggedIn && settingsStore.hasCompletedAssessment"
        :has-sufficient-data="hasSufficientData"
        :unlock-progress="unlockProgress"
        :cognitive-trend="cognitiveTrend"
        :top-dimensions="topDimensions"
        :has-decline-warning="hasDeclineWarning"
      />

      <HomeQuickActions :is-logged-in="userStore.isLoggedIn" />

      <HomeStatsSummary
        v-if="userStore.isLoggedIn && userStore.currentStats"
        :stats="userStore.currentStats"
        :format-play-time="formatPlayTime"
      />
    </SectionStack>

    <HomeFooter />
  </PageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useSettingsStore } from '@/stores'
import { useGameStore } from '@/stores/gameStore'
import type { CognitiveDimension } from '@/types/cognitive'
import { PageShell, SectionStack } from '@/components/layout'
import HomeAssessmentPromptCard from '@/components/home/HomeAssessmentPromptCard.vue'
import HomeDailyGoalCard from '@/components/home/HomeDailyGoalCard.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import HomeGuidedTourCard from '@/components/home/HomeGuidedTourCard.vue'
import HomeOverlays from '@/components/home/HomeOverlays.vue'
import HomeQuickActions from '@/components/home/HomeQuickActions.vue'
import HomeReminderSection from '@/components/home/HomeReminderSection.vue'
import HomeStatsSummary from '@/components/home/HomeStatsSummary.vue'
import HomeTrendSummaryCard from '@/components/home/HomeTrendSummaryCard.vue'
import HomeUserStatusCard from '@/components/home/HomeUserStatusCard.vue'
import HomeWeeklyRecordSection from '@/components/home/HomeWeeklyRecordSection.vue'
import { getOverallDeclineSummary } from '@/services/declineDetectionService'
import { getTodayTrainingStatus } from '@/services/dailyTrainingService'
import { getGameSessionsByDate, getLatestMiniCogResult } from '@/services/db'
import { useNotification } from '@/composables/useNotification'
import { formatTransferCode } from '@/services/userTransferCode'
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

const syncStatusIcon = computed(() => {
  switch (settingsStore.syncUiStatus) {
    case 'syncing':
      return '⏳'
    case 'success':
      return '✅'
    case 'error':
      return '⚠️'
    default:
      return '☁️'
  }
})

const syncStatusText = computed(() => {
  switch (settingsStore.syncUiStatus) {
    case 'syncing':
      return '自動同步中...'
    case 'success':
      return '自動同步完成'
    case 'error':
      return '自動同步失敗'
    default:
      return '等待自動同步'
  }
})

const copiedTransferCode = ref(false)

const transferCodeLabel = computed(() => {
  const user = userStore.currentUser
  if (!user) return ''
  return formatTransferCode(userStore.getTransferCode(user))
})

async function handleCopyTransferCode(): Promise<void> {
  if (!transferCodeLabel.value) return
  try {
    await navigator.clipboard.writeText(transferCodeLabel.value)
    copiedTransferCode.value = true
    setTimeout(() => {
      copiedTransferCode.value = false
    }, 1500)
  } catch {
    copiedTransferCode.value = false
  }
}

// 是否顯示歡迎彈窗
const showWelcome = computed(() => {
  const userSeen = userStore.currentSettings?.hasSeenWelcome === true
  return !settingsStore.hasSeenWelcome && !userSeen
})

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
const showGuidedTour = ref(false)
const guidedTourDismissed = ref(false)
const GUIDED_TOUR_DISMISSED_KEY = 'brain-training-guided-tour-dismissed'

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
  if (userStore.isLoggedIn) {
    void userStore.markWelcomeSeen()
  }
}

// 處理開啟音效
function handleEnableSound(): void {
  settingsStore.toggleSound(true)
  settingsStore.markWelcomeSeen()
  if (userStore.isLoggedIn) {
    void userStore.markWelcomeSeen()
  }
}

// 處理登出
function handleLogout(): void {
  userStore.logout()
  localStorage.removeItem('brain-training-current-user')
  router.push('/login')
}

function hasDismissedGuidedTour(): boolean {
  try {
    return Boolean(localStorage.getItem(GUIDED_TOUR_DISMISSED_KEY))
  } catch {
    return false
  }
}

function markGuidedTourDismissed(): void {
  try {
    localStorage.setItem(GUIDED_TOUR_DISMISSED_KEY, Date.now().toString())
    guidedTourDismissed.value = true
  } catch {
    // ignore
  }
}

function openGuidedTour(): void {
  showGuidedTour.value = true
}

function dismissGuidedTour(): void {
  showGuidedTour.value = false
  markGuidedTourDismissed()
}

function handleGuidedTourToggle(value: boolean): void {
  showGuidedTour.value = value
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
    guidedTourDismissed.value = hasDismissedGuidedTour()
    await Promise.all([
      loadCognitiveTrend(),
      loadDailyProgress(),
      loadWeeklyData(),
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

    if (!guidedTourDismissed.value) {
      showGuidedTour.value = true
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
