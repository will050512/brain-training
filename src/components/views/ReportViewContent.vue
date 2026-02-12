<template>
  <PageShell
    v-if="isMobile"
    :ambient="true"
    contentClass="page-shell-flush"
    aria-label="認知評估報告"
  >
    <ReportMobileView
      ref="reportMobileRef"
      :isGenerating="isGenerating"
      :onDownloadReport="downloadReport"
      :userName="userStore.currentUser?.name || '使用者'"
      :userAge="userStore.userAge"
      :educationYears="userStore.currentUser?.educationYears || 0"
      :birthday="userStore.currentUser?.birthday || null"
      :cognitiveIndex="cognitiveIndex"
      :getScoreClass="getScoreClass"
      :formatBirthdayToRoc="formatBirthdayToRoc"
      :cognitiveDimensions="cognitiveDimensions"
      :cognitiveScores="gameStore.cognitiveScores"
      :previousScores="previousScores"
      :normativeData="normativeData"
      :scoreHistory="gameStore.scoreHistory"
      :dailyStats="dailyStats"
      :freeStats="freeStats"
      :formatPlayTime="formatPlayTime"
      :userStreak="userStore.currentStats?.streak || 0"
      :latestMiniCogResult="latestMiniCogResult"
      :miniCogHistory="miniCogHistory"
      :showMiniCogHistory="showMiniCogHistory"
      :onToggleMiniCogHistory="() => { showMiniCogHistory = !showMiniCogHistory }"
      :formatDateTime="formatDateTime"
      :getMiniCogScoreClass="getMiniCogScoreClass"
      :getMiniCogBorderClass="getMiniCogBorderClass"
      :getMiniCogInterpretation="getMiniCogInterpretation"
      :getMiniCogInterpretationClass="getMiniCogInterpretationClass"
      :trainingSuggestions="trainingSuggestions"
      :allGames="gameStore.allGames"
      :getBestScore="gameStore.getBestScore"
      :getAverageScore="gameStore.getAverageScore"
      :sessionsForCorrelation="gameStore.sessions"
      :recentSessions="gameStore.recentSessions"
      :getGameIcon="getGameIcon"
      :getGameName="getGameName"
      :nutritionUnlocked="nutritionUnlocked"
      :nutritionUnlockProgress="nutritionUnlockProgress"
      :nutritionUnlockPercent="nutritionUnlockPercent"
      :nutritionResult="nutritionResult"
      :showNutritionDisclaimer="showNutritionDisclaimer"
      :onToggleNutritionDisclaimer="() => { showNutritionDisclaimer = !showNutritionDisclaimer }"
    />
  </PageShell>

  <div
    v-else
    class="min-h-screen page-ambient font-sans text-[var(--color-text)] selection:bg-[var(--color-primary)] selection:text-[var(--color-text-inverse)]"
    aria-label="認知評估報告"
  >
    <ReportDesktopView
      ref="reportDesktopRef"
      :reportSections="reportSections"
      :activeSection="activeSection"
      :onScrollToSection="scrollToSection"
      :formatDate="formatDate"
      :isGenerating="isGenerating"
      :onDownloadReport="downloadReport"
      :userName="userStore.currentUser?.name || '使用者'"
      :userAge="userStore.userAge"
      :educationYears="userStore.currentUser?.educationYears || 0"
      :birthday="userStore.currentUser?.birthday || null"
      :cognitiveIndex="cognitiveIndex"
      :getScoreClass="getScoreClass"
      :formatBirthdayToRoc="formatBirthdayToRoc"
      :normativeComparison="normativeComparison"
      :normativeData="normativeData"
      :getAgeGroupLabel="getAgeGroupLabel"
      :cognitiveDimensions="cognitiveDimensions"
      :cognitiveScores="gameStore.cognitiveScores"
      :previousScores="previousScores"
      :getTrendIcon="getTrendIcon"
      :scoreHistory="gameStore.scoreHistory"
      :dailyStats="dailyStats"
      :freeStats="freeStats"
      :formatPlayTime="formatPlayTime"
      :userStreak="userStore.currentStats?.streak || 0"
      :latestMiniCogResult="latestMiniCogResult"
      :miniCogHistory="miniCogHistory"
      :showMiniCogHistory="showMiniCogHistory"
      :onToggleMiniCogHistory="() => { showMiniCogHistory = !showMiniCogHistory }"
      :formatDateTime="formatDateTime"
      :getMiniCogScoreClass="getMiniCogScoreClass"
      :getMiniCogBorderClass="getMiniCogBorderClass"
      :getMiniCogInterpretation="getMiniCogInterpretation"
      :getMiniCogInterpretationClass="getMiniCogInterpretationClass"
      :trainingSuggestions="trainingSuggestions"
      :allGames="gameStore.allGames"
      :getBestScore="gameStore.getBestScore"
      :getAverageScore="gameStore.getAverageScore"
      :sessionsForCorrelation="gameStore.sessions"
      :recentSessions="gameStore.recentSessions"
      :getGameIcon="getGameIcon"
      :getGameName="getGameName"
      :nutritionUnlocked="nutritionUnlocked"
      :nutritionUnlockProgress="nutritionUnlockProgress"
      :nutritionUnlockPercent="nutritionUnlockPercent"
      :nutritionResult="nutritionResult"
      :showNutritionDisclaimer="showNutritionDisclaimer"
      :onToggleNutritionDisclaimer="() => { showNutritionDisclaimer = !showNutritionDisclaimer }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore, useGameStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import { COGNITIVE_DIMENSIONS, emptyCognitiveScores, type CognitiveDimensionInfo } from '@/types/cognitive'
