<script setup lang="ts">
/**
 * 每日挑戰視圖
 * 自動生成覆蓋所有6個認知維度的訓練菜單
 * 一鍵開始連續訓練模式
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { 
  createPersonalizedTrainingPlan, 
  getTodayPlan,
  regenerateDailyPlan,
  type DailyTrainingPlan,
  type TrainingGameItem
} from '@/services/dailyTrainingService'
import type { CognitiveScores, CognitiveDimension } from '@/types/cognitive'
import { getTotalGamesPlayed } from '@/utils/trainingStats'
import { getAssetDisplay } from '@/services/assetLoader'
import { PageShell, PageHeader, SectionStack } from '@/components/layout'
import DailyChallengeLoading from '@/components/daily-challenge/DailyChallengeLoading.vue'
import DailyChallengeSummary from '@/components/daily-challenge/DailyChallengeSummary.vue'
import DailyChallengeFocus from '@/components/daily-challenge/DailyChallengeFocus.vue'
import DailyChallengeList from '@/components/daily-challenge/DailyChallengeList.vue'
import DailyChallengeDisclaimer from '@/components/daily-challenge/DailyChallengeDisclaimer.vue'
import DailyChallengeEmptyState from '@/components/daily-challenge/DailyChallengeEmptyState.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()

const trainingPlan = ref<DailyTrainingPlan | null>(null)
const isLoading = ref(true)
const isStarting = ref(false)
const gameIconMap = ref<Record<string, { emoji: string; path?: string }>>({})

// 維度名稱映射
const dimensionNames: Record<CognitiveDimension, string> = {
  reaction: '反應力',
  logic: '邏輯力',
  memory: '記憶力',
  cognition: '認知力',
  coordination: '協調力',
  attention: '專注力',
}

// 維度圖示映射
const dimensionIcons: Record<CognitiveDimension, string> = {
  reaction: '⚡',
  logic: '🧩',
  memory: '🧠',
  cognition: '💡',
  coordination: '🎯',
  attention: '👁️',
}

// 維度顏色映射 (Warm & Distinct)
const dimensionColors: Record<CognitiveDimension, string> = {
  reaction: 'var(--color-reaction)',
  logic: 'var(--color-logic)',
  memory: 'var(--color-memory)',
  cognition: 'var(--color-cognition)',
  coordination: 'var(--color-coordination)',
  attention: 'var(--color-attention)',
}

// 計算覆蓋的維度
const coveredDimensions = computed(() => {
  if (!trainingPlan.value) return new Set<CognitiveDimension>()
  
  const dims = new Set<CognitiveDimension>()
  for (const game of trainingPlan.value.games) {
    for (const dim of game.targetDimensions) {
      dims.add(dim)
    }
  }
  return dims
})

// 所有維度列表
const allDimensions: CognitiveDimension[] = [
  'memory', 'attention', 'logic', 'reaction', 'cognition', 'coordination'
]

// 今日進度
const todayProgress = computed(() => {
  if (!trainingPlan.value) return 0
  return trainingPlan.value.progress
})

// 是否已完成
const isCompleted = computed(() => trainingPlan.value?.status === 'completed' || false)

// 是否可以繼續（有未完成的遊戲）
const canContinue = computed(() => {
  if (!trainingPlan.value) return false
  return Boolean(
    trainingPlan.value.canContinue ||
    trainingPlan.value.completedGames < trainingPlan.value.totalGames
  )
})

// 預估時間（分鐘）
const estimatedMinutes = computed(() => {
  if (!trainingPlan.value) return 0
  return Math.ceil(trainingPlan.value.totalEstimatedTime / 60)
})

const totalGamesPlayed = computed(() => {
  return getTotalGamesPlayed(userStore.currentStats?.totalGamesPlayed, gameStore.sessions.length)
})

const shouldPrioritizeUntested = computed(() => totalGamesPlayed.value < 18)

const untestedDimensions = computed(() => {
  return shouldPrioritizeUntested.value ? gameStore.untestedDimensions : []
})

// 載入訓練計畫
async function loadTrainingPlan() {
  isLoading.value = true
  
  try {
    const odId = userStore.currentUser?.id
    if (!odId) return
    
    // 先嘗試取得今日已有計畫
    let plan = await getTodayPlan(odId)
    
    if (!plan) {
      // 沒有計畫，自動生成新計畫
      const cognitiveScores: CognitiveScores = gameStore.cognitiveScores || {
        reaction: 50,
        logic: 50,
        memory: 50,
        cognition: 50,
        coordination: 50,
        attention: 50,
      }
      
      const recentSessions = gameStore.recentSessions.map(s => ({
        gameId: s.gameId,
        accuracy: s.result?.accuracy,
        id: s.id
      }))
      
      const duration = settingsStore.dailyTrainingDuration || 15
      plan = await createPersonalizedTrainingPlan(
        odId,
        duration,
        cognitiveScores,
        recentSessions,
        {
          untestedDimensions: untestedDimensions.value,
          prioritizeUntested: shouldPrioritizeUntested.value,
          weeklyGoal: settingsStore.weeklyTrainingGoal,
        }
      )
    }
    
    trainingPlan.value = plan
    await loadTrainingPlanIcons(plan)
  } catch (error) {
    console.error('載入訓練計畫失敗:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadTrainingPlanIcons(plan: DailyTrainingPlan): Promise<void> {
  const entries = await Promise.all(
    plan.games.map(async game => {
      const usage = `game.icon.${game.gameId}`
      const info = await getAssetDisplay(usage)
      return [game.gameId, info] as const
    })
  )
  const map: Record<string, { emoji: string; path?: string }> = {}
  entries.forEach(([id, info]) => {
    map[id] = info
  })
  gameIconMap.value = map
}

function resolveGameIcon(gameId: string) {
  return gameIconMap.value[gameId]
}

// 重新生成計畫
async function regeneratePlan() {
  if (!trainingPlan.value || trainingPlan.value.status !== 'not-started') return
  
  isLoading.value = true
  try {
    const odId = userStore.currentUser?.id
    if (!odId) return
    
    const cognitiveScores: CognitiveScores = gameStore.cognitiveScores || {
      reaction: 50,
      logic: 50,
      memory: 50,
      cognition: 50,
      coordination: 50,
      attention: 50,
    }
    
    const recentSessions = gameStore.recentSessions.map(s => ({
      gameId: s.gameId,
      accuracy: s.result?.accuracy,
      id: s.id
    }))
    
    const duration = settingsStore.dailyTrainingDuration || 15
    
    const plan = await regenerateDailyPlan(
      odId,
      duration,
      cognitiveScores,
      recentSessions,
      {
        untestedDimensions: untestedDimensions.value,
        prioritizeUntested: shouldPrioritizeUntested.value,
        weeklyGoal: settingsStore.weeklyTrainingGoal,
      }
    )
    
    trainingPlan.value = plan
  } catch (error) {
    console.error('重新生成計畫失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 一鍵開始訓練
async function startTraining() {
  if (!trainingPlan.value || trainingPlan.value.games.length === 0) return
  
  isStarting.value = true
  
  try {
    // 找出第一個未完成的遊戲
    const nextGame = trainingPlan.value.games.find(g => !g.isCompleted)
    if (!nextGame) {
      // 全部完成，重新開始第一個
      const firstGame = trainingPlan.value.games[0]
      if (firstGame) {
        await startGame(firstGame)
      }
      return
    }
    
    await startGame(nextGame)
  } finally {
    isStarting.value = false
  }
}

// 開始特定遊戲
async function startGame(game: TrainingGameItem) {
  // 設定訓練隊列
  const queue = trainingPlan.value!.games.map(g => ({
    gameId: g.gameId,
    difficulty: g.difficulty,
    subDifficulty: g.subDifficulty,
    isCompleted: g.isCompleted,
    manualOverride: g.manualOverride ?? false
  }))
  
  gameStore.setDailyTrainingQueue(queue)
  
  // 跳到對應的遊戲索引
  const gameIndex = trainingPlan.value!.games.findIndex(g => g.gameId === game.gameId)
  if (gameIndex > 0) {
    for (let i = 0; i < gameIndex; i++) {
      gameStore.moveToNextTrainingGame()
    }
  }
  
  // 選擇遊戲並跳轉
  gameStore.selectGame(game.gameId)
  gameStore.selectDifficulty(game.difficulty)
  gameStore.selectSubDifficulty(game.subDifficulty)
  router.push({
    path: `/games/${game.gameId}`,
    query: { fromDaily: 'true', subDifficulty: String(game.subDifficulty) }
  })
}

// 難度文字
function getDifficultyText(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '簡單'
    case 'medium': return '中等'
    case 'hard': return '困難'
    default: return ''
  }
}

// 難度樣式類別
function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-transparent'
    case 'medium': return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-transparent'
    case 'hard': return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-transparent'
    default: return 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]'
  }
}

onMounted(() => {
  loadTrainingPlan()
})

// 監聽路由變化，當重新進入此頁面時刷新
watch(() => route.path, (newPath) => {
  if (newPath === '/daily-challenge') {
    loadTrainingPlan()
  }
})

watch(
  () => [settingsStore.dailyTrainingDuration, settingsStore.weeklyTrainingGoal],
  () => {
    if (isLoading.value) return
    if (!trainingPlan.value) {
      loadTrainingPlan()
      return
    }
    if (trainingPlan.value.status !== 'not-started') return
    regeneratePlan()
  }
)
</script>

<template>
  <PageShell background="soft">
    <PageHeader
      title="每日挑戰"
      subtitle="依照您的狀態自動安排 6 大維度訓練"
      icon="🎯"
    />

    <SectionStack>
      <DailyChallengeLoading v-if="isLoading" />

      <template v-else-if="trainingPlan">
        <div class="section-label px-1 py-2 text-[length:var(--font-size-base)] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">今日摘要</div>

        <SectionStack tight>
          <DailyChallengeSummary
            :totalGames="trainingPlan.totalGames"
            :estimatedMinutes="estimatedMinutes"
            :coveredCount="coveredDimensions.size"
            :completedGames="trainingPlan.completedGames"
            :todayProgress="todayProgress"
            :isCompleted="isCompleted"
            :canContinue="canContinue"
            :isStarting="isStarting"
            :status="trainingPlan.status"
            :isRegenerating="isLoading"
            :onStart="startTraining"
            :onRegenerate="regeneratePlan"
          />

          <DailyChallengeFocus
            :allDimensions="allDimensions"
            :coveredDimensions="coveredDimensions"
            :dimensionIcons="dimensionIcons"
            :dimensionNames="dimensionNames"
            :dimensionColors="dimensionColors"
          />

          <DailyChallengeList
            :games="trainingPlan.games"
            :completedGames="trainingPlan.completedGames"
            :isCompleted="isCompleted"
            :dimensionColors="dimensionColors"
            :dimensionNames="dimensionNames"
            :resolveGameIcon="resolveGameIcon"
            :getDifficultyClass="getDifficultyClass"
            :getDifficultyText="getDifficultyText"
            :onStartGame="startGame"
          />

          <DailyChallengeDisclaimer />
        </SectionStack>
      </template>

      <DailyChallengeEmptyState v-else :onReload="loadTrainingPlan" />
    </SectionStack>
  </PageShell>
</template>

