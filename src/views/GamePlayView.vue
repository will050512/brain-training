<template>
  <div class="game-wrapper min-h-screen bg-[var(--color-bg)] flex flex-col">
    <div
      class="game-header bg-[var(--color-surface)] shadow-sm border-b border-[var(--color-border)] z-10 sticky top-0"
      :class="{ 'game-header-compact': isMobile, 'game-header-landscape': isLandscape }"
    >
      <div class="container mx-auto flex items-center justify-between px-2 sm:px-4 py-2 h-14 sm:h-16 gap-2">
        <button @click="handleBack" class="btn btn-secondary btn-sm flex-shrink-0 !px-2 sm:!px-4 h-9 sm:h-10 flex items-center justify-center">
          <span class="text-lg leading-none">←</span>
          <span class="hidden sm:inline ml-1">返回</span>
        </button>

        <!-- 手機版：遊戲進行時顯示簡化標題 -->
        <div class="flex-1 min-w-0 mx-1 sm:mx-2 flex flex-col justify-center items-center" :class="{ 'opacity-50': isMobile && gameState === 'playing' }">
          <h1 class="text-sm sm:text-base lg:text-xl font-bold text-[var(--color-text)] truncate w-full text-center">
            {{ currentGame?.name || '遊戲' }}
          </h1>
          <span
            v-if="!isMobile || gameState !== 'playing'"
            class="difficulty-badge text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5"
            :class="`difficulty-${gameStore.currentDifficulty}`"
          >
            {{ DIFFICULTIES[gameStore.currentDifficulty].name }}
          </span>
        </div>

        <!-- 桌面版狀態顯示 -->
        <div class="hidden sm:flex items-center gap-1.5 sm:gap-4 flex-shrink-0 ml-auto bg-[var(--color-surface)]">
          <div
            v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">進度</div>
            <div class="status-value text-sm sm:text-lg font-bold text-purple-600 dark:text-purple-400 leading-none">
              {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
            </div>
          </div>

          <div
            v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">對/錯</div>
            <div class="status-value text-sm sm:text-lg font-bold leading-none whitespace-nowrap">
              <span class="text-green-600 dark:text-green-400">{{ gameStatus.correctCount || 0 }}</span>
              <span class="text-[var(--color-text-muted)] mx-0.5">/</span>
              <span class="text-red-500 dark:text-red-400">{{ gameStatus.wrongCount || 0 }}</span>
            </div>
          </div>

          <div
            v-if="gameStatus.showCombo && gameStatus.combo && gameStatus.combo > 1"
            class="status-item text-right flex flex-col items-end"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">連擊</div>
            <div class="status-value text-sm sm:text-lg font-bold text-orange-500 dark:text-orange-400 leading-none animate-bounce">
              🔥{{ gameStatus.combo }}
            </div>
          </div>

          <div
            v-if="gameStatus.showScore !== false"
            class="status-item text-right flex flex-col items-end min-w-[2.5rem] sm:min-w-auto"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">分數</div>
            <div class="status-value text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">
              {{ gameStatus.score ?? currentScore }}
            </div>
          </div>

          <div
            v-if="gameStatus.showTimer !== false"
            class="status-item text-right flex flex-col items-end min-w-[3.2rem] sm:min-w-[4rem]"
          >
            <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">
              {{ gameStatus.timeLeft !== undefined ? '剩餘' : '用時' }}
            </div>
            <div
              class="status-value text-sm sm:text-lg font-bold leading-none tabular-nums"
              :class="{
                'text-red-500 dark:text-red-400 animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10,
                'text-[var(--color-text)]': gameStatus.timeLeft === undefined || gameStatus.timeLeft > 10
              }"
            >
              {{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版浮動狀態欄 - 始終顯示關鍵狀態 -->
    <div
      v-if="isMobile && gameState === 'playing'"
      class="fixed top-14 left-0 right-0 z-20 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-2 py-1"
    >
      <div class="flex items-center justify-between gap-2 text-xs">
        <!-- 左側：時間和分數 -->
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div
            v-if="gameStatus.showTimer !== false"
            class="flex items-center gap-1 text-red-500 dark:text-red-400 font-bold"
            :class="{ 'animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10 }"
          >
            <span>⏱️</span>
            <span class="tabular-nums">{{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}</span>
          </div>
          <div
            v-if="gameStatus.showScore !== false"
            class="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold"
          >
            <span>🎯</span>
            <span>{{ gameStatus.score ?? currentScore }}</span>
          </div>
        </div>

        <!-- 右側：進度和對錯 -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <div
            v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
            class="text-purple-600 dark:text-purple-400 font-bold"
          >
            {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
          </div>
          <div
            v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
            class="flex items-center gap-1"
          >
            <span class="text-green-600 dark:text-green-400 font-bold">{{ gameStatus.correctCount || 0 }}</span>
            <span class="text-[var(--color-text-muted)]">/</span>
            <span class="text-red-500 dark:text-red-400 font-bold">{{ gameStatus.wrongCount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="game-play-area flex-1 container mx-auto w-full">
      <!-- 準備畫面 - 適應螢幕高度 -->
      <div v-if="gameState === 'ready'" class="game-content-fit max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-lg">
          <div class="text-4xl sm:text-5xl lg:text-6xl mb-4 transform hover:scale-110 transition-transform">{{ currentGame?.icon }}</div>
          <h2 class="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-[var(--color-text)]">{{ currentGame?.name }}</h2>

          <p class="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4 sm:mb-6">
            準備好了嗎？點擊下方按鈕開始遊戲！
          </p>

          <div class="space-y-3">
            <button @click="startGame" class="btn btn-primary btn-xl w-full text-base sm:text-lg shadow-md active:scale-95 transition-transform">
              開始遊戲 🎮
            </button>
            <button @click="goBack" class="btn btn-secondary w-full">
              ← 返回選擇難度
            </button>
          </div>
        </div>
      </div>

      <!-- 遊戲進行中 - 填滿可用空間 -->
      <div v-else-if="gameState === 'playing'" class="game-content-full w-full">
        <component
          :is="gameComponent"
          :difficulty="gameStore.currentDifficulty"
          :settings="difficultySettings"
          @score-change="handleScoreChange"
          @game-end="handleGameEnd"
          @status-update="handleStatusUpdate"
          class="w-full h-full"
        />
      </div>

      <!-- 暫停畫面 -->
      <div v-else-if="gameState === 'paused'" class="game-content-fit">
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 sm:p-6 lg:p-8 max-w-sm mx-auto border border-[var(--color-border)] text-center shadow-2xl">
          <div class="text-4xl sm:text-5xl mb-4">⏸️</div>
          <h2 class="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-[var(--color-text)]">遊戲暫停</h2>
          <div class="flex flex-col sm:flex-row gap-3">
            <button @click="resumeGame" class="btn btn-primary btn-lg flex-1">
              繼續遊戲
            </button>
            <button @click="quitGame" class="btn btn-danger btn-lg flex-1">
              結束遊戲
            </button>
          </div>
        </div>
      </div>

      <!-- 結算畫面 - 適應螢幕高度，避免滾動 -->
      <div v-else-if="gameState === 'finished'" class="game-content-fit max-w-lg mx-auto text-center">
        <div class="card bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-lg">
          <div class="text-5xl sm:text-6xl mb-2 sm:mb-4 animate-bounce-in">
            {{ getFinalEmoji(currentScore) }}
          </div>
          <h2 class="text-xl font-bold mb-2 text-[var(--color-text)]">遊戲結束！</h2>
          
          <div class="my-6 sm:my-8 bg-[var(--color-bg)] rounded-xl p-4 inline-block min-w-[120px]">
            <div class="text-5xl sm:text-6xl font-bold leading-none" :class="getScoreClass(currentScore)">
              {{ currentScore }}
            </div>
            <div class="text-sm sm:text-xl text-[var(--color-text-secondary)] mt-1">分</div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8 text-left">
            <div class="bg-[var(--color-surface-alt)] p-3 sm:p-4 rounded-lg flex flex-col justify-center">
              <div class="text-xs sm:text-sm text-[var(--color-text-secondary)]">正確率</div>
              <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">{{ Math.round((gameResult?.accuracy || 0) * 100) }}%</div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-3 sm:p-4 rounded-lg flex flex-col justify-center">
              <div class="text-xs sm:text-sm text-[var(--color-text-secondary)]">遊戲時長</div>
              <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">{{ formatTime(gameResult?.duration || 0) }}</div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-3 sm:p-4 rounded-lg flex flex-col justify-center">
              <div class="text-xs sm:text-sm text-[var(--color-text-secondary)]">答對題數</div>
              <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                {{ gameResult?.correctCount || 0 }} <span class="text-xs text-[var(--color-text-secondary)]">/ {{ gameResult?.totalCount || 0 }}</span>
              </div>
            </div>
            <div class="bg-[var(--color-surface-alt)] p-3 sm:p-4 rounded-lg flex flex-col justify-center">
              <div class="text-xs sm:text-sm text-[var(--color-text-secondary)]">平均反應</div>
              <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">{{ gameResult?.avgReactionTime || 0 }}<span class="text-xs">ms</span></div>
            </div>
          </div>
          
          <div v-if="bestScore > 0" class="mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 flex justify-between items-center text-sm sm:text-base">
            <span class="text-[var(--color-text)]">最佳成績</span>
            <div class="text-right">
              <span class="font-bold text-blue-600 dark:text-blue-400 block">{{ bestScore }} 分</span>
              <div v-if="currentScore > bestScore" class="text-xs text-green-600 dark:text-green-400 font-bold">
                🎉 新紀錄！
              </div>
            </div>
          </div>
          
          <div 
            v-if="difficultyAdjustment"
            class="mb-6 p-3 sm:p-4 rounded-xl border-2 text-left"
            :class="[difficultyFeedbackStyle.bgClass, difficultyFeedbackStyle.borderClass]"
          >
            <div class="flex items-start gap-3">
              <div 
                class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
                :class="difficultyFeedbackStyle.iconBgClass"
              >
                {{ difficultyFeedbackStyle.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm sm:text-base mb-1" :class="difficultyFeedbackStyle.textClass">難度調整通知</h4>
                <p class="text-xs sm:text-sm mb-2 break-words" :class="difficultyFeedbackStyle.subTextClass">{{ difficultyReasonText }}</p>
                
                <div 
                  class="text-xs sm:text-sm p-1.5 sm:p-2 rounded-lg bg-white/60 dark:bg-black/20"
                  :class="difficultyFeedbackStyle.subTextClass"
                >
                  <div class="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span class="font-medium truncate">{{ getFullDifficultyLabel(difficultyAdjustment.currentDifficulty, difficultyAdjustment.currentSubDifficulty) }}</span>
                    <span>→</span>
                    <span class="font-bold truncate">{{ getFullDifficultyLabel(difficultyAdjustment.newDifficulty, difficultyAdjustment.newSubDifficulty) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <template v-if="isFromDailyTraining">
            <div class="flex flex-col gap-3 mb-4">
               <button 
                v-if="gameStore.getNextTrainingGame()"
                @click="continueToNextGame" 
                class="btn btn-primary btn-xl w-full shadow-lg"
              >
                ➡️ 下一個遊戲
              </button>
              <router-link 
                v-else
                to="/report" 
                class="btn btn-primary btn-xl w-full shadow-lg"
              >
                📊 查看報告
              </router-link>
              
              <button @click="playAgain" class="btn btn-secondary btn-lg w-full">
                🔄 再玩一次
              </button>
            </div>
            <div class="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              訓練進度：{{ gameStore.currentTrainingIndex + 1 }} / {{ gameStore.dailyTrainingQueue.length }}
            </div>
          </template>
          
          <template v-else>
            <div class="flex flex-col gap-3 mb-6">
              <button 
                v-if="recommendedGames.length > 0 && recommendedGames[0]"
                @click="recommendedGames[0] && startRecommendedGame(recommendedGames[0])" 
                class="btn btn-primary btn-xl py-3 sm:py-4 text-base sm:text-lg w-full shadow-md flex items-center justify-center gap-2"
              >
                <span>➡️</span>
                <div class="text-left leading-tight">
                  <div class="text-xs opacity-80 font-normal">下一個挑戰</div>
                  <div>{{ recommendedGames[0]?.name }}</div>
                </div>
              </button>

              <div class="grid grid-cols-2 gap-3">
                <button @click="playAgain" class="btn btn-secondary btn-lg w-full py-3">
                  🔄 再玩一次
                </button>
                <router-link to="/games" class="btn btn-secondary btn-lg w-full py-3 flex items-center justify-center">
                  🎮 更多遊戲
                </router-link>
              </div>
            </div>
            
            <div v-if="recommendedGames.length > 1" class="mt-4">
              <h3 class="text-sm font-medium text-[var(--color-text)] mb-3 text-left">
                🎯 其他推薦
              </h3>
              <div class="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  v-for="game in recommendedGames.slice(1)"
                  :key="game.id"
                  @click="startRecommendedGame(game)"
                  class="recommended-game-card"
                >
                  <span class="text-2xl sm:text-3xl mb-1 sm:mb-2">{{ game.icon }}</span>
                  <span class="text-xs sm:text-sm font-bold text-[var(--color-text)] truncate w-full px-1">
                    {{ game.name }}
                  </span>
                  <span class="text-[10px] sm:text-xs text-[var(--color-accent-purple)] font-medium">
                    {{ getGameDimensionLabel(game.id) }}
                  </span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    
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
import { DIFFICULTIES, type GameResult, type GameState, type GameDefinition, type GameStatusUpdate } from '@/types/game'
import { calculateDifficultyAdjustment, applyDifficultyAdjustment, getFullDifficultyLabel, type DifficultyAdjustment } from '@/services/adaptiveDifficultyService'
import { markGameCompleted } from '@/services/dailyTrainingService'
import TrainingCompleteModal from '@/components/ui/TrainingCompleteModal.vue'
import { gameRegistry } from '@/core/gameRegistry'
import type { CognitiveDimension } from '@/types/cognitive'

// 認知維度中文名稱對應
const dimensionLabels: Record<CognitiveDimension, string> = {
  memory: '記憶力',
  attention: '專注力',
  logic: '邏輯推理',
  reaction: '反應速度',
  cognition: '認知能力',
  coordination: '協調能力'
}

// 取得遊戲的主要維度名稱
function getGameDimensionLabel(gameId: string): string {
  const dimension = gameRegistry.getPrimaryDimension(gameId)
  return dimension ? dimensionLabels[dimension] : '綜合訓練'
}

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

// 遊戲元件回報的即時狀態
const gameStatus = ref<GameStatusUpdate>({
  showTimer: true,
  showScore: true,
  showCounts: false,
  showCombo: false,
  showProgress: false
})

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

// 遊戲載入中元件
const GameLoadingComponent = {
  template: `
    <div class="flex flex-col items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p class="text-[var(--color-text-secondary)]">遊戲載入中...</p>
    </div>
  `
}

// 遊戲載入錯誤元件
const GameErrorComponent = {
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">😵</div>
      <h3 class="text-xl font-bold text-red-500 mb-2">遊戲載入失敗</h3>
      <p class="text-[var(--color-text-secondary)] mb-4">抱歉，遊戲元件無法載入，請稍後再試。</p>
      <button 
        class="btn btn-primary"
        @click="$emit('retry')"
      >
        重新載入
      </button>
    </div>
  `,
  emits: ['retry']
}

// 動態載入遊戲元件（含錯誤處理）
const createGameComponent = (loader: () => Promise<any>) => {
  return defineAsyncComponent({
    loader,
    loadingComponent: GameLoadingComponent,
    errorComponent: GameErrorComponent,
    delay: 200,
    timeout: 30000,
  })
}

// 動態載入遊戲元件
const gameComponent = computed(() => {
  if (!gameId.value) return null
  
  // 根據遊戲 ID 載入對應元件 - 完整 15 款遊戲
  const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    // 注意力訓練
    'whack-a-mole': createGameComponent(() => import('@/components/games/WhackAMole.vue')),
    'spot-difference': createGameComponent(() => import('@/components/games/SpotDifference.vue')),
    'number-connect': createGameComponent(() => import('@/components/games/NumberConnect.vue')),
    // 記憶力訓練
    'card-match': createGameComponent(() => import('@/components/games/CardMatch.vue')),
    'instant-memory': createGameComponent(() => import('@/components/games/InstantMemory.vue')),
    'poker-memory': createGameComponent(() => import('@/components/games/PokerMemory.vue')),
    'audio-memory': createGameComponent(() => import('@/components/games/AudioMemory.vue')),
    'gesture-memory': createGameComponent(() => import('@/components/games/GestureMemory.vue')),
    // 執行功能訓練
    'balance-scale': createGameComponent(() => import('@/components/games/BalanceScale.vue')),
    'maze-navigation': createGameComponent(() => import('@/components/games/MazeNavigation.vue')),
    'math-calc': createGameComponent(() => import('@/components/games/MathCalc.vue')),
    // 視覺空間訓練
    'clock-drawing': createGameComponent(() => import('@/components/games/ClockDrawingTest.vue')),
    'pattern-reasoning': createGameComponent(() => import('@/components/games/PatternReasoning.vue')),
    // 反應能力訓練
    'rock-paper-scissors': createGameComponent(() => import('@/components/games/RockPaperScissors.vue')),
    'rhythm-mimic': createGameComponent(() => import('@/components/games/RhythmMimic.vue')),
    // 其他測試
    'stroop-test': createGameComponent(() => import('@/components/games/StroopTest.vue')),
  }
  
  return componentMap[gameId.value] || null
})

// 格式化時間（防止負數）
function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
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
  
  // 重置遊戲狀態顯示
  gameStatus.value = {
    showTimer: true,
    showScore: true,
    showCounts: false,
    showCombo: false,
    showProgress: false
  }
  
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

// 處理遊戲狀態更新（來自遊戲元件的 throttled emit）
function handleStatusUpdate(status: GameStatusUpdate): void {
  // 合併狀態，保留未更新的欄位
  gameStatus.value = { ...gameStatus.value, ...status }
  
  // 同步分數到 currentScore（兼容舊版）
  if (status.score !== undefined) {
    currentScore.value = status.score
  }
}

// 處理遊戲結束
async function handleGameEnd(result: GameResult): Promise<void> {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  try {
    gameResult.value = result
    currentScore.value = result.score
    gameState.value = 'finished'
    
    // 記錄遊戲結果
    await gameStore.recordGameResult(result)
    
    // 如果是每日訓練，標記完成並更新狀態
    if (isFromDailyTraining.value) {
      gameStore.completeCurrentTrainingGame(result.score, result.duration)
      
      // 同步更新到後端服務，確保進度持久化
      const odId = userStore.currentUser?.id
      if (odId) {
        await markGameCompleted(odId, result.gameId, result.duration)
      }
      
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
    console.error('處理遊戲結束時發生錯誤:', error)
    // 確保狀態為 finished 以顯示結果畫面（即使部分邏輯失敗）
    gameState.value = 'finished'
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
    // 先重置當前狀態
    playAgain()
    
    // 移動到下一個遊戲
    gameStore.moveToNextTrainingGame()
    gameStore.selectGame(nextGame.gameId)
    gameStore.selectDifficulty(nextGame.difficulty)
    
    // 強制跳轉（如果是同一個路由，Vue Router 可能不會重新加載組件）
    // 使用 replace 避免在歷史記錄中堆積
    router.replace({
      path: `/games/${nextGame.gameId}`,
      query: { 
        autoStart: 'true', 
        fromDaily: 'true',
        t: Date.now().toString() // 加入時間戳強制刷新
      }
    })
  } else {
    // 如果沒有下一個遊戲，跳轉到報告頁面
    router.push('/report')
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
    router.push(`/games/${gameId.value}/preview`)
  } else {
    router.push('/games')
  }
}

// 監聯路由變化，選擇遊戲
watch(() => route.params.gameId, (newId: string | string[] | undefined) => {
  if (newId) {
    const id = Array.isArray(newId) ? newId[0] : newId
    if (id) gameStore.selectGame(id)
    
    // 如果是從每日訓練自動跳轉過來的，且帶有 autoStart 參數
    if (route.query.autoStart === 'true') {
      // 重置狀態
      playAgain()
      // 延遲開始，確保組件已掛載
      setTimeout(() => {
        startGame()
      }, 100)
    }
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
