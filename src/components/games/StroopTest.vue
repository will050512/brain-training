<script setup lang="ts">
/**
 * Stroop 測試遊戲（重構版）
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
  generateAllQuestions,
  generateOptions,
  validateAnswer,
  getQuestionPrompt,
  getModeDescription,
  summarizeResult,
  STROOP_CONFIGS,
  COLORS,
  type StroopQuestion,
  type StroopConfig,
  type ColorOption
} from '@/games/logic/stroopTest'

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
const baseConfig = computed<StroopConfig>(() => STROOP_CONFIGS[props.difficulty])
const config = computed<StroopConfig>(() => {
  const adjusted = adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
  return {
    ...adjusted,
    rounds: baseConfig.value.rounds
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
  recordAnswer,
  setFeedback,
  clearFeedback,
  resetGame,
  getCurrentReactionTime,
} = useGameState({
  totalRounds: config.value.rounds,
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
  roundTime,
  formattedRoundTime,
  startRound,
  pauseRound,
  resumeRound,
  stopRound,
  resetRound,
} = useRoundTimer({
  timePerRound: config.value.timePerRound,
  onRoundTimeUp: () => handleRoundTimeout(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, playCustomSound, preloadDefaultSounds, preloadSounds } = useGameAudio({
  gameFolder: 'stroop-test',
  customSounds: [
    { id: 'color-select', name: 'Color Select', frequency: 600, duration: 120 },
  ],
})

// ===== 遊戲資料 =====
const questions = ref<StroopQuestion[]>([])
const currentQuestionIndex = ref(0)
const options = ref<ColorOption[]>([])
const reactionTimes = ref<number[]>([])
const congruentCorrect = ref(0)
const incongruentCorrect = ref(0)
const isAnswering = ref(false)

const currentQuestion = computed(() => 
  questions.value[currentQuestionIndex.value]
)

const questionPrompt = computed(() => 
  currentQuestion.value ? getQuestionPrompt(currentQuestion.value.questionType) : null
)

// ===== 回饋映射 =====
const feedbackData = computed(() => {
  if (!feedback.value) return undefined
  return {
    type: feedback.value.type,
    show: showFeedback.value,
    message: feedback.value.message,
  }
})

// ===== 遊戲說明 =====
const gameInstructions = computed(() => {
  const modeDesc = getModeDescription(config.value.mode)
  return [
    '螢幕會顯示一個有顏色的文字',
    modeDesc,
    '例如：紅色的「藍色」',
    '在時間內做出正確選擇',
  ]
})

// ===== 遊戲方法 =====
function handleStart() {
  // 生成題目
  questions.value = generateAllQuestions(config.value)
  currentQuestionIndex.value = 0
  reactionTimes.value = []
  congruentCorrect.value = 0
  incongruentCorrect.value = 0
  isAnswering.value = false
  
  // 生成選項
  options.value = generateOptions()
  
  // 開始遊戲
  startGame()
  startRound()
}

function handleSelectAnswer(colorName: string) {
  if (!isPlaying.value || isAnswering.value || !currentQuestion.value) return
  
  isAnswering.value = true
  playCustomSound('color-select')
  stopRound()
  
  const reactionTime = getCurrentReactionTime()
  const isCorrect = validateAnswer(currentQuestion.value, colorName)
  
  // 記錄答案
  recordAnswer(isCorrect, colorName, currentQuestion.value.correctAnswer, isCorrect ? 10 : 0)
  reactionTimes.value.push(reactionTime)
  
  // 統計一致/不一致題目正確數
  if (isCorrect) {
    if (currentQuestion.value.isCongruent) {
      congruentCorrect.value++
    } else {
      incongruentCorrect.value++
    }
  }
  
  // 顯示回饋
  if (isCorrect) {
    playCorrect()
    setFeedback('correct', '正確！')
  } else {
    playWrong()
    const correctColor = COLORS.find(c => c.name === currentQuestion.value!.correctAnswer)
    setFeedback('wrong', `正確答案：${correctColor?.label}`)
  }
  
  // 延遲後進入下一題
  scheduleTimeout(() => {
    clearFeedback()
    isAnswering.value = false
    
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      nextRound()
      options.value = generateOptions() // 重新打亂選項
      startRound()
    } else {
      handleGameEnd()
    }
  }, 1000)
}

function handleRoundTimeout() {
  if (!currentQuestion.value) return
  
  // 超時視為答錯
  recordAnswer(false, null, currentQuestion.value.correctAnswer, 0)
  reactionTimes.value.push(config.value.timePerRound * 1000)
  
  playWrong()
  const correctColor = COLORS.find(c => c.name === currentQuestion.value!.correctAnswer)
  setFeedback('wrong', `時間到！正確答案：${correctColor?.label}`)
  
  scheduleTimeout(() => {
    clearFeedback()
    
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      nextRound()
      options.value = generateOptions()
      startRound()
    } else {
      handleGameEnd()
    }
  }, 1200)
}

function handleGameEnd() {
  stopRound()
  clearTimers()
  playEnd()
  
  const result = summarizeResult(
    correctCount.value,
    correctCount.value + wrongCount.value,
    reactionTimes.value,
    config.value,
    congruentCorrect.value,
    incongruentCorrect.value
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  preloadSounds(['color-select'])
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: roundTime.value,
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

// 監聯難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    stopRound()
    clearTimers()
    resetGame()
  }
})
</script>

<template>
  <div class="stroop-test-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="Stroop測試"
      icon="🎨"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 題目區域 -->
      <div class="question-area game-panel stroop-panel mt-6 sm:mt-8 text-center px-3 sm:px-4">
        <div class="question-number text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 題
        </div>

        <!-- 題目提示 -->
        <div
          v-if="questionPrompt"
          class="question-prompt mb-3 sm:mb-4 p-2 rounded-lg bg-[var(--color-bg-soft)] inline-block border border-[var(--color-border)]"
        >
          <span class="text-base sm:text-lg mr-2">{{ questionPrompt.icon }}</span>
          <span class="text-xs sm:text-sm font-medium">{{ questionPrompt.text }}</span>
        </div>

        <!-- Stroop 文字顯示 -->
        <div
          v-if="currentQuestion"
          class="stroop-display py-4 sm:py-6 md:py-8"
        >
          <div
            class="stroop-word text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold select-none p-3 sm:p-4 rounded-xl inline-block break-words leading-tight"
            :style="{
              color: currentQuestion.inkColor,
              borderColor: currentQuestion.borderColor,
              borderWidth: '3px',
              borderStyle: 'solid'
            }"
          >
            {{ currentQuestion.word }}
          </div>
        </div>

        <!-- 顏色選項 -->
        <div class="color-options grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 max-w-sm sm:max-w-md mx-auto">
          <button
            v-for="option in options"
            :key="option.name"
            class="color-option p-3 sm:p-4 md:p-5 rounded-xl text-white font-bold text-base sm:text-lg md:text-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] sm:min-h-[70px] md:min-h-[80px] flex items-center justify-center"
            :style="{ backgroundColor: option.value }"
            :disabled="isAnswering"
            @click="handleSelectAnswer(option.name)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
      />
    </template>
  </div>
</template>

<style scoped>
.stroop-word {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 2px 6px rgba(15, 23, 42, 0.08);
}

.color-option {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(6px);
}

.color-option:hover:not(:disabled) {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.game-panel.stroop-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: 1.25rem;
  padding-top: 1rem;
  padding-bottom: 1.25rem;
  box-shadow: var(--shadow-md);
}

@media (prefers-reduced-motion: reduce) {
  .color-option {
    transition: none;
  }
}
</style>
