<script setup lang="ts">
/**
 * 圖形推理遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useRoundTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateQuestion,
  checkAnswer,
  calculateScore,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  type PatternQuestion,
  type PatternReasoningConfig,
  type PatternType,
} from '@/games/logic/patternReasoning'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'
import GameOptionGrid from './ui/GameOptionGrid.vue'

import circleRed from '@/assets/images/pattern-reasoning/shapes/circle-red.svg'
import circleGreen from '@/assets/images/pattern-reasoning/shapes/circle-green.svg'
import circleBlue from '@/assets/images/pattern-reasoning/shapes/circle-blue.svg'
import squareRed from '@/assets/images/pattern-reasoning/shapes/square-red.svg'
import squareGreen from '@/assets/images/pattern-reasoning/shapes/square-green.svg'
import squareBlue from '@/assets/images/pattern-reasoning/shapes/square-blue.svg'
import triangleRed from '@/assets/images/pattern-reasoning/shapes/triangle-red.svg'
import triangleGreen from '@/assets/images/pattern-reasoning/shapes/triangle-green.svg'
import triangleBlue from '@/assets/images/pattern-reasoning/shapes/triangle-blue.svg'

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

const SHAPE_ASSETS: Record<string, Record<string, string>> = {
  circle: { red: circleRed, green: circleGreen, blue: circleBlue },
  square: { red: squareRed, green: squareGreen, blue: squareBlue },
  triangle: { red: triangleRed, green: triangleGreen, blue: triangleBlue },
}

const COLOR_KEY_MAP: Record<string, 'red' | 'green' | 'blue'> = {
  '#E53E3E': 'red',
  '#38A169': 'green',
  '#3182CE': 'blue',
}

function normalizeShape(shape: string): string | null {
  if (shape === '●' || shape === '○') return 'circle'
  if (shape === '■' || shape === '□') return 'square'
  if (shape === '▲' || shape === '△') return 'triangle'
  return null
}

function normalizeColorKey(color: string): 'red' | 'green' | 'blue' | null {
  return COLOR_KEY_MAP[color] ?? null
}

function getShapeAsset(shape: string, color: string): string | null {
  const key = normalizeShape(shape)
  if (!key) return null
  const colorKey = normalizeColorKey(color)
  if (!colorKey) return null
  return SHAPE_ASSETS[key]?.[colorKey] ?? null
}

// ===== 遊戲配置 =====
const baseConfig = computed<PatternReasoningConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<PatternReasoningConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})
const isHardMode = computed(() => props.difficulty === 'hard')
const optionGridStyle = computed(() => {
  const count = config.value.optionCount
  if (isHardMode.value && count >= 6) {
    return {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    }
  }
  return {
    gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
  }
})
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, clearTimers } = usePauseController(isPaused)

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
  totalRounds: config.value.totalQuestions,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 回合計時器 =====
const {
  roundTime: timeRemaining,
  startRound,
  pauseRound,
  resumeRound,
  stopRound,
  resetRound,
} = useRoundTimer({
  timePerRound: config.value.timePerQuestion,
  onRoundTimeUp: () => handleRoundTimeout(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const currentQuestion = ref<PatternQuestion | null>(null)
const selectedAnswer = ref<number | null>(null)
const isAnswerLocked = ref(false)
const streak = ref(0)
const maxStreak = ref(0)
const responseTimes = ref<number[]>([])
const answerRecords = ref<boolean[]>([])
const allQuestions = ref<PatternQuestion[]>([])
const lastPatternType = ref<PatternType | null>(null)
let roundStartTime = 0

// ===== 計算屬性 =====
const sequenceItems = computed(() => currentQuestion.value?.sequence || [])
const options = computed(() => {
  if (!currentQuestion.value) return []
  return currentQuestion.value.options.map((opt, idx) => ({
    id: String(idx),
    label: opt.shape,
    value: idx,
    disabled: isAnswerLocked.value,
    variant: getOptionVariant(idx) as 'default' | 'correct' | 'wrong' | 'selected',
    asset: getShapeAsset(opt.shape, opt.color),
    style: {
      color: opt.color,
      fontSize: opt.size === 'large' ? '2rem' : opt.size === 'medium' ? '1.5rem' : '1rem',
      transform: `rotate(${opt.rotation}deg)`,
    },
  }))
})

function getOptionVariant(idx: number): string {
  if (!isAnswerLocked.value) {
    return selectedAnswer.value === idx ? 'selected' : 'default'
  }
  if (idx === currentQuestion.value?.correctIndex) return 'correct'
  if (idx === selectedAnswer.value) return 'wrong'
  return 'default'
}

const instruction = computed(() => currentQuestion.value?.instruction || '請選擇下一個圖案')

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
  '觀察圖形序列的規律',
  '找出下一個應該出現的圖形',
  '在時間內選擇正確答案',
  '連續答對獲得加分獎勵',
]

// ===== 遊戲方法 =====
function handleStart() {
  streak.value = 0
  maxStreak.value = 0
  responseTimes.value = []
  answerRecords.value = []
  allQuestions.value = []
  lastPatternType.value = null
  
  startGame()
  
  // 生成第一題
  generateNewQuestion()
}

function pickPatternType(types: PatternType[]): PatternType {
  if (types.length === 0) return 'sequence'
  if (types.length === 1) {
    lastPatternType.value = types[0]!
    return types[0]!
  }
  const candidates = types.filter(type => type !== lastPatternType.value)
  const pool = candidates.length > 0 ? candidates : types
  const picked = pool[Math.floor(Math.random() * pool.length)] || types[0]!
  lastPatternType.value = picked
  return picked
}

function generateNewQuestion() {
  // 隨機選擇題目類型
  const types = config.value.patternTypes
  const type = pickPatternType(types)
  
  currentQuestion.value = generateQuestion(type, config.value.optionCount)
  allQuestions.value.push(currentQuestion.value)
  selectedAnswer.value = null
  isAnswerLocked.value = false
  roundStartTime = Date.now()
  
  // 開始回合計時
  resetRound()
  startRound()
}

function handleOptionSelect(option: { id: string; value: number }) {
  if (!isPlaying.value || isAnswerLocked.value || !currentQuestion.value) return
  
  selectedAnswer.value = option.value
  isAnswerLocked.value = true
  stopRound()
  
  const responseTime = (Date.now() - roundStartTime) / 1000
  responseTimes.value.push(responseTime)
  
  const isCorrect = checkAnswer(currentQuestion.value, option.value)
  answerRecords.value.push(isCorrect)
  
  if (isCorrect) {
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    const earnedScore = 10 + Math.max(0, Math.floor((config.value.timePerQuestion - responseTime) * 2))
    addScore(earnedScore)
    playCorrect()
    setFeedback('correct', `正確！+${earnedScore}分`, earnedScore)
  } else {
    streak.value = 0
    playWrong()
    setFeedback('wrong', '答錯了')
  }
  
  // 延遲後進入下一回合
  scheduleTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNewQuestion()
    } else {
      handleGameEnd()
    }
  }, 1700)
}

function handleRoundTimeout() {
  if (isAnswerLocked.value) return
  
  isAnswerLocked.value = true
  responseTimes.value.push(config.value.timePerQuestion)
  answerRecords.value.push(false)
  streak.value = 0
  
  playWrong()
  setFeedback('timeout', '時間到！')
  
  scheduleTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNewQuestion()
    } else {
      handleGameEnd()
    }
  }, 1700)
}

function handleGameEnd() {
  stopRound()
  clearTimers()
  playEnd()
  
  const avgTime = responseTimes.value.length > 0
    ? responseTimes.value.reduce((a, b) => a + b, 0) / responseTimes.value.length
    : 0
  
  const result = summarizeResult(
    allQuestions.value,
    answerRecords.value,
    responseTimes.value,
    config.value
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
      timeLeft: timeRemaining.value,
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: true,
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
    pauseRound()
    return
  }

  if (!paused && phase.value === 'paused') {
    resumeGame()
    resumeRound()
  }
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    stopRound()
    clearTimers()
    resetGame()
  }
})
</script>

<template>
  <div class="pattern-reasoning-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="圖形推理"
      icon="🔷"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">

      <!-- 遊戲資訊 -->
        <div class="game-info game-panel text-center mt-4 px-4 py-3">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)]">
            第 {{ currentRound + 1 }} / {{ totalRounds }} 題
          </div>
          <div class="flex justify-center gap-4 mt-2 text-xs sm:text-sm">
            <div>
              <span class="text-[var(--color-text-muted)]">連續正確：</span>
              <span class="font-bold text-[var(--color-combo)]">{{ streak }}</span>
            </div>
          </div>
        </div>

      <!-- 序列顯示區 -->
        <div class="sequence-area game-panel mt-6 sm:mt-8 px-4 py-4">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)] text-center mb-3 sm:mb-4">
            {{ instruction }}
          </div>

        <div class="sequence-display flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <div
            v-for="(item, index) in sequenceItems"
            :key="index"
            class="sequence-item w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg min-h-[48px] min-w-[48px] sm:min-h-[56px] sm:min-w-[56px]"
            :style="{
              color: item.color,
              fontSize: item.size === 'large' ? '2rem' : item.size === 'medium' ? '1.5rem' : '1.25rem',
              transform: `rotate(${item.rotation}deg)`,
            }"
          >
            <img
              v-if="getShapeAsset(item.shape, item.color)"
              class="shape-img"
              :src="getShapeAsset(item.shape, item.color)!"
              alt=""
              aria-hidden="true"
            />
            <span v-else>{{ item.shape }}</span>
          </div>

          <!-- 問號位置 -->
          <div class="question-mark w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold bg-blue-100 dark:bg-blue-900 rounded-lg border-2 border-dashed border-blue-400 min-h-[48px] min-w-[48px] sm:min-h-[56px] sm:min-w-[56px]">
            ?
          </div>
        </div>
      </div>

      <!-- 選項區 -->
        <div class="options-area game-panel mt-6 sm:mt-8 px-4 py-4">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)] text-center mb-3 sm:mb-4">
            選擇答案
          </div>

        <div
          class="options-grid grid gap-2 sm:gap-3"
          :class="{ 'options-grid-hard': isHardMode }"
          :style="optionGridStyle"
        >
          <button
            v-for="(opt, idx) in options"
            :key="opt.id"
            class="option-btn p-3 sm:p-4 rounded-xl flex items-center justify-center transition-all transform min-h-[60px] sm:min-h-[70px] md:min-h-[80px]"
            :class="[
              isHardMode ? 'option-btn-hard' : 'enabled:hover:scale-105',
              {
                'bg-gray-100 dark:bg-gray-700': !isAnswerLocked,
                'bg-green-500': isAnswerLocked && idx === currentQuestion?.correctIndex,
                'bg-red-500': isAnswerLocked && idx === selectedAnswer && idx !== currentQuestion?.correctIndex,
                'opacity-50': isAnswerLocked && idx !== currentQuestion?.correctIndex && idx !== selectedAnswer,
                'ring-2 ring-blue-500': selectedAnswer === idx && !isAnswerLocked,
              }
            ]"
            :disabled="isAnswerLocked"
            @click="handleOptionSelect({ id: opt.id, value: opt.value })"
          >
            <img
              v-if="opt.asset"
              class="shape-img"
              :style="opt.style"
              :src="opt.asset"
              alt=""
              aria-hidden="true"
            />
            <span v-else :style="opt.style">{{ opt.label }}</span>
          </button>
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
.sequence-item {
  transition: transform 0.2s ease;
}

.sequence-item:hover {
  transform: scale(1.05);
}

.shape-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.option-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.option-btn-hard {
  width: 100%;
  min-height: clamp(72px, 18vw, 110px);
  padding: 0.5rem;
}

.option-btn-hard:active:not(:disabled) {
  transform: scale(0.98);
}

.options-grid-hard {
  max-width: 520px;
  margin: 0 auto;
}

.is-landscape .options-grid {
  gap: 0.35rem;
}
</style>
