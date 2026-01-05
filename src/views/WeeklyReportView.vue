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

// 本週遊戲記錄
const weekSessions = computed(() => {
  return sessions.value.filter(s => {
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
  if (!previousWeekScores.value) return { arrow: '→', class: 'trend-neutral', change: 0 }
  
  const current = cognitiveScores.value[dim] || 0
  const previous = previousWeekScores.value[dim] || 0
  const change = current - previous
  
  if (change >= 5) return { arrow: '↑', class: 'trend-up', change }
  if (change <= -5) return { arrow: '↓', class: 'trend-down', change }
  return { arrow: '→', class: 'trend-neutral', change }
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
  <div class="weekly-report">
    <header class="page-header">
      <button class="back-btn" @click="router.back()">
        ← 返回
      </button>
      <h1>📊 週訓練報告</h1>
      <button class="export-btn" @click="exportReport">
        匯出
      </button>
    </header>

    <!-- 免責聲明 -->
    <DisclaimerBanner />

    <!-- 週期範圍 -->
    <div class="week-range">
      {{ weekRange.formatted }}
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>正在生成報告...</p>
    </div>

    <template v-else>
      <!-- Tab 切換 -->
      <div class="tabs">
        <button 
          class="tab" 
          :class="{ active: selectedTab === 'overview' }"
          @click="selectedTab = 'overview'"
        >
          概覽
        </button>
        <button 
          class="tab" 
          :class="{ active: selectedTab === 'professional' }"
          @click="selectedTab = 'professional'"
        >
          專業評估
        </button>
        <button 
          class="tab" 
          :class="{ active: selectedTab === 'trend' }"
          @click="selectedTab = 'trend'"
        >
          趨勢分析
        </button>
        <button 
          class="tab" 
          :class="{ active: selectedTab === 'nutrition' }"
          @click="selectedTab = 'nutrition'"
        >
          營養建議
        </button>
      </div>

      <!-- 概覽頁 -->
      <div v-if="selectedTab === 'overview'" class="tab-content">
        <!-- 週統計 -->
        <section class="stats-section">
          <h2>本週統計</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">🎮</div>
              <div class="stat-value">{{ weekStats.totalGames }}</div>
              <div class="stat-label">遊戲次數</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-value">{{ formatTime(weekStats.totalTime) }}</div>
              <div class="stat-label">總訓練時間</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📈</div>
              <div class="stat-value">{{ weekStats.avgScore }}</div>
              <div class="stat-label">平均分數</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-value">{{ weekStats.avgAccuracy }}%</div>
              <div class="stat-label">平均正確率</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🧩</div>
              <div class="stat-value">{{ weekStats.uniqueGames }}</div>
              <div class="stat-label">遊戲種類</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-value">{{ weekStats.activeDays }}</div>
              <div class="stat-label">活躍天數</div>
            </div>
          </div>
        </section>

        <!-- 認知雷達圖 -->
        <section class="radar-section">
          <h2>認知能力分布</h2>
          <div class="radar-container">
            <RadarChart :scores="cognitiveScores" />
          </div>
        </section>

        <!-- 各維度分數（加入趨勢箭頭） -->
        <section class="dimensions-section">
          <h2>各維度表現</h2>
          <div class="dimension-list">
            <div 
              v-for="(score, dim) in cognitiveScores" 
              :key="dim"
              class="dimension-item"
            >
              <div class="dimension-header">
                <span class="dimension-icon">{{ dimensionIcons[dim as CognitiveDimension] }}</span>
                <span class="dimension-name">{{ dimensionNames[dim as CognitiveDimension] }}</span>
                <span 
                  class="trend-arrow"
                  :class="getTrendArrow(dim as CognitiveDimension).class"
                >
                  {{ getTrendArrow(dim as CognitiveDimension).arrow }}
                  <small v-if="getTrendArrow(dim as CognitiveDimension).change !== 0">
                    {{ getTrendArrow(dim as CognitiveDimension).change > 0 ? '+' : '' }}{{ getTrendArrow(dim as CognitiveDimension).change }}
                  </small>
                </span>
              </div>
              <div class="dimension-bar">
                <div 
                  class="dimension-fill"
                  :class="score >= 70 ? 'fill-good' : score >= 50 ? 'fill-moderate' : 'fill-concern'"
                  :style="{ width: `${score}%` }"
                ></div>
              </div>
              <div class="dimension-score">{{ score }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- 專業評估頁 -->
      <div v-if="selectedTab === 'professional'" class="tab-content">
        <template v-if="professionalAssessment">
          <!-- MMSE -->
          <section class="assessment-section">
            <h2>MMSE 估算分數</h2>
            <p class="assessment-desc">簡易智能狀態測驗 (Mini-Mental State Examination)</p>
            <div class="assessment-score">
              <div class="score-circle" :style="{ borderColor: getInterpretationColor(professionalAssessment.mmse.interpretation) }">
                <span class="score-value">{{ professionalAssessment.mmse.total }}</span>
                <span class="score-max">/ 30</span>
              </div>
              <div class="score-interpretation" :style="{ color: getInterpretationColor(professionalAssessment.mmse.interpretation) }">
                {{ getInterpretationDescription('mmse', professionalAssessment.mmse.interpretation) }}
              </div>
            </div>
            <div class="score-details">
              <div class="detail-item">
                <span>定向力</span>
                <span>{{ professionalAssessment.mmse.orientation }} / 10</span>
              </div>
              <div class="detail-item">
                <span>登錄</span>
                <span>{{ professionalAssessment.mmse.registration }} / 3</span>
              </div>
              <div class="detail-item">
                <span>注意力與計算</span>
                <span>{{ professionalAssessment.mmse.attention }} / 5</span>
              </div>
              <div class="detail-item">
                <span>回憶</span>
                <span>{{ professionalAssessment.mmse.recall }} / 3</span>
              </div>
              <div class="detail-item">
                <span>語言</span>
                <span>{{ professionalAssessment.mmse.language }} / 8</span>
              </div>
              <div class="detail-item">
                <span>視覺空間</span>
                <span>{{ professionalAssessment.mmse.visuospatial }} / 1</span>
              </div>
            </div>
          </section>

          <!-- MoCA -->
          <section class="assessment-section">
            <h2>MoCA 估算分數</h2>
            <p class="assessment-desc">蒙特利爾認知評估 (Montreal Cognitive Assessment)</p>
            <div class="assessment-score">
              <div class="score-circle" :style="{ borderColor: getInterpretationColor(professionalAssessment.moca.interpretation) }">
                <span class="score-value">{{ professionalAssessment.moca.total }}</span>
                <span class="score-max">/ 30</span>
              </div>
              <div class="score-interpretation" :style="{ color: getInterpretationColor(professionalAssessment.moca.interpretation) }">
                {{ getInterpretationDescription('moca', professionalAssessment.moca.interpretation) }}
              </div>
            </div>
            <div class="score-details">
              <div class="detail-item">
                <span>視覺空間/執行功能</span>
                <span>{{ professionalAssessment.moca.visuospatialExecutive }} / 5</span>
              </div>
              <div class="detail-item">
                <span>命名</span>
                <span>{{ professionalAssessment.moca.naming }} / 3</span>
              </div>
              <div class="detail-item">
                <span>注意力</span>
                <span>{{ professionalAssessment.moca.attention }} / 6</span>
              </div>
              <div class="detail-item">
                <span>語言</span>
                <span>{{ professionalAssessment.moca.language }} / 3</span>
              </div>
              <div class="detail-item">
                <span>抽象</span>
                <span>{{ professionalAssessment.moca.abstraction }} / 2</span>
              </div>
              <div class="detail-item">
                <span>延遲回憶</span>
                <span>{{ professionalAssessment.moca.delayedRecall }} / 5</span>
              </div>
              <div class="detail-item">
                <span>定向</span>
                <span>{{ professionalAssessment.moca.orientation }} / 6</span>
              </div>
            </div>
          </section>

          <!-- CASI -->
          <section class="assessment-section">
            <h2>CASI 估算分數</h2>
            <p class="assessment-desc">認知能力篩檢量表 (Cognitive Abilities Screening Instrument)</p>
            <div class="assessment-score">
              <div class="score-circle large" :style="{ borderColor: getInterpretationColor(professionalAssessment.casi.interpretation) }">
                <span class="score-value">{{ professionalAssessment.casi.total }}</span>
                <span class="score-max">/ 100</span>
              </div>
              <div class="score-interpretation" :style="{ color: getInterpretationColor(professionalAssessment.casi.interpretation) }">
                {{ getInterpretationDescription('casi', professionalAssessment.casi.interpretation) }}
              </div>
            </div>
          </section>

          <!-- 建議行動 -->
          <section class="recommendation-section">
            <h2>💡 建議</h2>
            <p class="recommendation-text">
              {{ getRecommendedAction(professionalAssessment) }}
            </p>
          </section>
        </template>

        <div v-else class="no-data">
          <div class="no-data-icon">📊</div>
          <p>需要至少完成 5 次遊戲才能生成專業評估</p>
          <p class="sub">目前已完成 {{ sessions.length }} 次</p>
          <router-link to="/games" class="start-link">開始訓練 →</router-link>
        </div>
      </div>

      <!-- 趨勢分析頁 -->
      <div v-if="selectedTab === 'trend'" class="tab-content">
        <section class="trend-section">
          <h2>分數趨勢</h2>
          <TrendChart :history="scoreHistory" />
        </section>

        <section class="activity-section">
          <h2>每日活動</h2>
          <div class="activity-calendar">
            <div 
              v-for="day in 7" 
              :key="day"
              class="calendar-day"
              :class="{ 
                active: weekSessions.some(s => 
                  new Date(s.createdAt).getDay() === (day % 7)
                )
              }"
            >
              <span class="day-name">
                {{ ['日', '一', '二', '三', '四', '五', '六'][day % 7] }}
              </span>
              <span class="day-count">
                {{ weekSessions.filter(s => new Date(s.createdAt).getDay() === (day % 7)).length }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- 營養建議頁 -->
      <div v-if="selectedTab === 'nutrition'" class="tab-content">
        <!-- 未解鎖 -->
        <div v-if="!nutritionUnlocked" class="no-data">
          <div class="no-data-icon">🔒</div>
          <p>完成 {{ NUTRITION_UNLOCK_REQUIRED_TRAININGS }} 場遊戲後解鎖營養建議</p>
          <p class="sub">目前已完成 {{ nutritionUnlockProgress }} 場</p>
          <div class="unlock-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${nutritionUnlockPercent}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ nutritionUnlockProgress }}/{{ NUTRITION_UNLOCK_REQUIRED_TRAININGS }}</span>
          </div>
        </div>

        <!-- 已解鎖 -->
        <template v-else-if="nutritionResult">
          <!-- 免責聲明 -->
          <section class="nutrition-disclaimer">
            <div class="disclaimer-icon">⚠️</div>
            <p>以下營養建議僅供參考，不構成醫療診斷。開始任何補充計畫前請諮詢專業醫療人員。</p>
          </section>

          <!-- 高優先建議 -->
          <section v-if="nutritionResult.recommendations.filter(r => r.priority === 'high').length > 0" class="nutrition-section">
            <h2>🔴 重點關注</h2>
            <div class="supplement-list">
              <div 
                v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'high')" 
                :key="rec.id"
                class="supplement-card priority-high"
              >
                <div class="supplement-header">
                  <span class="supplement-name">{{ rec.supplement.name }}</span>
                  <span v-if="rec.supplement.isPartnerProduct" class="partner-badge">合作</span>
                </div>
                <p class="supplement-reason">{{ rec.reason }}</p>
                <div class="supplement-benefits">
                  <span v-for="(benefit, i) in rec.supplement.benefits.slice(0, 2)" :key="i" class="benefit-tag">
                    {{ benefit }}
                  </span>
                </div>
                <div class="supplement-dosage">建議劑量：{{ rec.supplement.dosageRange }}</div>
                <a 
                  v-if="rec.supplement.isPartnerProduct && rec.supplement.partnerUrl"
                  :href="rec.supplement.partnerUrl" 
                  target="_blank"
                  class="partner-link"
                >
                  了解更多 →
                </a>
              </div>
            </div>
          </section>

          <!-- 中優先建議 -->
          <section v-if="nutritionResult.recommendations.filter(r => r.priority === 'medium').length > 0" class="nutrition-section">
            <h2>🟡 建議考慮</h2>
            <div class="supplement-list">
              <div 
                v-for="rec in nutritionResult.recommendations.filter(r => r.priority === 'medium')" 
                :key="rec.id"
                class="supplement-card priority-medium"
              >
                <div class="supplement-header">
                  <span class="supplement-name">{{ rec.supplement.name }}</span>
                </div>
                <p class="supplement-reason">{{ rec.reason }}</p>
                <div class="supplement-dosage">建議劑量：{{ rec.supplement.dosageRange }}</div>
              </div>
            </div>
          </section>

          <!-- 認知評估建議 -->
          <section v-if="nutritionResult.cognitiveBasedAdvice.length > 0" class="advice-section">
            <h2>🧠 認知評估建議</h2>
            <ul class="advice-list">
              <li v-for="(advice, i) in nutritionResult.cognitiveBasedAdvice" :key="i">{{ advice }}</li>
            </ul>
          </section>

          <!-- 一般保健建議 -->
          <section class="advice-section general">
            <h2>💡 一般保健建議</h2>
            <ul class="advice-list">
              <li v-for="(advice, i) in nutritionResult.generalAdvice" :key="i">{{ advice }}</li>
            </ul>
          </section>
        </template>

        <!-- 載入中 -->
        <div v-else class="loading">
          <div class="spinner"></div>
          <p>正在分析您的認知數據...</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.weekly-report {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.back-btn,
.export-btn {
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-surface-alt);
}

.page-header h1 {
  flex: 1;
  font-size: 1.5rem;
  margin: 0;
  color: var(--color-text);
}

.export-btn {
  background: var(--color-primary);
  color: white;
  border: none;
}

.export-btn:hover {
  opacity: 0.9;
}

.week-range {
  text-align: center;
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

/* 載入中 */
.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text-secondary);
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.tab.active {
  color: var(--color-primary);
  font-weight: bold;
  background: var(--color-surface);
}

/* 統計區塊 */
.stats-section h2,
.radar-section h2,
.dimensions-section h2,
.assessment-section h2,
.trend-section h2,
.activity-section h2,
.recommendation-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* 雷達圖 */
.radar-container {
  max-width: 400px;
  margin: 0 auto 2rem;
}

/* 維度列表 */
.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dimension-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dimension-name {
  width: 80px;
  font-weight: 500;
  color: var(--color-text);
}

.dimension-bar {
  flex: 1;
  height: 20px;
  background: var(--color-surface-alt);
  border-radius: 10px;
  overflow: hidden;
}

.dimension-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.dimension-fill.fill-good {
  background-color: var(--color-success);
}

.dimension-fill.fill-moderate {
  background-color: var(--color-warning);
}

.dimension-fill.fill-concern {
  background-color: var(--color-danger);
}

.dimension-score {
  width: 40px;
  text-align: right;
  font-weight: bold;
  color: var(--color-text);
}

/* 專業評估 */
.assessment-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.assessment-desc {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.assessment-score {
  text-align: center;
  margin-bottom: 1.5rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 6px solid;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  background: var(--color-surface);
}

.score-circle.large {
  width: 140px;
  height: 140px;
}

.score-value {
  font-size: 2.5rem;
  font-weight: bold;
  line-height: 1;
  color: var(--color-text);
}

.score-max {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.score-interpretation {
  font-size: 1.125rem;
  font-weight: bold;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--color-border);
  color: var(--color-text);
}

.detail-item:last-child {
  border-bottom: none;
}

/* 建議 */
.recommendation-section {
  background: var(--color-primary-bg);
  border-radius: 16px;
  padding: 1.5rem;
}

:where(.dark, .dark *) .recommendation-section {
  background: var(--color-primary-bg);
}

.recommendation-text {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  color: var(--color-text);
}

/* 無資料 */
.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.no-data-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-data .sub {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.start-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: bold;
}

/* 活動日曆 */
.activity-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.calendar-day {
  text-align: center;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.calendar-day.active {
  background: rgba(59, 130, 246, 0.15);
  border: 2px solid var(--color-primary);
}

.day-name {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.day-count {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text);
}

/* 響應式 */
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabs {
    overflow-x: auto;
  }
}

/* 維度趨勢箭頭 */
.dimension-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
}

.dimension-icon {
  font-size: 1rem;
}

.trend-arrow {
  font-size: 0.875rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 2px;
}

.trend-arrow small {
  font-size: 0.625rem;
}

.trend-up {
  color: var(--color-success, #22c55e);
}

.trend-down {
  color: var(--color-danger, #ef4444);
}

.trend-neutral {
  color: var(--color-text-muted);
}

/* 營養建議頁樣式 */
.nutrition-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.disclaimer-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.nutrition-disclaimer p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.nutrition-section {
  margin-bottom: 1.5rem;
}

.nutrition-section h2 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.supplement-list {
  display: grid;
  gap: 1rem;
}

.supplement-card {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  border-left: 4px solid;
}

.supplement-card.priority-high {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.supplement-card.priority-medium {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.supplement-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.supplement-name {
  font-weight: bold;
  color: var(--color-text);
}

.partner-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: rgba(251, 191, 36, 0.2);
  color: #d97706;
  border-radius: 4px;
  font-weight: bold;
}

.supplement-reason {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
}

.supplement-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.benefit-tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-surface-alt);
  border-radius: 4px;
  color: var(--color-text-muted);
}

.supplement-dosage {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.partner-link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
}

.partner-link:hover {
  text-decoration: underline;
}

.advice-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.advice-section.general {
  background: rgba(34, 197, 94, 0.05);
  border-color: rgba(34, 197, 94, 0.2);
}

.advice-section h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
  color: var(--color-text);
}

.advice-list {
  margin: 0;
  padding-left: 1.25rem;
}

.advice-list li {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.unlock-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.progress-bar {
  width: 150px;
  height: 8px;
  background: var(--color-surface-alt);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #22c55e);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: bold;
}
</style>
