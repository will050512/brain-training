<template>
  <div class="game-wrapper page-ambient h-[100dvh] bg-[var(--color-bg)] flex flex-col overflow-hidden">
    <GamePlayHeader
      :isMobile="isMobile"
      :isLandscape="isLandscape"
      :isPlaying="gameState === 'playing'"
      :currentGameName="currentGame?.name || '遊戲'"
      :difficulty="gameStore.currentDifficulty"
      :gameStatus="gameStatus"
      :currentScore="currentScore"
      :elapsedTime="elapsedTime"
      :formatTime="formatTime"
      :onBack="handleBack"
    />

    <GamePlayMobileStatusBar
      v-if="isMobile && gameState === 'playing'"
      :gameStatus="gameStatus"
      :currentScore="currentScore"
      :elapsedTime="elapsedTime"
      :formatTime="formatTime"
    />

    <div
      class="game-play-area flex-1 min-h-0 content-max w-full px-3 sm:px-6"
      :class="{ 'pt-20': isMobile && gameState === 'playing' }"
      @mousedown="handlePlayAreaInteraction"
      @touchstart="handlePlayAreaInteraction"
    >
      <GameReadyScreen
        v-if="gameState === 'ready'"
        :currentGame="currentGame || null"
        :difficulty="gameStore.currentDifficulty"
        :startError="startError"
        :onOpenDifficulty="() => { showDifficultyPanel = true }"
        :onStart="startGame"
        :onBack="goBackToList"
      />

      <div v-else class="relative w-full h-full min-h-0">
        <GamePlayingArea
          v-if="gameState === 'playing' || gameState === 'paused'"
          :gameComponent="gameComponent"
          :gameComponentKey="gameComponentKey"
          :difficulty="gameStore.currentDifficulty"
          :subDifficulty="gameStore.currentSubDifficulty"
          :settings="difficultySettings"
          :autoStart="shouldAutoStart"
          :isPaused="gameState === 'paused'"
          :onScoreChange="handleScoreChange"
          :onGameStart="handleGameStart"
          :onGameEnd="handleGameEnd"
          :onStatusUpdate="handleStatusUpdate"
        />

        <div
          v-if="gameState === 'paused'"
          class="absolute inset-0 z-20"
        >
          <GamePausedScreen :onResume="resumeGame" :onQuit="quitGame" />
        </div>

        <GameResultScreen
          v-if="gameState === 'finished'"
          :currentScore="currentScore"
          :unifiedGameResult="unifiedGameResult"
          :gameResult="gameResult"
          :bestScore="bestScore"
          :difficultyAdjustment="difficultyAdjustment"
          :difficultyFeedbackStyle="difficultyFeedbackStyle"
          :difficultyReasonText="difficultyReasonText"
          :recommendedGames="recommendedGames"
          :isFromDailyTraining="isFromDailyTraining"
          :nextTrainingAvailable="!!gameStore.getNextTrainingGame()"
          :dailyQueueCount="gameStore.dailyTrainingQueue.length"
          :trainingIndex="gameStore.currentTrainingIndex"
          :formatTime="formatTime"
          :getFinalEmoji="getFinalEmoji"
          :getScoreClass="getScoreClass"
          :getFullDifficultyLabel="getFullDifficultyLabel"
          :getGameDimensionLabel="getGameDimensionLabel"
          :onStartRecommendedGame="startRecommendedGame"
          :onPlayAgain="playAgain"
          :onContinueToNextGame="continueToNextGame"
        />
      </div>
    </div>

    <TrainingCompleteModal
      v-if="showCompletionModal"
      :summary="gameStore.getTodayTrainingSummary()"
      @close="handleCompletionClose"
      @skip="handleCompletionClose"
    />

    <DifficultyAdjustPanel
      :is-open="showDifficultyPanel"
      :game-info="gameInfoForDifficultyPanel"
      @close="showDifficultyPanel = false"
      @confirm="handleDifficultyConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { gameRegistry } from '@/core/gameRegistry'
