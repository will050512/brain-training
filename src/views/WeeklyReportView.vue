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
  getInterpretationDescription,
  getRecommendedAction,
  type ProfessionalAssessment
} from '@/services/professionalScoreCalculator'
import { calculateScoreHistory, type ScoreHistory } from '@/services/scoreCalculator'
import { 
  type PersonalizedNutritionResult,
  type NutritionRecommendation
} from '@/services/nutritionPlaceholder'
import { generateNutritionResultForUser } from '@/services/nutritionRecommendationService'
import DisclaimerBanner from '@/components/ui/DisclaimerBanner.vue'
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import type { GameSession } from '@/types/game'
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
const selectedTab = ref<'overview' | 'professional' | 'trend' | 'nutrition'>('overview')
const nutritionResult = ref<PersonalizedNutritionResult | null>(null)
const activityFilter = ref<'daily' | 'all'>('daily')

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

// 取得評估等級顏色
function getInterpretationColor(interpretation: string): string {
  switch (interpretation) {
    case 'normal': return 'var(--color-success)'
    case 'mild':
    case 'mci': return 'var(--color-warning)'
    case 'moderate': return 'var(--color-danger)'
    case 'severe':
    case 'dementia': return 'var(--color-score-concern)'
    default: return 'var(--color-text-muted)'
  }
}

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
  <div class="app-page">
    <!-- APP 頭部 -->
    <header class="app-header shadow-sm bg-[var(--color-surface-elevated)]">
      <div class="app-header-action">
        <button 
          @click="router.back()" 
          class="text-3xl text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-soft)]"
        >
          ←
        </button>
      </div>
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-[var(--color-text)] tracking-wide">週訓練報告</h1>
      </div>
      <div class="app-header-action text-right">
        <button 
          @click="exportReport" 
          class="text-sm font-bold text-[var(--color-primary)] px-4 py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-full transition-colors"
        >
          匯出
        </button>
      </div>
    </header>

    <!-- 可滾動內容區 -->
    <div class="app-content-scroll bg-[var(--color-bg)]">
      <div class="container-desktop px-4 py-4 sm:py-6">
        <div class="space-y-6">
          
          <!-- 免責聲明 -->
          <DisclaimerBanner />

          <!-- 報告頂部資訊卡 -->
          <div class="bg-[var(--color-surface-elevated)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-light)]">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="text-center sm:text-left">
                <div class="text-sm text-[var(--color-text-secondary)] mb-1">本週範圍</div>
                <div class="text-xl font-bold text-[var(--color-text)] font-mono">{{ weekRange.formatted }}</div>
              </div>
              
              <div class="flex bg-[var(--color-bg-soft)] rounded-xl p-1">
                <button
                  class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  :class="activityFilter === 'daily' ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
                  @click="activityFilter = 'daily'"
                >
                  每日訓練
                </button>
                <button
                  class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  :class="activityFilter === 'all' ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
                  @click="activityFilter = 'all'"
                >
                  全部活動
                </button>
              </div>
            </div>
          </div>

          <!-- 載入中 -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
            <div class="w-10 h-10 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
            <p>正在生成報告...</p>
          </div>

          <template v-else>
            <!-- Tab 切換 (橫向滾動) -->
            <div class="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-sm -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:backdrop-blur-none border-b border-[var(--color-border-light)] sm:border-0">
              <div class="flex overflow-x-auto gap-3 pb-2 no-scrollbar hide-scrollbar">
                <button 
                  v-for="tab in ['overview', 'professional', 'trend', 'nutrition'] as const" 
                  :key="tab"
                  class="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border"
                  :class="selectedTab === tab 
                    ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-transparent shadow-md' 
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'"
                  @click="selectedTab = tab"
                >
                  <span class="mr-1.5 text-base">
                    {{ 
                      tab === 'overview' ? '📊 概覽' : 
                      tab === 'professional' ? '🩺 專業評估' : 
                      tab === 'trend' ? '📈 趨勢分析' : 
                      '🥗 營養建議' 
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- 概覽頁 -->
            <div v-if="selectedTab === 'overview'" class="space-y-6 animate-fade-in">
              <!-- 週統計卡片 -->
              <section>
                <h2 class="text-lg font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-[var(--color-primary)]"></span>
                  本週統計
                </h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">🎮</span>
                    <span class="text-2xl font-black text-[var(--color-text)]">{{ weekStats.totalGames }}</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">遊戲次數</span>
                  </div>
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">⏱️</span>
                    <span class="text-xl font-black text-[var(--color-text)] truncate w-full">{{ formatTime(weekStats.totalTime) }}</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">總訓練時間</span>
                  </div>
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">📈</span>
                    <span class="text-2xl font-black text-[var(--color-text)]">{{ weekStats.avgScore }}</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">平均分數</span>
                  </div>
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">🎯</span>
                    <span class="text-2xl font-black text-[var(--color-text)]">{{ weekStats.avgAccuracy }}%</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">平均正確率</span>
                  </div>
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">🧩</span>
                    <span class="text-2xl font-black text-[var(--color-text)]">{{ weekStats.uniqueGames }}</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">遊戲種類</span>
                  </div>
                  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
                    <span class="text-2xl mb-2">📅</span>
                    <span class="text-2xl font-black text-[var(--color-text)]">{{ weekStats.activeDays }}</span>
                    <span class="text-xs font-medium text-[var(--color-text-secondary)]">活躍天數</span>
                  </div>
                </div>
              </section>

              <!-- 認知雷達圖 -->
              <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-6 shadow-sm border border-[var(--color-border-light)]">
                <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-purple)]"></span>
                  認知能力分布
                </h2>
                <div class="max-w-md mx-auto aspect-square sm:aspect-[4/3]">
                  <RadarChart :scores="cognitiveScores" />
                </div>
              </section>

              <!-- 各維度表現 -->
              <section>
                <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-teal)]"></span>
                  各維度表現
                </h2>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div 
                    v-for="(score, dim) in cognitiveScores" 
                    :key="dim"
                    class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl border border-[var(--color-border-light)] flex items-center gap-4 transition-transform hover:-translate-y-0.5"
                  >
                    <div class="w-12 h-12 rounded-2xl bg-[var(--color-bg-soft)] flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {{ dimensionIcons[dim as CognitiveDimension] }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-[var(--color-text)]">{{ dimensionNames[dim as CognitiveDimension] }}</span>
                        <div class="flex items-center gap-2">
                          <span 
                            class="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)]"
                            :class="getTrendArrow(dim as CognitiveDimension).class"
                          >
                            {{ getTrendArrow(dim as CognitiveDimension).arrow }}
                            <span v-if="getTrendArrow(dim as CognitiveDimension).change !== 0">
                              {{ Math.abs(getTrendArrow(dim as CognitiveDimension).change) }}
                            </span>
                          </span>
                          <span class="text-xl font-black text-[var(--color-primary)]">{{ score }}</span>
                        </div>
                      </div>
                      <div class="h-2.5 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all duration-1000 ease-out"
                          :style="{ 
                            width: `${score}%`,
                            backgroundColor: score >= 70 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- 專業評估頁 -->
            <div v-if="selectedTab === 'professional'" class="space-y-6 animate-fade-in">
              <template v-if="professionalAssessment">
                <!-- MMSE -->
                <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)] overflow-hidden">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h2 class="text-lg font-bold text-[var(--color-text)]">MMSE 估算分數</h2>
                      <p class="text-xs text-[var(--color-text-secondary)] mt-1">簡易智能狀態測驗</p>
                    </div>
                    <div 
                      class="text-sm font-bold px-3 py-1 rounded-full border"
                      :style="{ 
                        color: getInterpretationColor(professionalAssessment.mmse.interpretation),
                        borderColor: getInterpretationColor(professionalAssessment.mmse.interpretation),
                        backgroundColor: 'var(--color-bg-soft)'
                      }"
                    >
                      {{ getInterpretationDescription('mmse', professionalAssessment.mmse.interpretation) }}
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row gap-6 items-center">
                    <div 
                      class="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center shrink-0"
                      :style="{ borderColor: getInterpretationColor(professionalAssessment.mmse.interpretation) }"
                    >
                      <span class="text-4xl font-black text-[var(--color-text)]">{{ professionalAssessment.mmse.total }}</span>
                      <span class="text-xs text-[var(--color-text-secondary)] font-medium">/ 30</span>
                    </div>
                    
                    <div class="w-full grid grid-cols-2 gap-3">
                      <div class="p-2 bg-[var(--color-bg-soft)] rounded-xl flex justify-between items-center" v-for="(val, key) in {
                        '定向力': [professionalAssessment.mmse.orientation, 10],
                        '登錄': [professionalAssessment.mmse.registration, 3],
                        '注意力': [professionalAssessment.mmse.attention, 5],
                        '回憶': [professionalAssessment.mmse.recall, 3],
                        '語言': [professionalAssessment.mmse.language, 8],
                        '視覺': [professionalAssessment.mmse.visuospatial, 1]
                      }" :key="key">
                        <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ key }}</span>
                        <span class="text-sm font-bold text-[var(--color-text)]">{{ val[0] }}<span class="text-[var(--color-text-muted)] text-xs">/{{ val[1] }}</span></span>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- MoCA -->
                <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)] overflow-hidden">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h2 class="text-lg font-bold text-[var(--color-text)]">MoCA 估算分數</h2>
                      <p class="text-xs text-[var(--color-text-secondary)] mt-1">蒙特利爾認知評估</p>
                    </div>
                    <div 
                      class="text-sm font-bold px-3 py-1 rounded-full border"
                      :style="{ 
                        color: getInterpretationColor(professionalAssessment.moca.interpretation),
                        borderColor: getInterpretationColor(professionalAssessment.moca.interpretation),
                        backgroundColor: 'var(--color-bg-soft)'
                      }"
                    >
                      {{ getInterpretationDescription('moca', professionalAssessment.moca.interpretation) }}
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row gap-6 items-center">
                    <div 
                      class="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center shrink-0"
                      :style="{ borderColor: getInterpretationColor(professionalAssessment.moca.interpretation) }"
                    >
                      <span class="text-4xl font-black text-[var(--color-text)]">{{ professionalAssessment.moca.total }}</span>
                      <span class="text-xs text-[var(--color-text-secondary)] font-medium">/ 30</span>
                    </div>
                    
                    <div class="w-full grid grid-cols-2 gap-3">
                      <div class="p-2 bg-[var(--color-bg-soft)] rounded-xl flex justify-between items-center" v-for="(val, key) in {
                        '視/執行': [professionalAssessment.moca.visuospatialExecutive, 5],
                        '命名': [professionalAssessment.moca.naming, 3],
                        '注意力': [professionalAssessment.moca.attention, 6],
                        '語言': [professionalAssessment.moca.language, 3],
                        '抽象': [professionalAssessment.moca.abstraction, 2],
                        '回憶': [professionalAssessment.moca.delayedRecall, 5],
                        '定向': [professionalAssessment.moca.orientation, 6]
                      }" :key="key">
                        <span class="text-xs font-medium text-[var(--color-text-secondary)] truncate mr-2">{{ key }}</span>
                        <span class="text-sm font-bold text-[var(--color-text)] shrink-0">{{ val[0] }}<span class="text-[var(--color-text-muted)] text-xs">/{{ val[1] }}</span></span>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- CASI -->
                <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-[var(--color-text)]">CASI 估算分數</h2>
                  </div>
                  <div class="flex flex-col items-center justify-center py-4">
                    <div 
                      class="w-40 h-40 rounded-full border-[10px] flex flex-col items-center justify-center mb-3"
                      :style="{ borderColor: getInterpretationColor(professionalAssessment.casi.interpretation) }"
                    >
                      <span class="text-5xl font-black text-[var(--color-text)]">{{ professionalAssessment.casi.total }}</span>
                      <span class="text-sm text-[var(--color-text-secondary)] font-medium">/ 100</span>
                    </div>
                    <div 
                      class="text-lg font-bold" 
                      :style="{ color: getInterpretationColor(professionalAssessment.casi.interpretation) }"
                    >
                      {{ getInterpretationDescription('casi', professionalAssessment.casi.interpretation) }}
                    </div>
                  </div>
                </section>

                <!-- 建議行動 -->
                <section class="bg-[var(--color-primary-bg)] rounded-2xl p-5 border border-[var(--color-primary)]/20">
                  <h2 class="text-lg font-bold text-[var(--color-text)] mb-2 flex items-center gap-2">
                    <span>💡</span> 綜合建議
                  </h2>
                  <p class="text-[var(--color-text)] leading-relaxed">
                    {{ getRecommendedAction(professionalAssessment) }}
                  </p>
                </section>
              </template>

              <div v-else class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-6xl mb-4 opacity-50">📊</div>
                <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">資料不足</h3>
                <p class="text-[var(--color-text-secondary)] mb-6 max-w-xs">需要至少完成 5 次遊戲才能生成專業評估，目前已完成 {{ sessions.length }} 次</p>
                <router-link to="/games" class="btn btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                  開始訓練 →
                </router-link>
              </div>
            </div>

            <!-- 趨勢分析頁 -->
            <div v-if="selectedTab === 'trend'" class="space-y-6 animate-fade-in">
              <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
                <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-[var(--color-primary)]"></span>
                  分數趨勢
                </h2>
                <div class="h-64 w-full">
                  <TrendChart :history="scoreHistory" />
                </div>
              </section>

              <section>
                <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-warm)]"></span>
                  每日活動分布
                </h2>
                <div class="grid grid-cols-7 gap-2">
                  <div 
                    v-for="day in 7" 
                    :key="day"
                    class="aspect-[3/4] rounded-xl flex flex-col items-center justify-center border transition-all"
                    :class="weekSessions.some(s => new Date(s.createdAt).getDay() === (day % 7)) 
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm scale-105' 
                      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border-light)] opacity-60'"
                  >
                    <span class="text-xs font-bold mb-1" :class="weekSessions.some(s => new Date(s.createdAt).getDay() === (day % 7)) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'">
                      {{ ['日', '一', '二', '三', '四', '五', '六'][day % 7] }}
                    </span>
                    <span class="text-xl font-black text-[var(--color-text)]">
                      {{ weekSessions.filter(s => new Date(s.createdAt).getDay() === (day % 7)).length }}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <!-- 營養建議頁 -->
            <div v-if="selectedTab === 'nutrition'" class="space-y-6 animate-fade-in">
              <!-- 未解鎖 -->
              <div v-if="!nutritionUnlocked" class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-6xl mb-4">🔒</div>
                <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">尚未解鎖</h3>
                <p class="text-[var(--color-text-secondary)] mb-6">完成 {{ NUTRITION_UNLOCK_REQUIRED_TRAININGS }} 場遊戲後解鎖營養建議</p>
                
                <div class="w-full max-w-xs bg-[var(--color-surface-elevated)] rounded-full h-4 overflow-hidden shadow-inner mb-2">
                  <div 
                    class="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] transition-all duration-1000"
                    :style="{ width: `${nutritionUnlockPercent}%` }"
                  ></div>
                </div>
                <p class="text-sm font-bold text-[var(--color-primary)]">{{ nutritionUnlockProgress }} / {{ NUTRITION_UNLOCK_REQUIRED_TRAININGS }}</p>
              </div>

              <!-- 已解鎖 -->
              <template v-else-if="nutritionResult">
                <!-- 免責聲明 -->
                <div class="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 p-4 rounded-xl flex gap-3 items-start">
                  <span class="text-xl shrink-0">⚠️</span>
                  <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    以下營養建議僅供參考，不構成醫療診斷。開始任何補充計畫前請諮詢專業醫療人員。
                  </p>
                </div>

                <!-- 高優先建議 -->
                <section v-if="nutritionResult.recommendations.filter(r => r.priority === 'high').length > 0">
                  <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                    <span class="text-xl">🔴</span> 重點關注
                  </h2>
                  <div class="space-y-4">
                    <div 
                      v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'high')" 
                      :key="rec.id"
                      class="bg-[var(--color-danger)]/5 border-l-4 border-[var(--color-danger)] rounded-r-xl p-4 shadow-sm"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-lg text-[var(--color-text)]">{{ rec.supplement.name }}</span>
                        <span v-if="rec.supplement.isPartnerProduct" class="text-xs font-bold px-2 py-0.5 bg-[var(--color-warning)] text-white rounded-full">合作</span>
                      </div>
                      <p class="text-sm text-[var(--color-text-secondary)] mb-3 leading-relaxed">{{ rec.reason }}</p>
                      
                      <div class="flex flex-wrap gap-2 mb-3">
                        <span v-for="(benefit, i) in rec.supplement.benefits.slice(0, 2)" :key="i" class="text-xs px-2 py-1 bg-[var(--color-surface)] rounded text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          {{ benefit }}
                        </span>
                      </div>
                      
                      <div class="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-danger)]/10">
                        <span class="text-xs font-medium text-[var(--color-text-muted)]">建議劑量：{{ rec.supplement.dosageRange }}</span>
                        <a 
                          v-if="rec.supplement.isPartnerProduct && rec.supplement.partnerUrl"
                          :href="rec.supplement.partnerUrl" 
                          target="_blank"
                          class="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                        >
                          了解更多 →
                        </a>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 中優先建議 -->
                <section v-if="nutritionResult.recommendations.filter(r => r.priority === 'medium').length > 0">
                  <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                    <span class="text-xl">🟡</span> 建議考慮
                  </h2>
                  <div class="space-y-4">
                    <div 
                      v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'medium')" 
                      :key="rec.id"
                      class="bg-[var(--color-warning)]/5 border-l-4 border-[var(--color-warning)] rounded-r-xl p-4 shadow-sm"
                    >
                      <h3 class="font-bold text-[var(--color-text)] mb-2">{{ rec.supplement.name }}</h3>
                      <p class="text-sm text-[var(--color-text-secondary)] mb-2 leading-relaxed">{{ rec.reason }}</p>
                      <div class="text-xs text-[var(--color-text-muted)]">建議劑量：{{ rec.supplement.dosageRange }}</div>
                    </div>
                  </div>
                </section>

                <!-- 認知評估建議 -->
                <section v-if="nutritionResult.cognitiveBasedAdvice.length > 0" class="bg-[var(--color-surface-elevated)] p-5 rounded-2xl border border-[var(--color-border-light)]">
                  <h2 class="text-lg font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
                    <span>🧠</span> 認知評估建議
                  </h2>
                  <ul class="space-y-2 list-disc list-inside text-sm text-[var(--color-text-secondary)]">
                    <li v-for="(advice, i) in nutritionResult.cognitiveBasedAdvice" :key="i" class="leading-relaxed pl-1">{{ advice }}</li>
                  </ul>
                </section>

                <!-- 一般保健建議 -->
                <section class="bg-[var(--color-success)]/5 p-5 rounded-2xl border border-[var(--color-success)]/20">
                  <h2 class="text-lg font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
                    <span>💡</span> 一般保健建議
                  </h2>
                  <ul class="space-y-2 list-disc list-inside text-sm text-[var(--color-text-secondary)]">
                    <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i" class="leading-relaxed pl-1">{{ advice }}</li>
                  </ul>
                </section>
              </template>

              <!-- 載入中 -->
              <div v-else class="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
                <div class="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
                <p>正在分析您的認知數據...</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 隱藏滾動條但保持功能 */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
</style>
