<script setup lang="ts">
/**
 * 週報告視圖
 * 顯示一週的認知訓練統計和專業評估分數
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { 
  calculateProfessionalAssessment,
  type ProfessionalAssessment
} from '@/services/professionalScoreCalculator'
import { calculateScoreHistory, type ScoreHistory } from '@/services/scoreCalculator'
import { 
  type PersonalizedNutritionResult
} from '@/services/nutritionPlaceholder'
import { generateNutritionResultForUser } from '@/services/nutritionRecommendationService'
import { SectionStack } from '@/components/layout'
import DisclaimerBanner from '@/components/ui/DisclaimerBanner.vue'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import type { GameSession } from '@/types/game'
import type {
  DailyActivityCounts,
  DimensionItem,
  WeekStatsCard,
  WeeklyReportActivityFilter,
  WeeklyReportTab,
  WeeklyReportTabItem
} from '@/types/weeklyReport'
import WeeklyReportFiltersCard from '@/components/weekly-report/WeeklyReportFiltersCard.vue'
import WeeklyReportHeader from '@/components/weekly-report/WeeklyReportHeader.vue'
import WeeklyReportNutritionTab from '@/components/weekly-report/WeeklyReportNutritionTab.vue'
import WeeklyReportOverviewTab from '@/components/weekly-report/WeeklyReportOverviewTab.vue'
import WeeklyReportProfessionalTab from '@/components/weekly-report/WeeklyReportProfessionalTab.vue'
import WeeklyReportTabs from '@/components/weekly-report/WeeklyReportTabs.vue'
import WeeklyReportTrendTab from '@/components/weekly-report/WeeklyReportTrendTab.vue'
import {
  getTotalGamesPlayed,
  getNutritionUnlockPercent,
  getNutritionUnlockProgress,
  NUTRITION_UNLOCK_REQUIRED_TRAININGS
} from '@/utils/trainingStats'

const router = useRouter()
const userStore = useUserStore()
const gameStore = useGameStore()

const isLoading = ref(true)
const sessions = ref<GameSession[]>([])
const professionalAssessment = ref<ProfessionalAssessment | null>(null)
const selectedTab = ref<WeeklyReportTab>('overview')
const nutritionResult = ref<PersonalizedNutritionResult | null>(null)
const activityFilter = ref<WeeklyReportActivityFilter>('daily')

// 上週分數（用於計算趨勢）
const previousWeekScores = ref<CognitiveScores | null>(null)

// 本週日期範圍
const weekRange = computed(() => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  
  return {
    start: startOfWeek,
    end: endOfWeek,
    formatted: `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
  }
})

const filteredSessions = computed(() => {
  if (activityFilter.value === 'daily') {
    return sessions.value.filter(s => s.result?.mode === 'daily')
  }
  return sessions.value
})

// 本週遊戲記錄
const weekSessions = computed(() => {
  return filteredSessions.value.filter(s => {
    const date = new Date(s.createdAt)
    return date >= weekRange.value.start && date <= weekRange.value.end
  })
})

// 本週統計
const weekStats = computed(() => {
  const ws = weekSessions.value
  
  return {
    totalGames: ws.length,
    totalTime: ws.reduce((sum, s) => sum + s.result.duration, 0),
    avgScore: ws.length > 0 
      ? Math.round(ws.reduce((sum, s) => sum + s.result.score, 0) / ws.length)
      : 0,
    avgAccuracy: ws.length > 0
      ? Math.round(ws.reduce((sum, s) => sum + s.result.accuracy, 0) / ws.length * 100)
      : 0,
    uniqueGames: new Set(ws.map(s => s.gameId)).size,
    activeDays: new Set(ws.map(s => new Date(s.createdAt).toDateString())).size,
  }
})

// 分數歷史（用於趨勢圖）
const scoreHistory = computed<ScoreHistory[]>(() => {
  return calculateScoreHistory(weekSessions.value, 'day')
})

// 維度名稱
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '專注力',
}

// 維度圖標
const dimensionIcons: Record<CognitiveDimension, string> = {
  reaction: '⚡',
  logic: '🧩',
  memory: '🧠',
  cognition: '💡',
  coordination: '🎯',
  attention: '👁️',
}

const tabItems: WeeklyReportTabItem[] = [
  { key: 'overview', label: '概覽', icon: '📊' },
  { key: 'professional', label: '專業評估', icon: '🩺' },
  { key: 'trend', label: '趨勢分析', icon: '📈' },
  { key: 'nutrition', label: '營養建議', icon: '🥗' }
]

// 計算趨勢箭頭
function getTrendArrow(dim: CognitiveDimension): { arrow: string; class: string; change: number } {
  if (!previousWeekScores.value) return { arrow: '→', class: 'text-[var(--color-text-muted)]', change: 0 }
  
  const current = cognitiveScores.value[dim] || 0
  const previous = previousWeekScores.value[dim] || 0
  const change = current - previous
  
  if (change >= 5) return { arrow: '↑', class: 'text-[var(--color-success)]', change }
  if (change <= -5) return { arrow: '↓', class: 'text-[var(--color-danger)]', change }
  return { arrow: '→', class: 'text-[var(--color-text-muted)]', change }
}

// 營養建議是否解鎖
const nutritionUnlocked = computed(() => {
  const total = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return total >= NUTRITION_UNLOCK_REQUIRED_TRAININGS
})

const nutritionUnlockProgress = computed(() => {
  const total = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockProgress(total)
})

const nutritionUnlockPercent = computed(() => {
  const total = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockPercent(total)
})

// 認知分數
const cognitiveScores = computed<CognitiveScores>(() => {
  return gameStore.cognitiveScores || {
    reaction: 50,
    logic: 50,
    memory: 50,
    cognition: 50,
    coordination: 50,
    attention: 50,
  }
})

// 格式化日期
function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 格式化時間
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}小時${minutes}分鐘`
  }
  return `${minutes}分鐘`
}

const weekStatsCards = computed<WeekStatsCard[]>(() => {
  return [
    { icon: '🎮', value: weekStats.value.totalGames, label: '遊戲次數' },
    { icon: '⏱️', value: formatTime(weekStats.value.totalTime), label: '總訓練時間' },
    { icon: '📈', value: weekStats.value.avgScore, label: '平均分數' },
    { icon: '🎯', value: `${weekStats.value.avgAccuracy}%`, label: '平均正確率' },
    { icon: '🧩', value: weekStats.value.uniqueGames, label: '遊戲種類' },
    { icon: '📅', value: weekStats.value.activeDays, label: '活躍天數' }
  ]
})

const dimensionItems = computed<DimensionItem[]>(() => {
  return (Object.entries(cognitiveScores.value) as Array<[CognitiveDimension, number]>).map(([dim, score]) => ({
    key: dim,
    name: dimensionNames[dim],
    icon: dimensionIcons[dim],
    score,
    trend: getTrendArrow(dim)
  }))
})

const dailyActivityCounts = computed<DailyActivityCounts>(() => {
  const counts = Array(7).fill(0) as DailyActivityCounts
  weekSessions.value.forEach(session => {
    const dayIndex = new Date(session.createdAt).getDay()
    counts[dayIndex] = (counts[dayIndex] ?? 0) + 1
  })
  return counts
})

// 載入資料
async function loadData() {
  isLoading.value = true
  
  try {
    // 取得最近30天的遊戲記錄
    sessions.value = gameStore.sessions
    
    // 計算專業評估
    if (sessions.value.length >= 5) {
      professionalAssessment.value = calculateProfessionalAssessment(
        cognitiveScores.value,
        sessions.value
      )
    }
    
    // 計算上週分數（用於趨勢比較）
    const lastWeekStart = new Date(weekRange.value.start)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekRange.value.start)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
    
    const lastWeekSessions = sessions.value.filter(s => {
      const date = new Date(s.createdAt)
      return date >= lastWeekStart && date <= lastWeekEnd
    })
    
    if (lastWeekSessions.length > 0) {
      // 簡單計算上週平均分數
      const scores: CognitiveScores = {
        reaction: 0, logic: 0, memory: 0, cognition: 0, coordination: 0, attention: 0
      }
      const counts: Record<CognitiveDimension, number> = {
        reaction: 0, logic: 0, memory: 0, cognition: 0, coordination: 0, attention: 0
      }
      
      lastWeekSessions.forEach(s => {
        // 使用 cognitiveScores 而不是 dimensions
        if (s.cognitiveScores) {
          Object.entries(s.cognitiveScores).forEach(([dim, score]) => {
            const dimension = dim as CognitiveDimension
            if (score > 0) {
              scores[dimension] = (scores[dimension] || 0) + score
              counts[dimension] = (counts[dimension] || 0) + 1
            }
          })
        }
      })
      
      Object.keys(scores).forEach(key => {
        const dim = key as CognitiveDimension
        if (counts[dim] > 0) {
          scores[dim] = Math.round(scores[dim] / counts[dim])
        }
      })
      
      previousWeekScores.value = scores
    }
    
    // 載入營養建議（如已解鎖）
    if (nutritionUnlocked.value) {
      try {
        const odId = userStore.currentUser?.id
        if (odId) {
          const age = userStore.currentUser?.birthday
            ? new Date().getFullYear() - new Date(userStore.currentUser.birthday).getFullYear()
            : 65
          const educationYears = userStore.currentUser?.educationYears || 9

          nutritionResult.value = await generateNutritionResultForUser({
            odId,
            age,
            educationYears,
            cognitiveScores: cognitiveScores.value,
            sessions: sessions.value
          })
        }
      } catch (e) {
        console.error('載入營養建議失敗:', e)
      }
    }
  } catch (error) {
    console.error('載入資料失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 匯出報告（簡易版）
async function exportReport() {
  alert('報告匯出功能開發中...')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="app-page page-ambient">
    <!-- APP 頭部 -->
    <WeeklyReportHeader
      title="週訓練報告"
      @back="router.back()"
      @export="exportReport"
    />

    <!-- 可滾動內容區 -->
    <div class="app-content-scroll bg-[var(--color-bg)]">
      <div class="page-shell">
        <SectionStack>
          <!-- 免責聲明 -->
          <DisclaimerBanner />

          <!-- 報告頂部資訊卡 -->
          <WeeklyReportFiltersCard
            :week-range="weekRange.formatted"
            v-model:activityFilter="activityFilter"
          />

          <!-- 載入中 -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
            <div class="w-10 h-10 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
            <p>正在生成報告...</p>
          </div>

          <template v-else>
            <!-- Tab 切換 (橫向滾動) -->
            <WeeklyReportTabs
              v-model="selectedTab"
              :tabs="tabItems"
            />

            <!-- 概覽頁 -->
            <WeeklyReportOverviewTab
              v-if="selectedTab === 'overview'"
              :week-stats-cards="weekStatsCards"
              :cognitive-scores="cognitiveScores"
              :dimension-items="dimensionItems"
            />

            <!-- 專業評估頁 -->
            <WeeklyReportProfessionalTab
              v-if="selectedTab === 'professional'"
              :assessment="professionalAssessment"
              :sessions-count="sessions.length"
            />

            <!-- 趨勢分析頁 -->
            <WeeklyReportTrendTab
              v-if="selectedTab === 'trend'"
              :score-history="scoreHistory"
              :daily-activity-counts="dailyActivityCounts"
            />

            <!-- 營養建議頁 -->
            <WeeklyReportNutritionTab
              v-if="selectedTab === 'nutrition'"
              :nutrition-unlocked="nutritionUnlocked"
              :nutrition-result="nutritionResult"
              :nutrition-unlock-percent="nutritionUnlockPercent"
              :nutrition-unlock-progress="nutritionUnlockProgress"
              :nutrition-unlock-required="NUTRITION_UNLOCK_REQUIRED_TRAININGS"
            />
          </template>
        </SectionStack>
      </div>
    </div>
  </div>
</template>
