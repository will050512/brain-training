<template>
  <div class="game-wrapper min-h-screen bg-[var(--color-bg)]">
    <!-- 遊戲頭部 - 響應式 -->
    <div 
      class="game-header bg-[var(--color-surface)] shadow-sm border-b border-[var(--color-border)]"
      :class="{ 'game-header-compact': isMobile, 'game-header-landscape': isLandscape }"
    >
      <div class="container mx-auto flex items-center justify-between px-4 py-3 lg:py-4">
        <button @click="handleBack" class="btn btn-secondary btn-sm lg:btn-md">
          ← <span class="hidden sm:inline">返回</span>
        </button>
        
        <div class="text-center flex-1 mx-2">
          <h1 class="text-base lg:text-xl font-bold text-[var(--color-text)] truncate">
            {{ currentGame?.name || '遊戲' }}
          </h1>
          <span 
            class="difficulty-badge text-xs"
            :class="`difficulty-${gameStore.currentDifficulty}`"
          >
            {{ DIFFICULTIES[gameStore.currentDifficulty].name }}
          </span>
        </div>
        
        <div class="flex items-center gap-2 lg:gap-4">
          <!-- 分數顯示 -->
          <div class="text-right game-stats-landscape">
            <div class="text-xs lg:text-sm text-[var(--color-text-secondary)] hide-landscape">分數</div>
            <div class="text-lg lg:text-2xl font-bold text-blue-600 dark:text-blue-400 stat-value">{{ currentScore }}</div>
          </div>
          
          <!-- 計時器 -->
          <div class="text-right game-stats-landscape">
            <div class="text-xs lg:text-sm text-[var(--color-text-secondary)] hide-landscape">時間</div>
            <div class="text-lg lg:text-2xl font-bold text-[var(--color-text)] stat-value">{{ formatTime(elapsedTime) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 遊戲區域 - 響應式 -->
    <div class="game-play-area container mx-auto py-4 lg:py-8 px-3 lg:px-4">
      <!-- 遊戲準備畫面 - 簡化版（從 GamePreviewView 進入會自動跳過） -->
      <div v-if="gameState === 'ready'" class="max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-lg">
          <div class="text-6xl mb-4">{{ currentGame?.icon }}</div>
          <h2 class="text-xl font-bold mb-4 text-[var(--color-text)]">{{ currentGame?.name }}</h2>
          
          <p class="text-[var(--color-text-secondary)] mb-6">
            準備好了嗎？點擊下方按鈕開始遊戲！
          </p>
          
          <button @click="startGame" class="btn btn-primary btn-xl w-full">
            開始遊戲 🎮
          </button>
          
          <button @click="goBack" class="btn btn-secondary w-full mt-3">
            ← 返回選擇難度
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
          <!-- 每日訓練模式 -->
          <template v-if="isFromDailyTraining">
            <div class="flex gap-3 mb-4">
              <button @click="playAgain" class="btn btn-secondary btn-lg flex-1">
                🔄 再玩一次
              </button>
              <button 
                v-if="gameStore.getNextTrainingGame()"
                @click="continueToNextGame" 
                class="btn btn-primary btn-lg flex-1"
              >
                ➡️ 下一個遊戲
              </button>
              <router-link 
                v-else
                to="/report" 
                class="btn btn-primary btn-lg flex-1"
              >
                📊 查看報告
              </router-link>
            </div>
            
            <!-- 訓練進度 -->
            <div class="text-sm text-[var(--color-text-secondary)] mb-4">
              訓練進度：{{ gameStore.currentTrainingIndex + 1 }} / {{ gameStore.dailyTrainingQueue.length }}
            </div>
          </template>
          
          <!-- 普通遊戲模式 - 2x2 推薦網格 -->
          <template v-else>
            <button @click="playAgain" class="btn btn-primary btn-lg w-full mb-4">
              🔄 再玩一次
            </button>
            
            <!-- 推薦其他遊戲 -->
            <div v-if="recommendedGames.length > 0" class="mt-6">
              <h3 class="text-sm font-medium text-[var(--color-text-secondary)] mb-3 text-left">
                🎯 試試其他維度的訓練
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="game in recommendedGames"
                  :key="game.id"
                  @click="startRecommendedGame(game)"
                  class="recommended-game-card"
                >
                  <span class="text-2xl mb-1">{{ game.icon }}</span>
                  <span class="text-sm font-medium text-[var(--color-text)] truncate w-full">
                    {{ game.name }}
                  </span>
                  <span class="text-xs text-[var(--color-text-muted)]">
                    {{ game.primaryDimension }}
                  </span>
                </button>
              </div>
            </div>
            
            <router-link to="/games" class="btn btn-secondary w-full mt-4">
              🎮 更多遊戲
            </router-link>
          </template>
          
          <router-link to="/report" class="btn btn-ghost w-full mt-2 text-sm">
            📊 查看報告
          </router-link>
        </div>
      </div>
    </div>
    
    <!-- 完成慶祝動畫 -->
    <TrainingCompleteModal
      v-if="showCompletionModal"
      :summary="gameStore.getTodayTrainingSummary()"
      @close="handleCompletionClose"
      @skip="handleCompletionClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore, useUserStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import { DIFFICULTIES, type GameResult, type GameState, type GameDefinition } from '@/types/game'
import { calculateDifficultyAdjustment, applyDifficultyAdjustment, getFullDifficultyLabel, type DifficultyAdjustment } from '@/services/adaptiveDifficultyService'
import TrainingCompleteModal from '@/components/ui/TrainingCompleteModal.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()
const { isMobile } = useResponsive()

// 檢測橫屏
const isLandscape = ref(false)

function checkOrientation() {
  isLandscape.value = window.innerHeight < 500 && window.innerWidth > window.innerHeight
}

// 遊戲狀態
const gameState = ref<GameState>('ready')
const currentScore = ref(0)
const elapsedTime = ref(0)
const gameResult = ref<GameResult | null>(null)
const difficultyAdjustment = ref<DifficultyAdjustment | null>(null)
let timerInterval: ReturnType<typeof setInterval> | null = null

// 每日訓練相關
const showCompletionModal = ref(false)
const recommendedGames = ref<GameDefinition[]>([])

// 判斷是否從每日訓練進入
const isFromDailyTraining = computed(() => {
  return route.query.fromDaily === 'true' || gameStore.isFromDailyTraining
})

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
  
  // 根據遊戲 ID 載入對應元件 - 完整 15 款遊戲
  const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    // 注意力訓練
    'whack-a-mole': defineAsyncComponent(() => import('@/components/games/WhackAMole.vue')),
    'spot-difference': defineAsyncComponent(() => import('@/components/games/SpotDifference.vue')),
    'number-connect': defineAsyncComponent(() => import('@/components/games/NumberConnect.vue')),
    // 記憶力訓練
    'card-match': defineAsyncComponent(() => import('@/components/games/CardMatch.vue')),
    'instant-memory': defineAsyncComponent(() => import('@/components/games/InstantMemory.vue')),
    'poker-memory': defineAsyncComponent(() => import('@/components/games/PokerMemory.vue')),
    'audio-memory': defineAsyncComponent(() => import('@/components/games/AudioMemory.vue')),
    'gesture-memory': defineAsyncComponent(() => import('@/components/games/GestureMemory.vue')),
    // 執行功能訓練
    'balance-scale': defineAsyncComponent(() => import('@/components/games/BalanceScale.vue')),
    'maze-navigation': defineAsyncComponent(() => import('@/components/games/MazeNavigation.vue')),
    'math-calc': defineAsyncComponent(() => import('@/components/games/MathCalc.vue')),
    // 視覺空間訓練
    'clock-drawing': defineAsyncComponent(() => import('@/components/games/ClockDrawingTest.vue')),
    'pattern-reasoning': defineAsyncComponent(() => import('@/components/games/PatternReasoning.vue')),
    // 反應能力訓練
    'rock-paper-scissors': defineAsyncComponent(() => import('@/components/games/RockPaperScissors.vue')),
    'rhythm-mimic': defineAsyncComponent(() => import('@/components/games/RhythmMimic.vue')),
    // 其他測試
    'stroop-test': defineAsyncComponent(() => import('@/components/games/StroopTest.vue')),
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
  
  // 如果是每日訓練，標記完成並更新狀態
  if (isFromDailyTraining.value) {
    gameStore.completeCurrentTrainingGame(result.score, result.duration)
    
    // 檢查是否完成所有訓練
    if (gameStore.isAllTrainingCompleted()) {
      // 顯示慶祝動畫
      showCompletionModal.value = true
    }
  } else {
    // 從普通遊戲選擇進入，載入推薦遊戲
    recommendedGames.value = gameStore.getUnplayedGamesByOtherDimensions(gameId.value, 4)
  }
  
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
  recommendedGames.value = []
}

// 繼續下一個訓練遊戲
function continueToNextGame(): void {
  const nextGame = gameStore.getNextTrainingGame()
  if (nextGame) {
    gameStore.moveToNextTrainingGame()
    gameStore.selectGame(nextGame.gameId)
    gameStore.selectDifficulty(nextGame.difficulty)
    router.push(`/games/${nextGame.gameId}?autoStart=true&fromDaily=true`)
  }
}

// 開始推薦遊戲
function startRecommendedGame(game: GameDefinition): void {
  gameStore.selectGame(game.id)
  gameStore.selectDifficulty('easy')
  router.push(`/games/${game.id}/preview`)
}

// 關閉完成動畫
function handleCompletionClose(): void {
  showCompletionModal.value = false
  gameStore.clearDailyTraining()
}

// 處理返回
function handleBack(): void {
  if (gameState.value === 'playing') {
    pauseGame()
  } else {
    router.push('/games')
  }
}

// 返回選擇難度頁面
function goBack(): void {
  if (gameId.value) {
    router.push(`/games/preview/${gameId.value}`)
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
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})

// 初始化
onMounted(() => {
  if (gameId.value) {
    gameStore.selectGame(gameId.value)
  }
  // 初始化橫屏檢測
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
  
  // 檢查是否從 GamePreviewView 進入 - 若是則自動開始遊戲
  const autoStart = route.query.autoStart === 'true'
  if (autoStart && gameStore.currentGame) {
    // 短暫延遲讓畫面載入完成後再開始
    setTimeout(() => {
      startGame()
    }, 100)
  }
})
</script>

<style scoped>
/* 推薦遊戲卡片 - 2x2 網格 */
.recommended-game-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 100px;
}

.recommended-game-card:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.recommended-game-card:hover .text-\[var\(--color-text\)\] {
  color: white;
}

.recommended-game-card:hover .text-\[var\(--color-text-muted\)\] {
  color: rgba(255, 255, 255, 0.8);
}

.recommended-game-card:active {
  transform: translateY(0);
}

/* 響應式調整 */
@media (max-width: 400px) {
  .recommended-game-card {
    padding: 0.75rem;
    min-height: 80px;
  }
  
  .recommended-game-card span:first-child {
    font-size: 1.5rem;
  }
}
</style>