import { useGameStore, useUserStore, useSettingsStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import { type GameResult, type GameState, type GameDefinition, type GameStatusUpdate, type UnifiedGameResult, type Difficulty, type SubDifficulty, type GameMode } from '@/types/game'
import { calculateDifficultyAdjustment, applyDifficultyAdjustment, getFullDifficultyLabel, type DifficultyAdjustment } from '@/services/adaptiveDifficultyService'
import { markGameCompleted, markTrainingInterrupted, updatePlannedGameDifficulties } from '@/services/dailyTrainingService'
import TrainingCompleteModal from '@/components/ui/TrainingCompleteModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DifficultyAdjustPanel from '@/components/ui/DifficultyAdjustPanel.vue'
import GamePlayHeader from '@/components/game-play/GamePlayHeader.vue'
import GamePlayMobileStatusBar from '@/components/game-play/GamePlayMobileStatusBar.vue'
import GameReadyScreen from '@/components/game-play/GameReadyScreen.vue'
import GamePlayingArea from '@/components/game-play/GamePlayingArea.vue'
import GamePausedScreen from '@/components/game-play/GamePausedScreen.vue'
import GameResultScreen from '@/components/game-play/GameResultScreen.vue'
import type { CognitiveDimension } from '@/types/cognitive'
import { isLegacyGameResult, normalizeToLegacyGameResult } from '@/services/gameResultAdapter'
import { scoreNormalizer } from '@/services/scoreNormalizer'
import { BehaviorCollector } from '@/services/behaviorAnalysisService'
import { generateId } from '@/services/db'

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
const settingsStore = useSettingsStore()
const { isMobile } = useResponsive()

// 檢測橫屏
const isLandscape = ref(false)

function checkOrientation() {
  isLandscape.value = window.innerHeight < 500 && window.innerWidth > window.innerHeight
}

// 遊戲狀態（預設在準備畫面顯示遊戲說明，避免直接進入造成誤判）
const gameState = ref<GameState>('ready')
const currentScore = ref(0)
const elapsedTime = ref(0)
const gameResult = ref<GameResult | null>(null)
const unifiedGameResult = ref<UnifiedGameResult | null>(null)
const difficultyAdjustment = ref<DifficultyAdjustment | null>(null)
let timerInterval: ReturnType<typeof setInterval> | null = null
const gameComponentKey = ref(0)
const autoStartOverride = ref(false)
const startError = ref<string | null>(null)

const shouldAutoStart = computed(() => {
  return route.query.autoStart === 'true' || autoStartOverride.value
})

// 遊戲元件回報的即時狀態
const gameStatus = ref<GameStatusUpdate>({
  showTimer: true,
  // 避免「遊戲中分數」與「結算統一分數/等級」形成雙系統造成誤判
  showScore: false,
  showCounts: false,
  showCombo: false,
  showProgress: false
})

const currentSessionId = ref<string | null>(null)
const behaviorCollector = ref<BehaviorCollector | null>(null)
let lastTouchAt = 0
const pendingDailyCompletion = ref<Promise<unknown> | null>(null)

// 每日訓練相關
const showCompletionModal = ref(false)
const recommendedGames = ref<GameDefinition[]>([])
const showDifficultyPanel = ref(false)

// 判斷是否從每日訓練進入
const isFromDailyTraining = computed(() => {
  return route.query.fromDaily === 'true' || gameStore.isFromDailyTraining
})

const gameInfoForDifficultyPanel = computed(() => {
  if (!currentGame.value) return null
  return {
    id: currentGame.value.id,
    name: currentGame.value.name,
    icon: currentGame.value.icon,
  }
})

// 取得遊戲 ID（容錯：支援 route param 為 array / 遺失時 fallback 到 store）
const routeGameId = computed(() => {
  const raw = route.params.gameId
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] || ''
  return ''
})

