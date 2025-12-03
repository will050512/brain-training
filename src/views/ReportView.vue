<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
    <div class="container mx-auto px-4">
      <!-- 頭部 -->
      <div class="flex items-center justify-between mb-8">
        <router-link to="/" class="btn btn-secondary">
          ← 返回首頁
        </router-link>
        <h1 class="title-md">認知評估報告</h1>
        <div class="flex gap-2">
          <router-link to="/weekly-report" class="btn btn-secondary">
            📅 週報告
          </router-link>
          <button @click="downloadReport" class="btn btn-primary" :disabled="isGenerating">
            {{ isGenerating ? '生成中...' : '📥 下載 PDF' }}
          </button>
        </div>
      </div>

      <!-- 免責聲明 -->
      <div class="disclaimer-banner mb-6">
        <div class="flex items-start gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <p class="font-medium text-amber-800">重要聲明</p>
            <p class="text-sm text-amber-700">
              本系統提供的 MMSE/MoCA/CASI 分數為基於遊戲表現的估算值，僅供參考，
              不可作為醫療診斷依據。如有認知功能相關疑慮，請諮詢專業醫師或職能治療師進行正式評估。
            </p>
          </div>
        </div>
      </div>

      <!-- 報告內容 -->
      <div ref="reportRef" class="max-w-4xl mx-auto space-y-8">
        <!-- 使用者資訊卡片 -->
        <div class="card">
          <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl">
              👤
            </div>
            <div class="flex-1">
              <h2 class="text-2xl font-bold">{{ userStore.currentUser?.name }}</h2>
              <p class="text-gray-500">{{ userStore.userAge }} 歲</p>
              <p v-if="userStore.currentUser?.educationYears !== undefined" class="text-gray-400 text-sm">
                教育年數：{{ userStore.currentUser.educationYears }} 年
              </p>
              <p class="text-sm text-gray-400">
                報告生成日期：{{ formatDate(new Date()) }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500">綜合認知指數</div>
              <div class="text-4xl font-bold" :class="getScoreClass(cognitiveIndex)">
                {{ cognitiveIndex }}
              </div>
              <!-- 與台灣常模比較 -->
              <div v-if="normativeComparison" class="mt-2">
                <span 
                  class="text-xs px-2 py-1 rounded-full"
                  :class="normativeComparison.statusClass"
                >
                  {{ normativeComparison.statusText }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 台灣常模參考卡片 -->
        <div v-if="userStore.userAge && userStore.userEducationYears !== null" class="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 class="title-sm mb-4 flex items-center gap-2">
            <span>📊</span>
            台灣認知功能常模參考
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded-lg">
              <div class="text-sm text-gray-500 mb-1">MMSE 參考切截點</div>
              <div class="text-2xl font-bold text-blue-600">
                {{ normativeData?.mmse?.cutoff || '-' }}
              </div>
              <div class="text-xs text-gray-400">
                ({{ getAgeGroupLabel() }}，{{ getEducationLabel() }})
              </div>
            </div>
            <div class="bg-white p-4 rounded-lg">
              <div class="text-sm text-gray-500 mb-1">MoCA 參考切截點</div>
              <div class="text-2xl font-bold text-purple-600">
                {{ normativeData?.moca?.cutoff || '-' }}
              </div>
              <div class="text-xs text-gray-400">
                建議 ≥23 分為正常
              </div>
            </div>
            <div class="bg-white p-4 rounded-lg">
              <div class="text-sm text-gray-500 mb-1">CASI 參考切截點</div>
              <div class="text-2xl font-bold text-green-600">
                {{ normativeData?.casi?.cutoff || '-' }}
              </div>
              <div class="text-xs text-gray-400">
                分數越高越佳
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-4">
            ※ 以上數據參考台灣本土研究常模，實際評估請諮詢專業醫療人員
          </p>
        </div>

        <!-- 雷達圖 -->
        <div class="card">
          <h3 class="title-sm mb-6">認知能力分析</h3>
          <div class="flex flex-col md:flex-row gap-8">
            <div class="flex-1">
              <RadarChart 
                :scores="gameStore.cognitiveScores" 
                :previousScores="previousScores"
              />
            </div>
            <div class="flex-1">
              <!-- 各維度分數列表 -->
              <div class="space-y-4">
                <div v-for="dim in cognitiveDimensions" :key="dim.id" class="flex items-center gap-4">
                  <span class="text-2xl">{{ dim.icon }}</span>
                  <div class="flex-1">
                    <div class="flex justify-between mb-1">
                      <span class="font-medium">{{ dim.name }}</span>
                      <span class="font-bold" :style="{ color: dim.color }">
                        {{ gameStore.cognitiveScores[dim.id] }} 分
                      </span>
                    </div>
                    <div class="progress-bar">
                      <div 
                        class="progress-bar-fill"
                        :style="{ 
                          width: `${gameStore.cognitiveScores[dim.id]}%`,
                          backgroundColor: dim.color 
                        }"
                      ></div>
                    </div>
                  </div>
                  <!-- 趨勢指示 -->
                  <span class="text-xl">
                    {{ getTrendIcon(dim.id) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 趨勢圖 -->
        <div class="card">
          <h3 class="title-sm mb-6">歷史趨勢</h3>
          <TrendChart 
            :history="gameStore.scoreHistory" 
            :showWarningLines="true"
            :professionalMode="false"
          />
        </div>

        <!-- 訓練統計 -->
        <div class="card">
          <h3 class="title-sm mb-6">訓練統計</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">
                {{ userStore.currentStats?.totalGamesPlayed || 0 }}
              </div>
              <div class="text-gray-500">總遊戲次數</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">
                {{ userStore.currentStats?.averageScore || 0 }}
              </div>
              <div class="text-gray-500">平均分數</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600">
                {{ formatPlayTime(userStore.currentStats?.totalPlayTime || 0) }}
              </div>
              <div class="text-gray-500">總訓練時長</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-orange-600">
                {{ userStore.currentStats?.streak || 0 }}
              </div>
              <div class="text-gray-500">連續訓練天數</div>
            </div>
          </div>
        </div>

        <!-- Mini-Cog 評估記錄 -->
        <div v-if="latestMiniCogResult" class="card mini-cog-card">
          <div class="mini-cog-header">
            <h3 class="title-sm">Mini-Cog™ 認知篩檢</h3>
            <span class="mini-cog-date">
              {{ formatDateTime(latestMiniCogResult.completedAt) }}
            </span>
          </div>
          
          <div class="mini-cog-content">
            <!-- 分數圓圈 -->
            <div class="mini-cog-score-section">
              <div class="mini-cog-score-circle" :class="getMiniCogScoreClass(latestMiniCogResult.totalScore)">
                <span class="score-value">{{ latestMiniCogResult.totalScore }}</span>
                <span class="score-max">/ 5</span>
              </div>
              <div class="mini-cog-interpretation" :class="getMiniCogInterpretationClass(latestMiniCogResult)">
                <span class="interpretation-level">{{ getMiniCogInterpretation(latestMiniCogResult).level }}</span>
                <p class="interpretation-desc">{{ getMiniCogInterpretation(latestMiniCogResult).description }}</p>
              </div>
            </div>

            <!-- 分項分數 -->
            <div class="mini-cog-breakdown">
              <div class="breakdown-item">
                <span class="breakdown-icon">📝</span>
                <div class="breakdown-info">
                  <span class="breakdown-label">詞語回憶</span>
                  <span class="breakdown-score">{{ latestMiniCogResult.wordRecall.score }} / 3</span>
                </div>
                <div class="breakdown-bar">
                  <div 
                    class="breakdown-fill"
                    :style="{ width: `${(latestMiniCogResult.wordRecall.score / 3) * 100}%` }"
                  ></div>
                </div>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-icon">🕐</span>
                <div class="breakdown-info">
                  <span class="breakdown-label">時鐘繪圖</span>
                  <span class="breakdown-score">{{ latestMiniCogResult.clockDrawing.score }} / 2</span>
                </div>
                <div class="breakdown-bar">
                  <div 
                    class="breakdown-fill"
                    :style="{ width: `${(latestMiniCogResult.clockDrawing.score / 2) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- MMSE 對應說明 -->
            <div v-if="getMiniCogInterpretation(latestMiniCogResult).mmseCorrespondence" class="mmse-correspondence">
              <span class="mmse-icon">📊</span>
              <div class="mmse-info">
                <span class="mmse-label">MMSE 對照參考</span>
                <p class="mmse-value">
                  此分數對應 MMSE 約 {{ getMiniCogInterpretation(latestMiniCogResult).mmseCorrespondence }} 分
                </p>
                <p class="mmse-note">
                  （MMSE 滿分 30 分，24 分以下建議進一步評估）
                </p>
              </div>
            </div>

            <!-- 警示提醒 -->
            <div 
              v-if="getMiniCogInterpretation(latestMiniCogResult).needsFurtherAssessment" 
              class="mini-cog-warning"
            >
              <span class="warning-icon">⚠️</span>
              <div class="warning-content">
                <strong>建議事項</strong>
                <p>{{ latestMiniCogResult.mmseCorrelation }}</p>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="mini-cog-actions">
              <router-link to="/assessment" class="btn btn-secondary">
                重新測驗
              </router-link>
              <button 
                v-if="miniCogHistory.length > 1" 
                class="btn btn-secondary"
                @click="showMiniCogHistory = !showMiniCogHistory"
              >
                {{ showMiniCogHistory ? '隱藏歷史' : '查看歷史' }}
              </button>
            </div>
          </div>

          <!-- 歷史記錄展開 -->
          <Transition name="expand">
            <div v-if="showMiniCogHistory && miniCogHistory.length > 1" class="mini-cog-history">
              <h4 class="history-title">歷史評估記錄</h4>
              <div class="history-list">
                <div 
                  v-for="record in miniCogHistory.slice(1)" 
                  :key="record.id"
                  class="history-item"
                >
                  <div class="history-date">
                    {{ formatDate(new Date(record.completedAt)) }}
                  </div>
                  <div class="history-scores">
                    <span class="history-score" :class="getMiniCogScoreClass(record.totalScore)">
                      總分 {{ record.totalScore }}/5
                    </span>
                    <span class="history-detail">
                      詞語 {{ record.wordRecall.score }}/3 · 時鐘 {{ record.clockDrawing.score }}/2
                    </span>
                  </div>
                  <div class="history-status" :class="getMiniCogInterpretationClass(record)">
                    {{ getMiniCogInterpretation(record).level }}
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 無 Mini-Cog 記錄提示 -->
        <div v-else class="card mini-cog-empty">
          <div class="empty-content">
            <span class="empty-icon">🧠</span>
            <h3 class="empty-title">尚無 Mini-Cog™ 評估記錄</h3>
            <p class="empty-description">
              Mini-Cog 是一個快速的認知篩檢工具，約 3 分鐘即可完成。
              建議定期進行評估以追蹤認知功能變化。
            </p>
            <router-link to="/assessment" class="btn btn-primary">
              立即進行評估
            </router-link>
          </div>
        </div>

        <!-- 各遊戲表現 -->
        <div class="card">
          <h3 class="title-sm mb-6">各遊戲表現</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="game in gameStore.allGames" 
              :key="game.id"
              class="p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl">{{ game.icon }}</span>
                <span class="font-medium">{{ game.name }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">最佳成績</span>
                <span class="font-bold">{{ gameStore.getBestScore(game.id) || '-' }} 分</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">平均分數</span>
                <span>{{ gameStore.getAverageScore(game.id) || '-' }} 分</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">遊玩次數</span>
                <span>{{ gameStore.getSessionsByGame(game.id).length }} 次</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 訓練建議 -->
        <div class="card">
          <h3 class="title-sm mb-6">訓練建議</h3>
          <div class="space-y-4">
            <div 
              v-for="(suggestion, index) in trainingSuggestions" 
              :key="index"
              class="p-4 rounded-lg"
              :class="{
                'bg-red-50 border-l-4 border-red-500': suggestion.priority === 'high',
                'bg-yellow-50 border-l-4 border-yellow-500': suggestion.priority === 'medium',
                'bg-green-50 border-l-4 border-green-500': suggestion.priority === 'low',
              }"
            >
              <div class="flex items-start gap-3">
                <span class="text-2xl">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].icon }}</span>
                <div>
                  <div class="font-medium">{{ COGNITIVE_DIMENSIONS[suggestion.dimension].name }}</div>
                  <p class="text-gray-600 text-sm mt-1">{{ suggestion.message }}</p>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <span 
                      v-for="game in suggestion.suggestedGames" 
                      :key="game"
                      class="text-xs bg-white px-2 py-1 rounded"
                    >
                      {{ game }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近遊戲記錄 -->
        <div class="card">
          <h3 class="title-sm mb-6">最近遊戲記錄</h3>
          <div v-if="gameStore.recentSessions.length > 0" class="space-y-2">
            <div 
              v-for="session in gameStore.recentSessions" 
              :key="session.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ getGameIcon(session.gameId) }}</span>
                <div>
                  <div class="font-medium">{{ getGameName(session.gameId) }}</div>
                  <div class="text-sm text-gray-500">
                    {{ formatDateTime(session.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold" :class="getScoreClass(session.result.score)">
                  {{ session.result.score }} 分
                </div>
                <span 
                  class="difficulty-badge text-xs"
                  :class="`difficulty-${session.difficulty}`"
                >
                  {{ DIFFICULTIES[session.difficulty].name }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            尚無遊戲記錄
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore, useGameStore } from '@/stores'
import { COGNITIVE_DIMENSIONS, emptyCognitiveScores, type CognitiveDimensionInfo } from '@/types/cognitive'
import { DIFFICULTIES } from '@/types/game'
import { 
  calculateCognitiveIndex, 
  generateTrainingSuggestions
} from '@/services/scoreCalculator'
import { 
  getNormativeCutoff, 
  getRiskLevel,
  type NormativeResult 
} from '@/services/taiwanNormativeData'
import { getUserMiniCogResults, getLatestMiniCogResult } from '@/services/db'
import { 
  type MiniCogResult, 
  getRiskLevelDescription,
  calculateMiniCogTotal 
} from '@/services/miniCogService'
import RadarChart from '@/components/charts/RadarChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'

const userStore = useUserStore()
const gameStore = useGameStore()

// 狀態
const reportRef = ref<HTMLElement | null>(null)
const isGenerating = ref(false)

// Mini-Cog 相關狀態
const latestMiniCogResult = ref<MiniCogResult | null>(null)
const miniCogHistory = ref<MiniCogResult[]>([])
const showMiniCogHistory = ref(false)

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 綜合認知指數
const cognitiveIndex = computed(() => 
  calculateCognitiveIndex(gameStore.cognitiveScores)
)

// 上週分數（用於比較）
const previousScores = computed(() => {
  const trends = gameStore.getWeeklyTrends()
  const scores = emptyCognitiveScores()
  trends.forEach((t: { dimension: keyof typeof scores; previousScore: number }) => {
    scores[t.dimension] = t.previousScore
  })
  return scores
})

// 訓練建議
const trainingSuggestions = computed(() => 
  generateTrainingSuggestions(gameStore.cognitiveScores)
)

// 台灣常模數據
const normativeData = computed(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  return {
    mmse: getNormativeCutoff('MMSE', age, eduYears),
    moca: getNormativeCutoff('MoCA', age, eduYears),
    casi: getNormativeCutoff('CASI', age, eduYears)
  }
})

// 與常模比較結果
const normativeComparison = computed(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  // 使用遊戲分數估算的 MMSE 分數（綜合指數 * 30 / 100）
  const estimatedMMSE = Math.round(cognitiveIndex.value * 30 / 100)
  const riskLevel = getRiskLevel('MMSE', estimatedMMSE, age, eduYears)
  
  const statusMap: Record<string, { statusText: string; statusClass: string }> = {
    'normal': { statusText: '表現良好 ✓', statusClass: 'bg-green-100 text-green-700' },
    'borderline-mci': { statusText: '邊緣值 ⚠', statusClass: 'bg-yellow-100 text-yellow-700' },
    'mci-risk': { statusText: '需注意 ⚠', statusClass: 'bg-orange-100 text-orange-700' },
    'dementia-risk': { statusText: '建議諮詢專業 ⚠', statusClass: 'bg-red-100 text-red-700' }
  }
  
  return statusMap[riskLevel] || statusMap['normal']
})

// 年齡分組標籤
function getAgeGroupLabel(): string {
  const age = userStore.userAge
  if (!age) return ''
  if (age < 50) return '40-49歲'
  if (age < 60) return '50-59歲'
  if (age < 70) return '60-69歲'
  if (age < 80) return '70-79歲'
  return '80歲以上'
}

// 教育程度標籤
function getEducationLabel(): string {
  const eduYears = userStore.userEducationYears
  if (eduYears === null) return ''
  return eduYears <= 6 ? '低教育程度' : '高教育程度'
}

// 格式化日期
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// 格式化日期時間
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// 格式化遊玩時間
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}小時${mins}分`
}

// 取得分數顏色
function getScoreClass(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

// 取得趨勢圖示
function getTrendIcon(dimension: string): string {
  const trends = gameStore.getWeeklyTrends()
  const trend = trends.find((t: { dimension: string }) => t.dimension === dimension)
  if (!trend) return '➖'
  if (trend.trend === 'improving') return '📈'
  if (trend.trend === 'declining') return '📉'
  return '➖'
}

// 取得遊戲圖示
function getGameIcon(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.icon || '🎮'
}

// 取得遊戲名稱
function getGameName(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.name || gameId
}

// Mini-Cog 相關函數
function getMiniCogScoreClass(score: number): string {
  if (score >= 4) return 'score-good'
  if (score >= 3) return 'score-moderate'
  return 'score-concern'
}

function getMiniCogInterpretationClass(result: MiniCogResult): string {
  const { riskLevel } = calculateMiniCogTotal(
    result.wordRecall.score,
    result.clockDrawing.score
  )
  if (riskLevel === 'normal') return 'interpretation-normal'
  if (riskLevel === 'borderline') return 'interpretation-borderline'
  return 'interpretation-warning'
}

function getMiniCogInterpretation(result: MiniCogResult): {
  level: string
  description: string
  needsFurtherAssessment: boolean
  recommendation: string
  mmseCorrespondence: string | null
} {
  const { totalScore, riskLevel } = calculateMiniCogTotal(
    result.wordRecall.score,
    result.clockDrawing.score
  )
  const riskInfo = getRiskLevelDescription(riskLevel)
  
  return {
    level: riskInfo.label,
    description: riskInfo.description,
    needsFurtherAssessment: riskLevel === 'at-risk',
    recommendation: result.mmseCorrelation,
    mmseCorrespondence: totalScore <= 2 ? '≤24' : (totalScore === 3 ? '~24-26' : null)
  }
}

async function loadMiniCogData(): Promise<void> {
  if (!userStore.currentUser?.id) return
  
  try {
    const odId = userStore.currentUser.id
    latestMiniCogResult.value = await getLatestMiniCogResult(odId) || null
    miniCogHistory.value = await getUserMiniCogResults(odId)
  } catch (error) {
    console.error('Failed to load Mini-Cog data:', error)
  }
}

// 生命週期
onMounted(() => {
  loadMiniCogData()
})

// 下載報告
async function downloadReport(): Promise<void> {
  if (!reportRef.value) return
  
  isGenerating.value = true
  
  try {
    // 動態載入 html2pdf
    const html2pdf = (await import('html2pdf.js')).default
    
    const options = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `認知評估報告_${userStore.currentUser?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: 'a4' as const, 
        orientation: 'portrait' as const
      },
      pagebreak: { 
        mode: ['avoid-all', 'css'] as const,
        before: '.page-break-before',
        avoid: '.card'
      },
    }
    
    await html2pdf().set(options).from(reportRef.value).save()
  } catch (error) {
    console.error('PDF 生成失敗:', error)
    alert('報告生成失敗，請稍後再試')
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.disclaimer-banner {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 1rem;
}

/* Mini-Cog Card Styles */
.mini-cog-card {
  border: 2px solid #4f46e5;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
}

.mini-cog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9d5ff;
}

