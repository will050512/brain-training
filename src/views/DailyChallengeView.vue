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
const isCompleted = computed(() => {
  return trainingPlan.value?.status === 'completed'
})

// 是否可以繼續（有未完成的遊戲）
const canContinue = computed(() => {
  return trainingPlan.value?.canContinue || 
         (trainingPlan.value && trainingPlan.value.completedGames < trainingPlan.value.totalGames)
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
  <div class="app-page page-ambient">
    <main class="app-content-scroll bg-[var(--color-bg-soft)]">
      <div class="container-desktop p-3 pb-24 max-w-lg mx-auto">
        <!-- 載入中 -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-primary)] border-t-transparent"></div>
          <p class="text-[var(--color-text-secondary)] font-medium">正在為您準備專屬訓練...</p>
        </div>

        <template v-else-if="trainingPlan">
          <div class="section-label px-1 py-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">今日摘要</div>
          
          <div class="space-y-3">
            <!-- 訓練摘要 (卡片) -->
            <section class="card p-3 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg-soft)] border border-[var(--color-border-light)] shadow-sm">
              <h2 class="sr-only">訓練摘要</h2>

              <div class="flex justify-around items-center mb-3">
                <div class="flex flex-col items-center">
                  <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ trainingPlan.totalGames }}</span>
                  <span class="text-xs font-medium text-[var(--color-text-secondary)] mt-0.5">個遊戲</span>
                </div>
                <div class="w-px h-8 bg-[var(--color-border)]/60"></div>
                <div class="flex flex-col items-center">
                  <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ estimatedMinutes }}</span>
                  <span class="text-xs font-medium text-[var(--color-text-secondary)] mt-0.5">分鐘</span>
                </div>
                <div class="w-px h-8 bg-[var(--color-border)]/60"></div>
                <div class="flex flex-col items-center">
                  <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ coveredDimensions.size }}</span>
                  <span class="text-xs font-medium text-[var(--color-text-secondary)] mt-0.5">項能力</span>
                </div>
              </div>

              <div v-if="trainingPlan.completedGames > 0" class="bg-[var(--color-surface)]/60 rounded-xl p-2.5 mb-3 backdrop-blur-sm border border-[var(--color-border)]/40 shadow-inner">
                <div class="flex justify-between mb-1 font-semibold text-xs">
                  <span class="text-[var(--color-text-secondary)]">今日進度</span>
                  <span class="text-[var(--color-primary)]">{{ Math.round(todayProgress) }}%</span>
                </div>
                <div class="h-2.5 bg-[var(--color-border)]/40 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-[var(--color-accent-warm)] to-[var(--color-warning)] rounded-full transition-all duration-700 ease-out"
                    :style="{ width: `${todayProgress}%` }"
                  ></div>
                </div>
                <div class="text-center text-[10px] text-[var(--color-text-muted)] mt-1.5">
                  已完成 {{ trainingPlan.completedGames }} / {{ trainingPlan.totalGames }}
                </div>
              </div>

              <button
                class="btn btn-primary btn-lg w-full justify-center shadow-md hover:shadow-lg transform transition-all active:scale-95 touch-manipulation"
                :class="{ 'opacity-90 saturate-50': isCompleted }"
                :disabled="isStarting"
                @click="startTraining"
              >
                <span v-if="isStarting" class="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-text-inverse)] border-t-transparent mr-2"></span>
                <template v-else-if="isCompleted">
                  <span class="text-xl mr-2 filter drop-shadow-sm">🎉</span> 
                  <div class="flex flex-col items-start leading-tight">
                    <span class="font-bold text-sm">今日已完成！</span>
                    <span class="text-[10px] font-normal opacity-90">點擊再次挑戰</span>
                  </div>
                </template>
                <template v-else-if="canContinue">
                  <span class="text-lg mr-2">▶️</span> 繼續訓練
                </template>
                <template v-else>
                  <span class="text-lg mr-2">🚀</span> 開始今日訓練
                </template>
              </button>

              <div v-if="trainingPlan.status === 'not-started'" class="mt-3 text-center">
                <button class="btn btn-ghost btn-sm py-1 h-auto text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors text-xs" @click="regeneratePlan" :disabled="isLoading">
                  🔄 重新生成訓練內容
                </button>
              </div>
            </section>

            <!-- 今日訓練重點 / 維度 -->
            <section class="space-y-2">
              <h2 class="text-base font-bold text-[var(--color-text)] pl-3 border-l-4 border-[var(--color-primary)] flex items-center">今日訓練重點</h2>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div
                  v-for="dim in allDimensions"
                  :key="dim"
                  class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 relative border border-transparent aspect-square sm:aspect-auto h-20 sm:h-auto"
                  :class="coveredDimensions.has(dim) ? 'bg-[var(--color-surface)] shadow-sm border-[var(--color-border-light)] opacity-100 transform hover:-translate-y-1' : 'opacity-40 grayscale bg-[var(--color-bg-muted)]'"
                  :style="{ color: coveredDimensions.has(dim) ? dimensionColors[dim] : undefined }"
                >
                  <span class="text-2xl mb-1 filter drop-shadow-sm">{{ dimensionIcons[dim] }}</span>
                  <span class="text-[10px] font-bold text-[var(--color-text-secondary)] mt-0.5">{{ dimensionNames[dim] }}</span>
                  <div v-if="coveredDimensions.has(dim)" class="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-success)] text-[var(--color-text-inverse)] rounded-full flex items-center justify-center shadow-sm border-2 border-[var(--color-surface)] animate-fade-in">
                    <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="4">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            <!-- 訓練清單 -->
            <section class="space-y-2">
              <h2 class="text-base font-bold text-[var(--color-text)] pl-3 border-l-4 border-[var(--color-primary)] flex items-center">訓練清單</h2>
              <div class="space-y-2">
                <div
                  v-for="(game, index) in trainingPlan.games"
                  :key="game.gameId"
                  class="card card-clickable flex items-center justify-between p-3 transition-all duration-200 group border-[var(--color-border-light)]"
                  :class="[
                    game.isCompleted ? 'opacity-70 bg-[var(--color-bg-soft)] grayscale-[0.3]' : 'bg-[var(--color-surface)]',
                    !game.isCompleted && !isCompleted && index === trainingPlan.completedGames ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-bg)] shadow-md transform -translate-y-0.5 z-10' : 'hover:border-[var(--color-primary)]/30'
                  ]"
                  @click="startGame(game)"
                >
                  <div class="flex items-center flex-1 gap-3">
                    <div 
                      class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors"
                      :class="!game.isCompleted && !isCompleted && index === trainingPlan.completedGames ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'"
                    >
                      {{ index + 1 }}
                    </div>
                    
                    <div class="shrink-0">
                      <template v-if="resolveGameIcon(game.gameId)?.path">
                        <div class="w-10 h-10">
                          <img
                            :src="resolveGameIcon(game.gameId)?.path"
                            :alt="game.game.name"
                            class="w-full h-full object-contain drop-shadow-sm transition-transform group-hover:scale-110"
                          />
                        </div>
                      </template>
                      <template v-else>
                        <div class="emoji-tile w-10 h-10 text-2xl bg-[var(--color-bg-muted)]/50 group-hover:bg-[var(--color-bg-muted)] transition-colors">
                          <span class="transition-transform group-hover:scale-110 inline-block">
                            {{ resolveGameIcon(game.gameId)?.emoji || game.game.icon }}
                          </span>
                        </div>
                      </template>
                    </div>

                    <div class="flex flex-col min-w-0">
                      <div class="font-bold text-base text-[var(--color-text)] truncate mb-0.5 group-hover:text-[var(--color-primary)] transition-colors">{{ game.game.name }}</div>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span
                          class="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                          :class="getDifficultyClass(game.difficulty)"
                        >
                          {{ getDifficultyText(game.difficulty) }}
                        </span>
                        <div class="flex gap-0.5 ml-0.5">
                          <span
                            v-for="dim in game.targetDimensions"
                            :key="dim"
                            class="w-1.5 h-1.5 rounded-full"
                            :style="{ backgroundColor: dimensionColors[dim] }"
                            :title="dimensionNames[dim]"
                          ></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex-shrink-0 ml-2">
                    <div v-if="game.isCompleted" class="w-6 h-6 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)] border border-[var(--color-success)]/20">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div v-else class="w-6 h-6 rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div class="bg-[var(--color-disclaimer)] border border-[var(--color-disclaimer-border)]/50 rounded-lg p-3 text-center mt-6 shadow-sm">
              <p class="text-xs text-[var(--color-disclaimer-text)] font-medium m-0 flex items-center justify-center gap-1.5">
                <span class="text-base">💡</span>
                <span>每天只需 15 分鐘，持續訓練大腦更健康！</span>
              </p>
            </div>
          </div>
        </template>

        <!-- 無計畫 -->
        <div v-else class="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center px-6">
          <div class="text-6xl mb-4 animate-bounce">📋</div>
          <div>
            <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">暫無訓練計畫</h3>
            <p class="text-[var(--color-text-secondary)]">無法生成訓練計畫，請檢查網路連線</p>
          </div>
          <button class="btn btn-primary shadow-lg" @click="loadTrainingPlan">
            重新載入
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
