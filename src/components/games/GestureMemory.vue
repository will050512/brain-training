<script setup lang="ts">
/**
 * 手勢記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  getGesturePool,
  createRoundState,
  addUserInput,
  isInputComplete,
  validateAnswer,
  calculateRoundScore,
  getNextLength,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  type Gesture,
  type RoundState,
  type GestureMemoryConfig,
} from '@/games/logic/gestureMemory'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
  subDifficulty?: SubDifficulty
  autoStart?: boolean
  isPaused?: boolean
}>(), {
  difficulty: 'easy',
  subDifficulty: 2,
  autoStart: false,
  isPaused: false,
})

const emit = defineEmits<{
  'game-start': []
  'game-end': [result: any]
  'score-change': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()

// ===== 遊戲配置 =====
const baseConfig = computed<GestureMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<GestureMemoryConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, pauseAwareDelay, waitForResume, clearTimers } = usePauseController(isPaused)

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
  correctCount,
  wrongCount,
  progress,
  feedback,
  showFeedback,
  isPlaying,
  pauseGame,
  resumeGame,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
} = useGameState({
  totalRounds: config.value.totalRounds,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const gesturePool = ref<Gesture[]>([])
const roundState = ref<RoundState | null>(null)
const currentLength = ref(config.value.startLength)
const maxLength = ref(config.value.startLength)
const showingPhase = ref<'showing' | 'input' | 'result'>('showing')
const currentShowIndex = ref(-1)
const streak = ref(0)
const maxStreak = ref(0)
const responseTimes = ref<number[]>([])
let roundStartTime = 0

// ===== 計算屬性 =====
const displayGesture = computed(() => {
  if (showingPhase.value !== 'showing' || !roundState.value) return null
  if (currentShowIndex.value < 0 || currentShowIndex.value >= roundState.value.sequence.length) return null
  return roundState.value.sequence[currentShowIndex.value]
})

const userInput = computed(() => roundState.value?.userInput || [])

// ===== 回饋映射 =====
const feedbackData = computed(() => {
  if (!feedback.value) return undefined
  return {
    type: feedback.value.type,
    show: showFeedback.value,
    message: feedback.value.message,
    score: feedback.value.score,
  }
})

// ===== 遊戲說明 =====
const gameInstructions = [
  '觀察依序出現的手勢圖案',
  '記住手勢出現的順序',
  '按照相同順序點擊對應手勢',
  '連續答對可增加序列長度',
]

// ===== 遊戲方法 =====
function handleStart() {
  gesturePool.value = getGesturePool(config.value.gesturePool)
  currentLength.value = config.value.startLength
  maxLength.value = config.value.startLength
  streak.value = 0
  maxStreak.value = 0
  responseTimes.value = []
  
  startGame()
  startNewRound()
}

function startNewRound() {
  roundState.value = createRoundState(currentLength.value, gesturePool.value)
  showingPhase.value = 'showing'
  currentShowIndex.value = -1
  
  // 開始顯示序列
  showSequence()
}

async function showSequence() {
  if (!roundState.value) return
  
  const showTime = config.value.showTime
  
  for (let i = 0; i < roundState.value.sequence.length; i++) {
    if (phase.value === 'paused') {
      await waitForResume()
    }
    if (phase.value !== 'playing') return

    currentShowIndex.value = i
    await delay(showTime)
    currentShowIndex.value = -1
    await delay(350) // 間隔
  }
  
  // 進入輸入階段
  if (phase.value === 'paused') {
    await waitForResume()
  }
  if (phase.value !== 'playing') return
  showingPhase.value = 'input'
  roundStartTime = Date.now()
}

function delay(ms: number): Promise<void> {
  return pauseAwareDelay(ms)
}

function handleGestureClick(gesture: Gesture) {
  if (!isPlaying.value || showingPhase.value !== 'input' || !roundState.value) return
  
  roundState.value = addUserInput(roundState.value, gesture)
  
  // 檢查是否輸入完成
  if (isInputComplete(roundState.value)) {
    checkAnswer()
  }
}

function checkAnswer() {
  if (!roundState.value) return
  
  showingPhase.value = 'result'
  const isCorrect = validateAnswer(roundState.value)
  const responseTime = Date.now() - roundStartTime
  responseTimes.value.push(responseTime)
  
  if (isCorrect) {
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    const earnedScore = calculateRoundScore(currentLength.value, config.value.startLength, streak.value)
    addScore(earnedScore)
    playCorrect()
    setFeedback('correct', `正確！+${earnedScore}分`, earnedScore)
    
    // 更新最大長度
    if (currentLength.value > maxLength.value) {
      maxLength.value = currentLength.value
    }
    
    // 增加長度
    currentLength.value = getNextLength(currentLength.value, true, streak.value, config.value)
  } else {
    streak.value = 0
    playWrong()
    setFeedback('wrong', '順序錯誤')
    
    // 減少長度
    currentLength.value = getNextLength(currentLength.value, false, streak.value, config.value)
  }
  
  // 延遲後進入下一回合或結束
  scheduleTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      if (isCorrect) {
        // 正確繼續
      } else {
        // 錯誤也繼續，但重置長度
      }
      startNewRound()
    } else {
      handleGameEnd()
    }
  }, 1700)
}

function handleGameEnd() {
  playEnd()
  
  const result = summarizeResult(
    score.value,
    correctCount.value,
    config.value.totalRounds,
    maxStreak.value,
    maxLength.value,
    responseTimes.value
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: false,
      showScore: true,
      showCounts: true,
      showProgress: true
    })
  }
})

onUnmounted(() => {
  cleanupThrottle()
  clearTimers()
})

watch(isPaused, (paused) => {
  if (paused && phase.value === 'playing') {
    pauseGame()
    return
  }

  if (!paused && phase.value === 'paused') {
    resumeGame()
  }
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    clearTimers()
    resetGame()
  }
})
</script>

<template>
  <div class="gesture-memory-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="手勢記憶"
      icon="👋"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
        <div class="game-info game-panel text-center mt-4 px-4 py-3">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)]">
            第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
          </div>
          <div class="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
            <div>
              <span class="text-[var(--color-text-muted)]">序列長度：</span>
              <span class="font-bold text-[var(--color-primary)]">{{ currentLength }}</span>
            </div>
            <div>
              <span class="text-[var(--color-text-muted)]">連續正確：</span>
              <span class="font-bold text-[var(--color-combo)]">{{ streak }}</span>
            </div>
          </div>
        </div>

      <!-- 顯示區域 -->
        <div class="display-area game-panel mt-6 sm:mt-8 px-4 py-4">
        <!-- 顯示階段 -->
        <div
          v-if="showingPhase === 'showing'"
          class="showing-phase text-center"
        >
            <div class="text-xs sm:text-sm text-[var(--color-text-muted)] mb-3 sm:mb-4">
              記住手勢順序...
            </div>
          <div
            class="gesture-display text-6xl sm:text-7xl md:text-8xl transition-all duration-200 min-h-24 sm:min-h-28 md:min-h-32 flex items-center justify-center"
            :class="{ 'opacity-0 scale-50': displayGesture === null, 'opacity-100 scale-110': displayGesture !== null }"
          >
            {{ displayGesture?.icon ?? '' }}
          </div>
          <div class="gesture-name text-lg sm:text-xl font-medium mt-2">
            {{ displayGesture?.name ?? '' }}
          </div>
        </div>

        <!-- 輸入階段 -->
        <div
          v-else-if="showingPhase === 'input'"
          class="input-phase"
        >
            <div class="text-xs sm:text-sm text-[var(--color-text-muted)] text-center mb-3 sm:mb-4">
              按順序點擊手勢
            </div>

          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 min-h-10 sm:min-h-12 flex-wrap">
            <div
              v-for="(gesture, index) in userInput"
              :key="index"
              class="gesture-icon w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-2xl bg-blue-100 dark:bg-blue-900 rounded-lg min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px]"
            >
              {{ gesture.icon }}
            </div>
            <div
              v-for="i in (currentLength - userInput.length)"
              :key="'placeholder-' + i"
              class="gesture-placeholder w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px]"
            >
              ?
            </div>
          </div>

          <!-- 手勢選擇區 -->
          <div class="gesture-grid grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-w-sm sm:max-w-md mx-auto">
            <button
              v-for="gesture in gesturePool"
              :key="gesture.id"
              class="gesture-btn p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 min-h-[60px] sm:min-h-[70px] md:min-h-[80px]"
              @click="handleGestureClick(gesture)"
            >
              <div class="text-2xl sm:text-3xl">{{ gesture.icon }}</div>
              <div class="text-xs mt-1">{{ gesture.name }}</div>
            </button>
          </div>
        </div>

        <!-- 結果階段 -->
        <div 
          v-else-if="showingPhase === 'result'"
          class="result-phase text-center"
        >
          <div class="sequence-compare">
              <div class="text-sm text-[var(--color-text-muted)] mb-2">正確順序</div>
            <div class="correct-sequence flex justify-center gap-2 mb-4">
              <div
                v-for="(gesture, index) in roundState?.sequence"
                :key="index"
                class="w-10 h-10 flex items-center justify-center text-2xl bg-green-100 dark:bg-green-900 rounded-lg"
              >
                {{ gesture.icon }}
              </div>
            </div>
              <div class="text-sm text-[var(--color-text-muted)] mb-2">你的順序</div>
            <div class="user-sequence flex justify-center gap-2">
              <div
                v-for="(gesture, index) in roundState?.userInput"
                :key="index"
                class="w-10 h-10 flex items-center justify-center text-2xl rounded-lg"
                :class="{
                  'bg-green-100 dark:bg-green-900': gesture.id === roundState?.sequence[index]?.id,
                  'bg-red-100 dark:bg-red-900': gesture.id !== roundState?.sequence[index]?.id,
                }"
              >
                {{ gesture.icon }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
        :score="feedbackData.score"
      />
    </template>
  </div>
</template>

<style scoped>
.gesture-btn:active {
  transform: scale(0.9);
}
</style>