import { calculateCognitiveDomainScores, calculateCognitiveIndex, generateTrainingSuggestions } from '@/services/scoreCalculator'
import { analyzeTrainingDirection } from '@/services/correlationAnalysisService'
import { getLatestMiniCogResult, getUserMiniCogResults } from '@/services/db'
import { type MiniCogResult, getRiskLevelDescription, calculateMiniCogTotal } from '@/services/miniCogService'
import type { ReportUserInfo } from '@/services/pdfService'
import { getQuickReferenceCutoffs, getRiskLevel as getNormativeRiskLevel } from '@/services/taiwanNormativeData'
import { type PersonalizedNutritionResult } from '@/services/nutritionPlaceholder'
import { generateNutritionResultForUser } from '@/services/nutritionRecommendationService'
import { formatBirthdayToRoc } from '@/utils/birthday'
import { PageShell } from '@/components/layout'

import ReportDesktopView from '@/components/report/ReportDesktopView.vue'
import ReportMobileView from '@/components/report/ReportMobileView.vue'
import {
  getTotalGamesPlayed,
  NUTRITION_UNLOCK_REQUIRED_TRAININGS,
  getNutritionUnlockPercent,
  getNutritionUnlockProgress
} from '@/utils/trainingStats'
import type { NutritionReportData } from '@/services/pdfService'

const { isMobile } = useResponsive()
const userStore = useUserStore()
const gameStore = useGameStore()

// 圖表 Refs
const reportMobileRef = ref<InstanceType<typeof ReportMobileView> | null>(null)
const reportDesktopRef = ref<InstanceType<typeof ReportDesktopView> | null>(null)

// 狀態
const isGenerating = ref(false)
const activeSection = ref('user-info')
const latestMiniCogResult = ref<MiniCogResult | null>(null)
const miniCogHistory = ref<MiniCogResult[]>([])
const showMiniCogHistory = ref(false)
const nutritionResult = ref<PersonalizedNutritionResult | null>(null)
const showNutritionDisclaimer = ref(false)

// 檢查營養建議解鎖（完成指定訓練次數）
const nutritionUnlocked = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return totalGames >= NUTRITION_UNLOCK_REQUIRED_TRAININGS
})

const nutritionUnlockProgress = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockProgress(totalGames)
})

const nutritionUnlockPercent = computed(() => {
  const totalGames = getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
  return getNutritionUnlockPercent(totalGames)
})

const dailySessions = computed(() =>
  gameStore.sessions.filter(s => s.result?.mode === 'daily')
)

const freeSessions = computed(() =>
  gameStore.sessions.filter(s => s.result?.mode !== 'daily')
)

