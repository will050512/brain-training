<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    <!-- 遊戲頭部 -->
    <div class="bg-[var(--color-surface)] shadow-sm py-4 px-6 border-b border-[var(--color-border)]">
      <div class="container mx-auto flex items-center justify-between">
        <button @click="handleBack" class="btn btn-secondary">
          ← 返回
        </button>
        
        <div class="text-center">
          <h1 class="text-xl font-bold text-[var(--color-text)]">{{ currentGame?.name || '遊戲' }}</h1>
          <span 
            class="difficulty-badge"
            :class="`difficulty-${gameStore.currentDifficulty}`"
          >
            {{ DIFFICULTIES[gameStore.currentDifficulty].name }}
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- 分數顯示 -->
          <div class="text-right">
            <div class="text-sm text-[var(--color-text-secondary)]">分數</div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ currentScore }}</div>
          </div>
          
          <!-- 計時器 -->
          <div class="text-right">
            <div class="text-sm text-[var(--color-text-secondary)]">時間</div>
            <div class="text-2xl font-bold text-[var(--color-text)]">{{ formatTime(elapsedTime) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 遊戲區域 -->
    <div class="container mx-auto py-8 px-4">
      <!-- 遊戲準備畫面 -->
      <div v-if="gameState === 'ready'" class="max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-lg">
          <div class="text-6xl mb-6">{{ currentGame?.icon }}</div>
          <h2 class="text-xl font-bold mb-4 text-[var(--color-text)]">{{ currentGame?.name }}</h2>
          
          <div class="text-left mb-6">
            <h3 class="font-semibold mb-2 text-[var(--color-text)]">遊戲說明</h3>
            <ul class="list-disc list-inside text-[var(--color-text-secondary)] space-y-1">
              <li v-for="(instruction, index) in currentGame?.instructions" :key="index">
                {{ instruction }}
              </li>
            </ul>
          </div>
          
          <button @click="startGame" class="btn btn-primary btn-xl w-full">
            開始遊戲 →
          </button>
        </div>
      </div>

      <!-- 遊戲進行中 -->
      <div v-else-if="gameState === 'playing'" class="game-container">
        <component
          :is="gameComponent"
          :difficulty="gameStore.currentDifficulty"
          :settings="difficultySettings"
          @score-change="handleScoreChange"
          @game-end="handleGameEnd"
        />
      </div>

      <!-- 遊戲暫停 -->
      <div v-else-if="gameState === 'paused'" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-[var(--color-surface)] rounded-2xl p-8 max-w-sm w-full mx-4 border border-[var(--color-border)] text-center">
          <div class="text-5xl mb-4">⏸️</div>
          <h2 class="text-xl font-bold mb-6 text-[var(--color-text)]">遊戲暫停</h2>
          <div class="flex gap-3">
            <button @click="resumeGame" class="btn btn-primary btn-lg flex-1">
              繼續遊戲
            </button>
            <button @click="quitGame" class="btn btn-danger btn-lg flex-1">
              結束遊戲
            </button>
          </div>
        </div>
      </div>

      <!-- 遊戲結束 -->
      <div v-else-if="gameState === 'finished'" class="max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-lg">
          <div class="text-6xl mb-4">
            {{ getFinalEmoji(currentScore) }}
          </div>
          <h2 class="text-xl font-bold mb-2 text-[var(--color-text)]">遊戲結束！</h2>
          
          <!-- 分數展示 -->
          <div class="my-8">
            <div class="text-6xl font-bold" :class="getScoreClass(currentScore)">
              {{ currentScore }}
            </div>
            <div class="text-xl text-[var(--color-text-secondary)]">分</div>
          </div>
          
          <!-- 詳細數據 -->
          <div class="grid grid-cols-2 gap-4 mb-8 text-left">
            <div class="bg-[var(--color-surface-alt)] p-4 rounded-lg">
              <div class="text-sm text-[var(--color-text-secondary)]">正確率</div>
              <div class="text-xl font-bold text-[var(--color-text)]">{{ Math.round((gameResult?.accuracy || 0) * 100) }}%</div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-4 rounded-lg">
              <div class="text-sm text-[var(--color-text-secondary)]">遊戲時長</div>
              <div class="text-xl font-bold text-[var(--color-text)]">{{ formatTime(gameResult?.duration || 0) }}</div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-4 rounded-lg">
              <div class="text-sm text-[var(--color-text-secondary)]">答對題數</div>
              <div class="text-xl font-bold text-[var(--color-text)]">
                {{ gameResult?.correctCount || 0 }} / {{ gameResult?.totalCount || 0 }}
              </div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-4 rounded-lg">
              <div class="text-sm text-[var(--color-text-secondary)]">平均反應</div>
              <div class="text-xl font-bold text-[var(--color-text)]">{{ gameResult?.avgReactionTime || 0 }}ms</div>
            </div>
          </div>
          
          <!-- 與最佳成績比較 -->
          <div v-if="bestScore > 0" class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <div class="flex justify-between items-center">
              <span class="text-[var(--color-text)]">最佳成績</span>
              <span class="font-bold text-blue-600 dark:text-blue-400">{{ bestScore }} 分</span>
            </div>
            <div v-if="currentScore > bestScore" class="text-green-600 dark:text-green-400 font-bold mt-2">
              🎉 新紀錄！
            </div>
          </div>
          
          <!-- 難度調整反饋 -->
          <div 
            v-if="difficultyAdjustment"
            class="mb-6 p-4 rounded-xl border-2 transition-all duration-300"
            :class="[difficultyFeedbackStyle.bgClass, difficultyFeedbackStyle.borderClass]"
          >
            <div class="flex items-start gap-3">
              <!-- 圖示 -->
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                :class="difficultyFeedbackStyle.iconBgClass"
              >
                {{ difficultyFeedbackStyle.icon }}
              </div>
              
              <!-- 內容 -->
              <div class="flex-1 text-left">
                <h4 
                  class="font-bold text-base mb-1"
                  :class="difficultyFeedbackStyle.textClass"
                >
                  難度調整通知
                </h4>
                
                <p 
                  class="text-sm mb-2"
                  :class="difficultyFeedbackStyle.subTextClass"
                >
                  {{ difficultyReasonText }}
                </p>
                
                <!-- 難度變化詳情 -->
                <div 
                  class="text-sm p-2 rounded-lg bg-white/60 dark:bg-black/20"
                  :class="difficultyFeedbackStyle.subTextClass"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-medium">
                      {{ getFullDifficultyLabel(difficultyAdjustment.currentDifficulty, difficultyAdjustment.currentSubDifficulty) }}
                    </span>
                    <span>→</span>
                    <span class="font-bold">
                      {{ getFullDifficultyLabel(difficultyAdjustment.newDifficulty, difficultyAdjustment.newSubDifficulty) }}
                    </span>
                  </div>
                </div>
                
                <!-- 調整訊息 -->
                <p 
                  class="text-xs mt-2 italic"
                  :class="difficultyFeedbackStyle.subTextClass"
                >
                  {{ difficultyAdjustment.message }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- 按鈕 -->
          <div class="flex gap-3">
            <button @click="playAgain" class="btn btn-primary btn-lg flex-1">
              再玩一次
            </button>
            <router-link to="/games" class="btn btn-secondary btn-lg flex-1">
              選擇其他遊戲
            </router-link>
          </div>
          
          <router-link to="/report" class="btn btn-secondary w-full mt-4">
            📊 查看報告
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore, useUserStore } from '@/stores'
import { DIFFICULTIES, type GameResult, type GameState } from '@/types/game'
import { calculateDifficultyAdjustment, applyDifficultyAdjustment, getFullDifficultyLabel, type DifficultyAdjustment } from '@/services/adaptiveDifficultyService'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()

// 遊戲狀態
const gameState = ref<GameState>('ready')
const currentScore = ref(0)
const elapsedTime = ref(0)
const gameResult = ref<GameResult | null>(null)
const difficultyAdjustment = ref<DifficultyAdjustment | null>(null)
let timerInterval: ReturnType<typeof setInterval> | null = null

// 取得遊戲 ID
const gameId = computed(() => route.params.gameId as string)

// 當前遊戲
const currentGame = computed(() => gameStore.currentGame)

// 難度設定
const difficultySettings = computed(() => 
  gameStore.getDifficultySettings(gameId.value, gameStore.currentDifficulty)
)

// 最佳成績
const bestScore = computed(() => 
  gameStore.getBestScore(gameId.value, gameStore.currentDifficulty)
)

// 難度調整反饋樣式
const difficultyFeedbackStyle = computed(() => {
  if (!difficultyAdjustment.value) return {}
  
  if (difficultyAdjustment.value.reason === 'accuracy-high') {
    return {
      bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderClass: 'border-green-300',
      iconBgClass: 'bg-green-100',
      textClass: 'text-green-800',
      subTextClass: 'text-green-600',
      icon: '⬆️'
    }
  } else if (difficultyAdjustment.value.reason === 'accuracy-low') {
    return {
      bgClass: 'bg-gradient-to-r from-orange-50 to-amber-50',
      borderClass: 'border-orange-300',
      iconBgClass: 'bg-orange-100',
      textClass: 'text-orange-800',
      subTextClass: 'text-orange-600',
      icon: '⬇️'
    }
  } else {
    return {
      bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderClass: 'border-blue-300',
      iconBgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
      subTextClass: 'text-blue-600',
      icon: '➡️'
    }
  }
})

// 取得難度調整原因說明
const difficultyReasonText = computed(() => {
  if (!difficultyAdjustment.value) return ''
  
  switch (difficultyAdjustment.value.reason) {
    case 'accuracy-high':
      return '連續表現優異，難度自動提升'
    case 'accuracy-low':
      return '難度已調整，循序漸進更有效'
    case 'stable':
      return '表現穩定，繼續加油'
    default:
      return ''
  }
})

// 動態載入遊戲元件
const gameComponent = computed(() => {
  if (!gameId.value) return null
  
  // 根據遊戲 ID 載入對應元件
  const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    'whack-a-mole': defineAsyncComponent(() => import('@/components/games/WhackAMole.vue')),
    'balance-scale': defineAsyncComponent(() => import('@/components/games/BalanceScale.vue')),
    'card-match': defineAsyncComponent(() => import('@/components/games/CardMatch.vue')),
    'stroop-test': defineAsyncComponent(() => import('@/components/games/StroopTest.vue')),
    'maze-navigation': defineAsyncComponent(() => import('@/components/games/MazeNavigation.vue')),
    'spot-difference': defineAsyncComponent(() => import('@/components/games/SpotDifference.vue')),
  }
  
  return componentMap[gameId.value] || null
})

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 取得分數顏色
function getScoreClass(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

// 取得結束表情
function getFinalEmoji(score: number): string {
  if (score >= 90) return '🎉'
  if (score >= 70) return '😊'
  if (score >= 50) return '👍'
  return '💪'
}

// 開始遊戲
function startGame(): void {
  gameState.value = 'playing'
  currentScore.value = 0
  elapsedTime.value = 0
  
  // 開始計時
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

// 暫停遊戲
function pauseGame(): void {
  gameState.value = 'paused'
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// 繼續遊戲
function resumeGame(): void {
  gameState.value = 'playing'
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

// 結束遊戲
function quitGame(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  router.push('/games')
}

// 處理分數變化
function handleScoreChange(score: number): void {
  currentScore.value = score
}

// 處理遊戲結束
async function handleGameEnd(result: GameResult): Promise<void> {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  gameResult.value = result
  currentScore.value = result.score
  gameState.value = 'finished'
  
  // 記錄遊戲結果
  await gameStore.recordGameResult(result)
  
  // 計算難度調整
  try {
    const odId = userStore.currentUser?.id || ''
    if (odId && gameId.value) {
      const adjustment = await calculateDifficultyAdjustment(
        odId,
        gameId.value,
        result
      )
      difficultyAdjustment.value = adjustment
      
      // 如果需要調整，套用調整
      if (adjustment.shouldAdjust) {
        await applyDifficultyAdjustment(odId, gameId.value, adjustment, result.accuracy)
      }
    }
  } catch (error) {
    console.error('計算難度調整失敗:', error)
  }
}

// 再玩一次
function playAgain(): void {
  gameState.value = 'ready'
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  difficultyAdjustment.value = null
}

// 處理返回
function handleBack(): void {
  if (gameState.value === 'playing') {
    pauseGame()
  } else {
    router.push('/games')
  }
}

// 監聽路由變化，選擇遊戲
watch(gameId, (newId) => {
  if (newId && !gameStore.currentGame) {
    gameStore.selectGame(newId)
  }
}, { immediate: true })

// 組件卸載時清理
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

// 初始化
onMounted(() => {
  if (gameId.value) {
    gameStore.selectGame(gameId.value)
  }
})
</script>
