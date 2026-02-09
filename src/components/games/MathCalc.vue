<script setup lang="ts">
/**
 * 數學計算遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateAllQuestions,
  validateAnswer,
  calculateQuestionScore,
  summarizeResult,
  MATH_CALC_CONFIGS,
  type MathQuestion,
  type MathCalcConfig
} from '@/games/logic/mathCalc'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'
import GameOptionGrid from './ui/GameOptionGrid.vue'

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
const baseConfig = computed<MathCalcConfig>(() => MATH_CALC_CONFIGS[props.difficulty])
const config = computed<MathCalcConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, clearTimers } = usePauseController(isPaused)

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
  combo,
  maxCombo,
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
  recordAnswer,
  setFeedback,
  clearFeedback,
  resetGame,
  getCurrentReactionTime,
} = useGameState({
  totalRounds: config.value.questionsCount,
  timeLimit: config.value.timeLimit,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 計時器 =====
const {
  time: timeLeft,
  isWarning: timerWarning,
  formattedTime,
  start: startTimer,
  pause: pauseTimer,
  resume: resumeTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'countdown',
  initialTime: config.value.timeLimit,
  warningTime: 10,
  onTimeUp: () => handleTimeUp(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, playCustomSound, preloadDefaultSounds, preloadSounds } = useGameAudio({
  gameFolder: 'math-calc',
  customSounds: [
    { id: 'number-pop', name: 'Number Pop', frequency: 660, duration: 120 },
    { id: 'calculate', name: 'Calculate', frequency: 520, duration: 180 },
  ],
})

// ===== 遊戲資料 =====
const questions = ref<MathQuestion[]>([])
const currentQuestionIndex = ref(0)
const responseTimes = ref<number[]>([])
const isAnswering = ref(false)

const currentQuestion = computed(() => 
  questions.value[currentQuestionIndex.value]
)

// ===== 回饋映射 =====
const feedbackData = computed(() => {
  if (!feedback.value) return undefined
  return {
    type: feedback.value.type,
    show: showFeedback.value,
    message: feedback.value.message,
    score: feedback.value.score,
    combo: feedback.value.combo,
  }
})

// ===== 遊戲說明 =====
const gameInstructions = [
  '觀察數學題目',
  '快速計算出答案',
  '從四個選項中選擇正確答案',
  '答對越快，分數越高',
]

// ===== 遊戲方法 =====
function handleStart() {
  // 生成題目
  questions.value = generateAllQuestions(config.value)
  currentQuestionIndex.value = 0
  responseTimes.value = []
  isAnswering.value = false
  
  // 重置計時器
  resetTimer(config.value.timeLimit)
  
  // 開始遊戲
  startGame()
  startTimer()
  playCustomSound('number-pop')
}

function handleSelectAnswer(answer: number | string) {
  if (!isPlaying.value || isAnswering.value || !currentQuestion.value) return
  
  isAnswering.value = true
  playCustomSound('calculate')
  const answerNum = typeof answer === 'string' ? parseInt(answer, 10) : answer
  const reactionTime = getCurrentReactionTime()
  const isCorrect = validateAnswer(currentQuestion.value, answerNum)
  
  // 計算分數
  const questionScore = calculateQuestionScore(
    isCorrect,
    reactionTime,
    config.value,
    combo.value
  )
  
  // 記錄答案
  recordAnswer(isCorrect, answerNum, currentQuestion.value.answer, questionScore)
  responseTimes.value.push(reactionTime)
  
  // 顯示回饋
  if (isCorrect) {
    playCorrect()
    setFeedback('correct', undefined, questionScore)
  } else {
    playWrong()
    setFeedback('wrong', `正確答案：${currentQuestion.value.answer}`)
  }
  
  // 延遲後進入下一題
  scheduleTimeout(() => {
    clearFeedback()
    isAnswering.value = false
    
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      nextRound()
    } else {
      handleGameEnd()
    }
  }, 1000)
}

function handleTimeUp() {
  handleGameEnd()
}

function handleGameEnd() {
  stopTimer()
  clearTimers()
  playEnd()
  
  const result = summarizeResult(
    score.value,
    correctCount.value,
    wrongCount.value,
    config.value.timeLimit - timeLeft.value,
    responseTimes.value,
    maxCombo.value,
    config.value
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  preloadSounds(['number-pop', 'calculate'])
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: timeLeft.value,
      score: score.value,
      combo: combo.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: true,
      showScore: true,
      showCombo: true,
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
    pauseTimer()
    return
  }

  if (!paused && phase.value === 'paused') {
    resumeGame()
    resumeTimer()
  }
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    clearTimers()
    resetGame()
  }
})

watch(currentQuestionIndex, () => {
  if (isPlaying.value) {
    playCustomSound('number-pop')
  }
})
</script>

<template>
  <div class="math-calc-game game-root game-frame" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="加減乘除"
      icon="🧮"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 題目區域 -->
        <div class="question-area game-panel mt-6 sm:mt-8 text-center px-3 sm:px-4 py-3">
          <div class="question-number game-text-sm text-[var(--color-text-muted)] mb-2 game-number">
            第 {{ currentRound + 1 }} / {{ totalRounds }} 題
          </div>

        <div
          v-if="currentQuestion"
            class="question-display game-text-5xl game-number font-bold py-4 sm:py-6 md:py-8 select-none break-words leading-tight rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]"
            :class="{ 'shake': feedbackData?.type === 'wrong' && feedbackData?.show }"
          >
          {{ currentQuestion.num1 }} {{ currentQuestion.operation }} {{ currentQuestion.num2 }} = ?
        </div>

        <!-- 選項 -->
        <GameOptionGrid
          v-if="currentQuestion"
          :options="currentQuestion.options.map(String)"
          :columns="2"
          :disabled="isAnswering"
          :correct-answer="feedbackData?.show ? String(currentQuestion.answer) : undefined"
          size="large"
          class="game-board mt-4 sm:mt-6"
          @select="(v) => handleSelectAnswer(Number(v))"
        />
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
        :score="feedbackData.score"
        :combo="feedbackData.combo"
      />
    </template>
  </div>
</template>

<style scoped>
.shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@media (prefers-reduced-motion: reduce) {
  .shake {
    animation: none;
  }
}
</style>