.mini-cog-date {
  font-size: 0.875rem;
  color: #7c3aed;
}

.mini-cog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.mini-cog-score-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.mini-cog-score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.mini-cog-score-circle.score-good {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.mini-cog-score-circle.score-moderate {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.mini-cog-score-circle.score-concern {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.mini-cog-score-circle .score-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.mini-cog-score-circle .score-max {
  font-size: 0.875rem;
  opacity: 0.9;
}

.mini-cog-interpretation {
  padding: 1rem;
  border-radius: 0.75rem;
  flex: 1;
}

.mini-cog-interpretation.interpretation-normal {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
}

.mini-cog-interpretation.interpretation-borderline {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.mini-cog-interpretation.interpretation-warning {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.interpretation-level {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.interpretation-desc {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.mini-cog-breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.breakdown-icon {
  font-size: 1.5rem;
}

.breakdown-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-label {
  font-weight: 500;
  color: #374151;
}

.breakdown-score {
  font-weight: 600;
  color: #4f46e5;
}

.breakdown-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.mmse-correspondence {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 0.75rem;
  border: 1px solid #bae6fd;
}

.mmse-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.mmse-info {
  flex: 1;
}

.mmse-label {
  font-weight: 600;
  color: #0369a1;
  display: block;
  margin-bottom: 0.25rem;
}

.mmse-value {
  margin: 0;
  color: #075985;
}

.mmse-note {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.mini-cog-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border-radius: 0.75rem;
  border-left: 4px solid #ef4444;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  color: #dc2626;
  display: block;
  margin-bottom: 0.25rem;
}

.warning-content p {
  margin: 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}

.mini-cog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  padding-top: 1rem;
  border-top: 1px solid #e9d5ff;
}

.mini-cog-history {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9d5ff;
}

.history-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.history-date {
  font-size: 0.875rem;
  color: #64748b;
  min-width: 100px;
}

.history-scores {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-score {
  font-weight: 600;
}

.history-score.score-good { color: #16a34a; }
.history-score.score-moderate { color: #d97706; }
.history-score.score-concern { color: #dc2626; }

.history-detail {
  font-size: 0.75rem;
  color: #64748b;
}

.history-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.history-status.interpretation-normal {
  background: #dcfce7;
  color: #166534;
}

.history-status.interpretation-borderline {
  background: #fef3c7;
  color: #92400e;
}

.history-status.interpretation-warning {
  background: #fee2e2;
  color: #991b1b;
}

/* Mini-Cog Empty State */
.mini-cog-empty {
  border: 2px dashed #c7d2fe;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.empty-content {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.empty-description {
  color: #64748b;
  max-width: 400px;
  margin: 0 auto 1.5rem;
}

/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Responsive */
@media (max-width: 640px) {
  .mini-cog-score-section {
    flex-direction: column;
    text-align: center;
  }

  .mini-cog-actions {
    flex-direction: column;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-date {
    min-width: auto;
  }
}
</style>