const dailyStats = computed(() => {
  const sessions = dailySessions.value
  const totalGames = sessions.length
  const totalPlayTime = sessions.reduce((sum: number, s) => sum + (s.result?.duration || 0), 0)
  const scores = sessions.map(s => s.result?.score).filter((v): v is number => typeof v === 'number')
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0
  return { totalGames, totalPlayTime, averageScore }
})

const freeStats = computed(() => {
  const sessions = freeSessions.value
  const totalGames = sessions.length
  const totalPlayTime = sessions.reduce((sum: number, s) => sum + (s.result?.duration || 0), 0)
  const scores = sessions.map(s => s.result?.score).filter((v): v is number => typeof v === 'number')
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0
  return { totalGames, totalPlayTime, averageScore }
})

type NormativeComparison = {
  statusText: string
  statusClass: string
}

// 報告區塊定義
const reportSections = [
  { id: 'user-info', name: '基本資訊', icon: '👤' },
  { id: 'normative', name: '常模參考', icon: '📊' },
  { id: 'cognitive-analysis', name: '認知分析', icon: '🧠' },
  { id: 'trends', name: '歷史趨勢', icon: '📈' },
  { id: 'statistics', name: '訓練統計', icon: '📋' },
  { id: 'mini-cog', name: 'Mini-Cog', icon: '🧪' },
  { id: 'correlation', name: '關聯分析', icon: '📐' },
  { id: 'games', name: '各遊戲表現', icon: '🎮' },
  { id: 'suggestions', name: '訓練建議', icon: '💡' },
  { id: 'nutrition', name: '營養建議', icon: '🥗' },
  { id: 'recent', name: '最近記錄', icon: '🕐' },
]

// 認知維度列表
const cognitiveDimensions = Object.values(COGNITIVE_DIMENSIONS) as CognitiveDimensionInfo[]

// 綜合認知指數
const cognitiveIndex = computed(() => 
  calculateCognitiveIndex(gameStore.cognitiveScores)
)

// 上週分數
const previousScores = computed(() => {
  const trends = gameStore.getWeeklyTrends()
  const scores = emptyCognitiveScores()
  trends.forEach((t: { dimension: keyof typeof scores; previousScore: number }) => {
    scores[t.dimension] = t.previousScore
  })
  return scores
})

const trainingSuggestions = computed(() => 
  generateTrainingSuggestions(gameStore.cognitiveScores)
)

// 台灣常模數據
const normativeData = computed(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  const cutoffs = getQuickReferenceCutoffs(age, eduYears)
  return {
    mmse: { cutoff: cutoffs.MMSE.dementia },
    moca: { cutoff: cutoffs.MoCA.dementia },
    casi: { cutoff: cutoffs.CASI.dementia }
  }
})

// 與常模比較結果
const normativeComparison = computed<NormativeComparison | null>(() => {
  const age = userStore.userAge
  const eduYears = userStore.userEducationYears
  if (!age || eduYears === null) return null
  
  // 估算 MMSE
  const estimatedMMSE = Math.round(cognitiveIndex.value * 30 / 100)
  const riskLevel = getNormativeRiskLevel(estimatedMMSE, 'MMSE', age, eduYears)
  
  const statusMap: Record<'normal' | 'warning' | 'mci' | 'dementia', NormativeComparison> = {
    'normal': { statusText: '表現良好 ?', statusClass: 'badge--success' },
    'warning': { statusText: '邊緣值 ?', statusClass: 'badge--warning' },
    'mci': { statusText: '需注意 ?', statusClass: 'badge--warning' },
    'dementia': { statusText: '建議諮詢 ?', statusClass: 'badge--danger' }
  }

  const mappedLevel = riskLevel as keyof typeof statusMap
  return statusMap[mappedLevel] ?? statusMap.normal
})

