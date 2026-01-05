<script setup lang="ts">
/**
 * 圖形推理遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useRoundTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
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

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
}>(), {
  difficulty: 'easy'
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

// ===== 遊戲配置 =====
const config = computed<PatternReasoningConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
  
  startGame()
  
  // 生成第一題
  generateNewQuestion()
}

function generateNewQuestion() {
  // 隨機選擇題目類型
  const types = config.value.patternTypes
  const type = types[currentRound.value % types.length] as PatternType
  
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
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNewQuestion()
    } else {
      handleGameEnd()
    }
  }, 1500)
}

function handleRoundTimeout() {
  if (isAnswerLocked.value) return
  
  isAnswerLocked.value = true
  responseTimes.value.push(config.value.timePerQuestion)
  answerRecords.value.push(false)
  streak.value = 0
  
  playWrong()
  setFeedback('timeout', '時間到！')
  
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNewQuestion()
    } else {
      handleGameEnd()
    }
  }, 1500)
}

function handleGameEnd() {
  stopRound()
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
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopRound()
    resetGame()
  }
})
</script>

<template>
  <div class="pattern-reasoning-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="圖形推理"
      icon="🔷"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">

      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4 px-4">
        <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 題
        </div>
        <div class="flex justify-center gap-4 mt-2 text-xs sm:text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">連續正確：</span>
            <span class="font-bold text-orange-500">{{ streak }}</span>
          </div>
        </div>
      </div>

      <!-- 序列顯示區 -->
      <div class="sequence-area mt-6 sm:mt-8 px-4">
        <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mb-3 sm:mb-4">
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
            {{ item.shape }}
          </div>

          <!-- 問號位置 -->
          <div class="question-mark w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold bg-blue-100 dark:bg-blue-900 rounded-lg border-2 border-dashed border-blue-400 min-h-[48px] min-w-[48px] sm:min-h-[56px] sm:min-w-[56px]">
            ?
          </div>
        </div>
      </div>

      <!-- 選項區 -->
      <div class="options-area mt-6 sm:mt-8 px-4">
        <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mb-3 sm:mb-4">
          選擇答案
        </div>

        <div class="options-grid grid gap-2 sm:gap-3" :class="{
          'grid-cols-3': config.optionCount === 3,
          'grid-cols-4': config.optionCount === 4,
          'grid-cols-5': config.optionCount === 5,
        }">
          <button
            v-for="(opt, idx) in options"
            :key="opt.id"
            class="option-btn p-3 sm:p-4 rounded-xl flex items-center justify-center transition-all transform hover:scale-105 min-h-[60px] sm:min-h-[70px] md:min-h-[80px]"
            :class="{
              'bg-gray-100 dark:bg-gray-700': !isAnswerLocked,
              'bg-green-500': isAnswerLocked && idx === currentQuestion?.correctIndex,
              'bg-red-500': isAnswerLocked && idx === selectedAnswer && idx !== currentQuestion?.correctIndex,
              'opacity-50': isAnswerLocked && idx !== currentQuestion?.correctIndex && idx !== selectedAnswer,
              'ring-2 ring-blue-500': selectedAnswer === idx && !isAnswerLocked,
            }"
            :disabled="isAnswerLocked"
            @click="handleOptionSelect({ id: opt.id, value: opt.value })"
          >
            <span :style="opt.style">{{ opt.label }}</span>
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

.option-btn:active:not(:disabled) {
  transform: scale(0.95);
}
</style>