const resolvedGameId = computed(() => routeGameId.value || gameStore.currentGameId || '')

// 當前遊戲（優先使用路由 ID，避免 store 殘留導致顯示錯誤）
const currentGame = computed(() => {
  if (resolvedGameId.value) {
    return gameRegistry.get(resolvedGameId.value) || gameStore.currentGame
  }
  return gameStore.currentGame
})

// 難度設定
const difficultySettings = computed(() => 
  resolvedGameId.value ? gameStore.getDifficultySettings(resolvedGameId.value, gameStore.currentDifficulty) : {}
)

// 最佳成績
const bestScore = computed(() =>
  resolvedGameId.value ? gameStore.getBestScore(resolvedGameId.value, gameStore.currentDifficulty) : 0
)

// 難度調整反饋樣式
const emptyDifficultyFeedbackStyle = {
  bgClass: '',
  borderClass: '',
  iconBgClass: '',
  textClass: '',
  subTextClass: '',
  icon: ''
}

const difficultyFeedbackStyle = computed(() => {
  if (!difficultyAdjustment.value) return emptyDifficultyFeedbackStyle

  if (difficultyAdjustment.value.reason === 'accuracy-high') {
    return {
      bgClass: 'bg-gradient-to-r from-[var(--color-success-bg)] to-[var(--color-surface-alt)]',
      borderClass: 'border-[var(--color-success)]/50',
      iconBgClass: 'bg-[var(--color-success)]/10',
      textClass: 'text-[var(--color-success)]',
      subTextClass: 'text-[var(--color-success)]',
      icon: '⬆️'
    }
  } else if (difficultyAdjustment.value.reason === 'accuracy-low') {
    return {
      bgClass: 'bg-gradient-to-r from-[var(--color-warning-bg)] to-[var(--color-surface-alt)]',
      borderClass: 'border-[var(--color-warning)]/50',
      iconBgClass: 'bg-[var(--color-warning)]/10',
      textClass: 'text-[var(--color-warning)]',
      subTextClass: 'text-[var(--color-warning)]',
      icon: '⬇️'
    }
  }
  return {
    bgClass: 'bg-gradient-to-r from-[var(--color-info-bg)] to-[var(--color-surface-alt)]',
    borderClass: 'border-[var(--color-info)]/50',
    iconBgClass: 'bg-[var(--color-info)]/10',
    textClass: 'text-[var(--color-info)]',
    subTextClass: 'text-[var(--color-info)]',
    icon: '➡️'
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
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-primary)] border-t-transparent mb-4"></div>
      <p class="text-[var(--color-text-secondary)]">遊戲載入中...</p>
    </div>
  `
}

// 遊戲載入錯誤元件
const GameErrorComponent = {
  components: { BaseButton },
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">😵</div>
        <h3 class="text-xl font-bold text-[var(--color-danger)] mb-2">遊戲載入失敗</h3>
      <p class="text-[var(--color-text-secondary)] mb-4">抱歉，遊戲元件無法載入，請稍後再試。</p>
      <BaseButton @click="$emit('retry')">
        重新載入
      </BaseButton>
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
  const id = resolvedGameId.value
  if (!id) return null
  
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
  
  return componentMap[id] || null
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
  if (score >= 80) return 'text-[var(--color-score-good)]'
  if (score >= 50) return 'text-[var(--color-score-moderate)]'
  return 'text-[var(--color-score-concern)]'
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
  if (!gameComponent.value) {
    startError.value = '此遊戲目前無法載入，請返回列表重新選擇。'
    return
  }
  startError.value = null

  // 重置狀態，避免停留在「準備」畫面或用舊分數繼續
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []

  // 進入遊戲畫面並要求元件自動開始（各遊戲會自行決定倒數/起跑）
  gameState.value = 'playing'
  autoStartOverride.value = true
  gameComponentKey.value++
  startBehaviorSession()
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

function handleGameStart(): void {
  // 倒數完成後由遊戲元件觸發
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'playing'
  autoStartOverride.value = false
  elapsedTime.value = 0
  timerInterval = setInterval(() => {
    elapsedTime.value++
  }, 1000)
  if (!behaviorCollector.value) {
    startBehaviorSession()
  }
}

// 結束遊戲
function quitGame(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (isFromDailyTraining.value) {
    const odId = userStore.currentUser?.id
    if (odId) {
      markTrainingInterrupted(odId).catch(error => console.error('markTrainingInterrupted failed:', error))
    }
    gameStore.isFromDailyTraining = false
  }
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
}

// 處理分數變化
function handleScoreChange(score: number): void {
  currentScore.value = score
}

// 處理遊戲狀態更新（來自遊戲元件的 throttled emit）
function handleStatusUpdate(status: GameStatusUpdate): void {
  // 合併狀態，保留未更新的欄位
  gameStatus.value = { ...gameStatus.value, ...status, showScore: false }
  
  // 同步分數到 currentScore（兼容舊版）
  if (status.score !== undefined) {
    currentScore.value = status.score
  }
}

// 處理遊戲結束
async function handleGameEnd(rawResult: unknown): Promise<void> {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  try {
    const subDifficulty = (() => {
      const raw = Number(route.query.subDifficulty ?? gameStore.currentSubDifficulty ?? 2)
      if (!Number.isFinite(raw)) return 2
      const clamped = Math.max(1, Math.min(3, Math.round(raw)))
      return clamped as 1 | 2 | 3
    })()

    const durationSeconds = (() => {
      const dur = typeof (rawResult as any)?.duration === 'number' ? Number((rawResult as any).duration) : NaN
      if (!Number.isFinite(dur) || dur < 0) return elapsedTime.value

      // 單位校驗：若看起來是毫秒（例如 60000），轉為秒。
      // 一般單局遊戲不會超過 1 小時；若 > 3600 且 <= 3600*1000，視為毫秒。
      if (dur > 3600 && dur <= 3600 * 1000) {
        return Math.round(dur / 1000)
      }

      // 避免極端不合理值直接影響結算
      if (dur > 24 * 60 * 60) return elapsedTime.value

      return Math.round(dur)
    })()

    const id = resolvedGameId.value
    if (!id) {
      throw new Error('Missing gameId for result normalization')
    }

    const gameMode: GameMode = isFromDailyTraining.value ? 'daily' : 'free'
    const result: GameResult = isLegacyGameResult(rawResult)
      ? {
          ...rawResult,
          gameId: id,
          difficulty: gameStore.currentDifficulty,
          subDifficulty,
          duration: durationSeconds,
          timestamp: new Date(),
          mode: gameMode
        }
      : normalizeToLegacyGameResult({
          gameId: id,
          rawResult,
          difficulty: gameStore.currentDifficulty,
          subDifficulty,
          durationSeconds
        })

    // 同時產生統一結果用於結算畫面顯示
    const unified = scoreNormalizer.normalize(
      id,
      rawResult,
      gameStore.currentDifficulty,
      subDifficulty,
      durationSeconds
    )

    // 最終寫入的 GameResult：修正歷史資料常見問題
    // - score 爆表（>100）導致 Sheet/報表誤判
    // - 缺少 grade/metrics/tracking 造成 Sheet 顯示為 F、completion=0
    const clampedScore = Math.max(0, Math.min(100, Math.round(Number(result.score ?? 0))))
    const finalizedResult: GameResult = {
      ...result,
      gameId: id,
      difficulty: gameStore.currentDifficulty,
      subDifficulty,
      score: clampedScore,
      maxScore: 100,
      timestamp: new Date(),
      mode: gameMode,
      grade: unified.grade,
      metrics: unified.metrics,
      tracking: unified.tracking,
      gameSpecific: unified.gameSpecific ?? result.gameSpecific,
      displayStats: unified.displayStats ?? result.displayStats
    }

    gameResult.value = finalizedResult
    unifiedGameResult.value = unified
    currentScore.value = finalizedResult.score
    gameState.value = 'finished'

    // 先準備好「推薦/下一步」所需資料（避免 DB 寫入失敗導致結算頁沒有按鈕/推薦）
    if (isFromDailyTraining.value) {
      // 每日訓練：若沒有下一個訓練項目，提供其他推薦避免結算頁空白
      const hasNext = Boolean(gameStore.getNextTrainingGame())
      recommendedGames.value = hasNext ? [] : gameStore.getUnplayedGamesByOtherDimensions(id, 4)
    } else {
      recommendedGames.value = gameStore.getUnplayedGamesByOtherDimensions(id, 4)
    }

    // 記錄遊戲結果（失敗不阻擋結算流程）
    try {
      await gameStore.recordGameResult(finalizedResult, gameMode, currentSessionId.value ?? undefined)
    } catch (error) {
      console.error('recordGameResult failed:', error)
    }
    await finalizeBehaviorLogs()

    // 如果是每日訓練，標記完成並更新狀態（失敗不阻擋「繼續下一個」）
    if (isFromDailyTraining.value) {
      gameStore.completeCurrentTrainingGame(finalizedResult.score, finalizedResult.duration, finalizedResult.gameId)

      const odId = userStore.currentUser?.id
      if (odId) {
        try {
          const completionPromise = markGameCompleted(odId, finalizedResult.gameId, finalizedResult.duration)
          pendingDailyCompletion.value = completionPromise
          await completionPromise
        } catch (error) {
          console.error('markGameCompleted failed:', error)
        } finally {
          if (pendingDailyCompletion.value) {
            pendingDailyCompletion.value = null
          }
        }
      }

      if (gameStore.isAllTrainingCompleted()) {
        showCompletionModal.value = true
      }
    }
    
    // 計算難度調整
    const odId = userStore.currentUser?.id || ''
    if (odId && id) {
      const adjustment = await calculateDifficultyAdjustment(
        odId,
        id,
        result
      )
      difficultyAdjustment.value = adjustment
      
      // 如果需要調整，套用調整
      if (adjustment.shouldAdjust) {
        await applyDifficultyAdjustment(odId, id, adjustment, result.accuracy)
      }

      if (isFromDailyTraining.value && adjustment.shouldAdjust) {
        const direction = (() => {
          if (adjustment.reason === 'accuracy-high' || adjustment.reason === 'reaction-improved') return 1
          if (adjustment.reason === 'accuracy-low' || adjustment.reason === 'reaction-declined' || adjustment.reason === 'inactivity') return -1
          return null
        })()

        if (direction) {
          const updates = gameStore.shiftRemainingTrainingDifficulties(direction)
          if (updates.length > 0) {
            updatePlannedGameDifficulties(odId, updates).catch(err => console.error('updatePlannedGameDifficulties failed', err))
          }
        }
      }
    }
  } catch (error) {
    console.error('處理遊戲結束時發生錯誤:', error)
    // 確保狀態為 finished 以顯示結果畫面（即使部分邏輯失敗）
    gameState.value = 'finished'
    finalizeBehaviorLogs().catch(() => {
      // ignore
    })
  }
}

// 再玩一次
function playAgain(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'playing'
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []
  gameStatus.value = {
    showTimer: true,
    showScore: true,
    showCounts: false,
    showCombo: false,
    showProgress: false
  }
  autoStartOverride.value = true
  gameComponentKey.value++
  startBehaviorSession()
}

// 繼續下一個訓練遊戲
function continueToNextGame(): void {
  const nextGame = gameStore.getNextTrainingGame()
  if (nextGame) {
    // 移動到下一個遊戲
    gameStore.moveToNextTrainingGame()
    gameStore.selectGame(nextGame.gameId)
    gameStore.selectDifficulty(nextGame.difficulty)
    if (nextGame.subDifficulty) {
      gameStore.selectSubDifficulty(nextGame.subDifficulty)
    }
    
    // 進入下一個遊戲：保持在「準備畫面」顯示遊戲說明，避免無意義自動開始造成誤判
    router.replace({
      path: `/games/${nextGame.gameId}`,
      query: { 
        fromDaily: 'true',
        subDifficulty: String(nextGame.subDifficulty ?? gameStore.currentSubDifficulty),
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
  const stored = settingsStore.getGameDifficulty(game.id)
  gameStore.selectDifficulty(stored.difficulty)
  gameStore.selectSubDifficulty(stored.subDifficulty)
  router.push({
    path: `/games/${game.id}`,
    query: { autoStart: 'true', subDifficulty: String(stored.subDifficulty) }
  })
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
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
  }
}

async function ensureDailyCompletionSaved(): Promise<void> {
  if (!isFromDailyTraining.value) return
  if (gameState.value !== 'finished' || !gameResult.value) return

  const odId = userStore.currentUser?.id
  if (!odId) return

  if (pendingDailyCompletion.value) {
    try {
      await pendingDailyCompletion.value
    } catch {
      // already logged elsewhere
    }
    return
  }

  try {
    const completionPromise = markGameCompleted(odId, gameResult.value.gameId, gameResult.value.duration)
    pendingDailyCompletion.value = completionPromise
    await completionPromise
  } catch (error) {
    console.error('markGameCompleted failed:', error)
  } finally {
    pendingDailyCompletion.value = null
  }
}

function goBackToList(): void {
  router.push(isFromDailyTraining.value ? '/daily-challenge' : '/games')
}

function handleDifficultyConfirm(difficulty: Difficulty, subDifficulty: SubDifficulty, applyToAll: boolean): void {
  gameStore.selectDifficulty(difficulty)
  gameStore.selectSubDifficulty(subDifficulty)
  if (applyToAll) {
    settingsStore.setDefaultDifficulty(difficulty, subDifficulty)
    settingsStore.resetAllGameDifficulties()
  }

  if (isFromDailyTraining.value && resolvedGameId.value) {
    gameStore.updateCurrentTrainingGameDifficulty(difficulty, subDifficulty, { manualOverride: true })
    const odId = userStore.currentUser?.id
    if (odId) {
      updatePlannedGameDifficulties(odId, [
        { gameId: resolvedGameId.value, difficulty, subDifficulty, manualOverride: true }
      ]).catch(err => console.error('updatePlannedGameDifficulties failed', err))
    }
  } else if (!applyToAll && resolvedGameId.value) {
    settingsStore.setGameDifficulty(resolvedGameId.value, { difficulty, subDifficulty })
  }
  router.replace({
    path: resolvedGameId.value ? `/games/${resolvedGameId.value}` : route.path,
    query: {
      ...route.query,
      subDifficulty: String(subDifficulty),
    },
  })
}

// 從資料庫還原每日訓練隊列，避免重新整理後無法「繼續下一個」
async function ensureDailyQueueHydrated(): Promise<void> {
  if (!isFromDailyTraining.value) return
  const odId = userStore.currentUser?.id
  if (!odId) return

  if (gameStore.dailyTrainingQueue.length === 0) {
    await gameStore.syncDailyTrainingFromDB(odId)
  }

  const current = gameStore.getCurrentTrainingGame()
  if (current) {
    gameStore.selectGame(current.gameId)
    gameStore.selectDifficulty(current.difficulty)
    if (current.subDifficulty) {
      gameStore.selectSubDifficulty(current.subDifficulty)
    }
  }
}

// 監聯路由變化，選擇遊戲
function resetToReadyState(): void {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  gameState.value = 'ready'
  currentScore.value = 0
  elapsedTime.value = 0
  gameResult.value = null
  unifiedGameResult.value = null
  difficultyAdjustment.value = null
  recommendedGames.value = []
  gameStatus.value = {
    showTimer: true,
    showScore: false,
    showCounts: false,
    showCombo: false,
    showProgress: false
  }
  autoStartOverride.value = false
  startError.value = null
  showDifficultyPanel.value = false
  gameComponentKey.value++
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
}

watch(routeGameId, (newId) => {
  if (newId) {
    const fromDailyQuery = route.query.fromDaily === 'true'
    if (gameStore.isFromDailyTraining !== fromDailyQuery) {
      gameStore.isFromDailyTraining = fromDailyQuery
    }
    gameStore.selectGame(newId)
    const sd = Number(route.query.subDifficulty)
    if (Number.isFinite(sd)) {
      const clamped = Math.max(1, Math.min(3, Math.round(sd))) as 1 | 2 | 3
      gameStore.selectSubDifficulty(clamped)
    }

    // 非每日訓練：使用該遊戲的已儲存難度（未設定時回到全域預設）
    if (!isFromDailyTraining.value) {
      const stored = settingsStore.getGameDifficulty(newId)
      gameStore.selectDifficulty(stored.difficulty)
      if (!route.query.subDifficulty) {
        gameStore.selectSubDifficulty(stored.subDifficulty)
      }
    }
    resetToReadyState()
    return
  }

  // 若路由缺少 gameId，但 store 有選中遊戲，補上正確路徑避免進入無效狀態
  if (gameStore.currentGameId) {
    router.replace({
      path: `/games/${gameStore.currentGameId}`,
      query: route.query,
    })
  }
}, { immediate: true })

// 組件卸載時清理
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  finalizeBehaviorLogs().catch(() => {
    // ignore
  })
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})

// 初始化
onMounted(() => {
  if (resolvedGameId.value && !routeGameId.value) {
    router.replace({
      path: `/games/${resolvedGameId.value}`,
      query: route.query,
    })
  } else if (routeGameId.value) {
    gameStore.selectGame(routeGameId.value)
  }

  // 初始化橫屏檢測
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)

  ensureDailyQueueHydrated().catch(err => console.error('恢復每日訓練失敗', err))

  // 若從「選擇難度/說明頁」明確按下開始，可用 autoStart 直接進入遊戲，避免「開始→又回到開始」的循環體感
  if (route.query.autoStart === 'true') {
    nextTick(() => startGame())
  }
})

onBeforeRouteLeave(async () => {
  await ensureDailyCompletionSaved()
  return true
})

function startBehaviorSession(): void {
  const odId = userStore.currentUser?.id
  const gameId = resolvedGameId.value
  if (!odId || !gameId) return
  const sessionId = generateId()
  currentSessionId.value = sessionId
  behaviorCollector.value = new BehaviorCollector(odId, gameId, sessionId)
}

async function finalizeBehaviorLogs(): Promise<void> {
  if (!behaviorCollector.value) return
  try {
    await behaviorCollector.value.saveAll()
  } catch (error) {
    console.error('saveAll behavior logs failed', error)
  } finally {
    behaviorCollector.value = null
    currentSessionId.value = null
  }
}

function handlePlayAreaInteraction(event: MouseEvent | TouchEvent): void {
  if (gameState.value !== 'playing') return
  if (!behaviorCollector.value) return

  const now = Date.now()
  if (event.type.startsWith('touch')) {
    lastTouchAt = now
  } else if (now - lastTouchAt < 500) {
    return
  }

  const point = (() => {
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0]
      return touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    return { x: event.clientX, y: event.clientY }
  })()

  if (!point) return

  behaviorCollector.value.recordClick({
    targetX: point.x,
    targetY: point.y,
    clickX: point.x,
    clickY: point.y,
    distance: 0,
    targetSize: 0,
    isHit: false,
  })
}
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