// 格式化函數
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}小時${mins}分`
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'text-[var(--color-success)]'
  if (score >= 60) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

function getTrendIcon(dimension: string): string {
  const trends = gameStore.getWeeklyTrends()
  const trend = trends.find((t: { dimension: string }) => t.dimension === dimension)
  return trend?.trend === 'improving' ? '📈' : (trend?.trend === 'declining' ? '📉' : '➖')
}

function getAgeGroupLabel(): string {
  const age = userStore.userAge
  if (!age) return ''
  if (age < 50) return '40-49歲'
  if (age < 60) return '50-59歲'
  if (age < 70) return '60-69歲'
  if (age < 80) return '70-79歲'
  return '80歲以上'
}

function getEducationLabel(): string {
  const eduYears = userStore.userEducationYears
  if (eduYears === null) return ''
  return eduYears <= 6 ? '低教育程度' : '高教育程度'
}

function getGameIcon(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.icon || '🎮'
}

function getGameName(gameId: string): string {
  const game = gameStore.allGames.find((g: { id: string }) => g.id === gameId)
  return game?.name || gameId
}

function getMiniCogScoreClass(score: number): string {
  return score >= 4 ? 'text-[var(--color-success)]' : (score >= 3 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]')
}

function getMiniCogBorderClass(score: number): string {
  return score >= 4 ? 'border-[var(--color-success)]' : (score >= 3 ? 'border-[var(--color-warning)]' : 'border-[var(--color-danger)]')
}

function getMiniCogInterpretation(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  return getRiskLevelDescription(riskLevel)
}

function getMiniCogInterpretationClass(result: MiniCogResult) {
  const { riskLevel } = calculateMiniCogTotal(result.wordRecall.score, result.clockDrawing.score)
  if (riskLevel === 'normal') return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]'
  if (riskLevel === 'borderline') return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]'
  return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]'
}

// 修正捲動邏輯：改用 scrollIntoView 
function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId)
  if (element) {
    // scrollIntoView 會自動找到最近的可捲動父層，並將元素滑到視野中
    // 搭配 CSS 的 scroll-margin-top (scroll-mt-8)，可以完美預留頂部空間
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSection.value = sectionId
  }
}

function getChartImages(): { radarChartImage: string | null; trendChartImage: string | null } {
  const reportRef = isMobile.value ? reportMobileRef.value : reportDesktopRef.value
  return {
    radarChartImage: reportRef?.getRadarChartDataURL() ?? null,
    trendChartImage: reportRef?.getTrendChartDataURL() ?? null
  }
}

// 更新滾動監聽 (針對 window)
function handleScroll() {
  if (isMobile.value) return // 手機版不處理側邊欄 Active 狀態

  const scrollY = window.scrollY
  // 找出目前在畫面中的 Section
  for (const section of reportSections) {
    const el = document.getElementById(section.id)
    if (el) {
      const top = el.offsetTop - 100
      const bottom = top + el.offsetHeight
      if (scrollY >= top && scrollY < bottom) {
        activeSection.value = section.id
        break
      }
    }
  }
}

async function downloadReport() {
  isGenerating.value = true
  try {
     const { generateCognitiveReport, downloadPdf, formatBehaviorSummary } = await import('@/services/pdfService')
     const { analyzeBehavior } = await import('@/services/behaviorAnalysisService')

     const userInfo: ReportUserInfo = {
       name: userStore.currentUser?.name || '未知',
       age: userStore.userAge || 0,
       educationYears: userStore.currentUser?.educationYears || 0,
      reportDate: new Date().toISOString().split('T')[0] as string
     }

     let miniCogReportData = null
     if (latestMiniCogResult.value) {
        const selfAssess = latestMiniCogResult.value.clockDrawing.selfAssessment
        const selfAssessScore = selfAssess 
          ? (selfAssess.hasCompleteCircle ? 1 : 0) + (selfAssess.hasCorrectNumbers ? 1 : 0) + (selfAssess.hasCorrectHands ? 1 : 0)
          : 0
        miniCogReportData = {
          totalScore: latestMiniCogResult.value.totalScore,
          wordRecallScore: latestMiniCogResult.value.wordRecall.score,
          clockDrawingScore: latestMiniCogResult.value.clockDrawing.score,
          clockSelfAssessment: selfAssessScore,
          atRisk: latestMiniCogResult.value.atRisk,
          duration: latestMiniCogResult.value.duration,
          completedAt: latestMiniCogResult.value.completedAt,
          clockImageData: latestMiniCogResult.value.clockDrawing.imageData,
          wordsUsed: latestMiniCogResult.value.wordRecall.wordSet?.words
        }
     }

     const cognitiveScoreData = calculateCognitiveDomainScores(
       gameStore.cognitiveScores,
       gameStore.dimensionSampleCounts
     )
     
     const trendData = gameStore.scoreHistory.slice(-20).map((h) => {
        const dims = Object.values(h.scores).filter(v => v > 0)
        const avgScore = dims.length > 0 ? dims.reduce((a, b) => a + b, 0) / dims.length : 0
        return { date: h.date, score: Math.round(avgScore), gameType: undefined }
     })

     let behaviorSummary = null
     if (gameStore.recentSessions.length > 0) {
        try {
           const latestSession = gameStore.recentSessions[0]
           if (latestSession?.id) {
              const analysis = await analyzeBehavior(latestSession.id)
              behaviorSummary = formatBehaviorSummary(analysis)
           }
        } catch (e) { console.warn('Behavior analysis skipped') }
     }

     // 獲取圖表圖片
     const { radarChartImage, trendChartImage } = getChartImages()
    const quickDirectionInsight = analyzeTrainingDirection(miniCogHistory.value, gameStore.sessions)

     let nutritionData: NutritionReportData | null = null
     if (nutritionUnlocked.value && nutritionResult.value) {
       nutritionData = {
         recommendations: nutritionResult.value.recommendations.map(r => ({
           name: r.supplement.name,
           reason: r.reason,
           priority: r.priority,
           dosage: r.supplement.dosageRange,
           isPartnerProduct: r.supplement.isPartnerProduct,
           partnerName: r.supplement.partnerName
         })),
         cognitiveAdvice: [...nutritionResult.value.cognitiveBasedAdvice, ...nutritionResult.value.ageBasedAdvice],
         generalAdvice: nutritionResult.value.generalAdvice
       }
     }

     const pdfBlob = await generateCognitiveReport(
        userInfo,
        miniCogReportData,
        cognitiveScoreData,
        trendData,
        behaviorSummary,
        { 
          includeClockDrawing: true, 
          includeTrends: true, 
          includeBehavior: true, 
          includeRecommendations: true, 
          includeNutrition: !!(nutritionUnlocked.value && nutritionData && nutritionData.recommendations.length > 0),
          language: 'bilingual',
          radarChartImage,
          trendChartImage,
          quickDirectionInsight
        },
        nutritionData
     )
     
     const filename = `認知評估報告_${userStore.currentUser?.name}_${new Date().toISOString().split('T')[0]}.pdf`
     downloadPdf(pdfBlob, filename)

  } catch (e) {
    console.error(e)
    alert('報告生成失敗')
  } finally {
    isGenerating.value = false
  }
}

onMounted(async () => {
  if (userStore.currentUser?.id) {
    try {
      latestMiniCogResult.value = await getLatestMiniCogResult(userStore.currentUser.id) || null
      miniCogHistory.value = await getUserMiniCogResults(userStore.currentUser.id)
    } catch (e) { console.error('Failed loading MiniCog data', e) }

    if (gameStore.sessions.length === 0) {
      await gameStore.loadUserSessions(userStore.currentUser.id)
    }
    
    // 生成營養建議（如已解鎖）
    if (nutritionUnlocked.value) {
      try {
        nutritionResult.value = await generateNutritionResultForUser({
          odId: userStore.currentUser.id,
          age: userStore.userAge || 65,
          educationYears: userStore.currentUser?.educationYears || 9,
          cognitiveScores: gameStore.cognitiveScores,
          sessions: gameStore.sessions
        })
      } catch (e) { 
        console.error('Failed generating nutrition recommendations', e) 
      }
    }
  }
  
  // 監聽 window 滾動
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style>
/* 隱藏 Scrollbar 但保持捲動功能 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 歷史展開動畫 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* 確保 Scroll Margin 生效 (讓錨點定位時有頭部空間) */
.scroll-mt-24 {
  scroll-margin-top: 6rem;
}

/* 閃光動畫 */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
