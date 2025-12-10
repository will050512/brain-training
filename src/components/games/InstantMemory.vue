<script setup lang="ts">
/**
 * 瞬間記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
import {
  createRoundState,
  addUserInput,
  removeLastInput,
  isInputComplete,
  validateAnswer,
  calculateRoundScore,
  getNextLength,
  getDigitShowTime,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  type RoundState,
  type InstantMemoryConfig,
} from '@/games/logic/instantMemory'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
}>(), {
  difficulty: 'easy'
})

const emit = defineEmits<{
  'game-start': []
  'game-end': [result: any]
  'score-update': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)

// ===== 遊戲配置 =====
const config = computed<InstantMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
  recordAnswer,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
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

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const roundState = ref<RoundState | null>(null)
const currentLength = ref(config.value.startLength)
const maxReached = ref(config.value.startLength)
const showingPhase = ref<'showing' | 'input' | 'result'>('showing')
const currentShowIndex = ref(-1)
const startTime = ref(0)

// ===== 計算屬性 =====
const displayDigit = computed(() => {
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
  '觀察螢幕上閃現的數字',
  '記住數字出現的順序',
  '使用數字鍵盤依序輸入',
  '答對會增加數字長度',
]

// ===== 遊戲方法 =====
function handleStart() {
  currentLength.value = config.value.startLength
  maxReached.value = config.value.startLength
  startTime.value = Date.now()
  
  startGame()
  startNewRound()
}

function startNewRound() {
  roundState.value = createRoundState(currentLength.value)
  showingPhase.value = 'showing'
  currentShowIndex.value = -1
  
  // 開始顯示序列
  showSequence()
}

async function showSequence() {
  if (!roundState.value) return
  
  const showTime = getDigitShowTime(config.value, roundState.value.sequence.length)
  
  for (let i = 0; i < roundState.value.sequence.length; i++) {
    currentShowIndex.value = i
    await delay(showTime)
    currentShowIndex.value = -1
    await delay(200) // 間隔
  }
  
  // 進入輸入階段
  showingPhase.value = 'input'
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function handleNumberInput(digit: number) {
  if (!isPlaying.value || showingPhase.value !== 'input' || !roundState.value) return
  
  roundState.value = addUserInput(roundState.value, digit)
  
  // 檢查是否輸入完成
  if (isInputComplete(roundState.value)) {
    checkAnswer()
  }
}

function handleDelete() {
  if (!isPlaying.value || showingPhase.value !== 'input' || !roundState.value) return
  if (roundState.value.userInput.length === 0) return
  
  roundState.value = removeLastInput(roundState.value)
}

function checkAnswer() {
  if (!roundState.value) return
  
  showingPhase.value = 'result'
  const isCorrect = validateAnswer(roundState.value)
  const earnedScore = calculateRoundScore(config.value, currentLength.value, isCorrect)
  
  recordAnswer(
    isCorrect,
    roundState.value.userInput.join(''),
    roundState.value.sequence.join(''),
    earnedScore
  )
  
  if (isCorrect) {
    playCorrect()
    addScore(earnedScore)
    setFeedback('correct', `正確！+${earnedScore}分`, earnedScore)
    
    // 更新最大長度
    if (currentLength.value > maxReached.value) {
      maxReached.value = currentLength.value
    }
    
    // 增加長度
    currentLength.value = getNextLength(currentLength.value, true, config.value)
  } else {
    playWrong()
    setFeedback('wrong', `正確答案：${roundState.value.sequence.join('')}`)
    
    // 減少長度
    currentLength.value = getNextLength(currentLength.value, false, config.value)
  }
  
  // 延遲後進入下一回合或結束
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      startNewRound()
    } else {
      handleGameEnd()
    }
  }, 1500)
}

function handleGameEnd() {
  playEnd()
  
  const result = summarizeResult(
    score.value,
    correctCount.value,
    wrongCount.value,
    maxReached.value,
    startTime.value,
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
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    resetGame()
  }
})
</script>

<template>
  <div class="instant-memory-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="瞬間記憶"
      icon="🧠"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
        </div>
        <div class="text-sm mt-1">
          <span class="text-gray-500 dark:text-gray-400">序列長度：</span>
          <span class="font-bold text-blue-500">{{ currentLength }}</span>
        </div>
      </div>

      <!-- 顯示區域 -->
      <div class="display-area mt-8">
        <!-- 顯示階段：顯示數字 -->
        <div 
          v-if="showingPhase === 'showing'"
          class="showing-phase text-center"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            記住這些數字...
          </div>
          <div 
            class="digit-display text-8xl font-bold transition-all duration-200"
            :class="{ 'opacity-0': displayDigit === null, 'opacity-100 scale-110': displayDigit !== null }"
          >
            {{ displayDigit ?? '' }}
          </div>
        </div>

        <!-- 輸入階段 -->
        <div 
          v-else-if="showingPhase === 'input'"
          class="input-phase"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            輸入剛才看到的數字
          </div>
          
          <!-- 輸入顯示 -->
          <div class="input-display flex justify-center gap-2 mb-6 min-h-16">
            <div
              v-for="(digit, index) in userInput"
              :key="index"
              class="digit-box w-12 h-12 flex items-center justify-center text-2xl font-bold bg-blue-100 dark:bg-blue-900 rounded-lg"
            >
              {{ digit }}
            </div>
            <div
              v-for="i in (currentLength - userInput.length)"
              :key="'placeholder-' + i"
              class="digit-box w-12 h-12 flex items-center justify-center text-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
            >
              _
            </div>
          </div>

          <!-- 數字鍵盤 -->
          <div class="number-pad grid grid-cols-3 gap-2 max-w-xs mx-auto">
            <button
              v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
              :key="num"
              class="number-btn w-16 h-16 text-2xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-blue-500 hover:text-white transition-colors"
              :class="{ 'col-start-2': num === 0 }"
              @click="handleNumberInput(num)"
            >
              {{ num }}
            </button>
            <button
              class="delete-btn w-16 h-16 text-xl bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
              @click="handleDelete"
            >
              ⌫
            </button>
          </div>
        </div>

        <!-- 結果階段 -->
        <div 
          v-else-if="showingPhase === 'result'"
          class="result-phase text-center"
        >
          <div class="sequence-compare">
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">正確答案</div>
            <div class="correct-sequence flex justify-center gap-2 mb-4">
              <div
                v-for="(digit, index) in roundState?.sequence"
                :key="index"
                class="w-10 h-10 flex items-center justify-center text-xl font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg"
              >
                {{ digit }}
              </div>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">你的答案</div>
            <div class="user-sequence flex justify-center gap-2">
              <div
                v-for="(digit, index) in roundState?.userInput"
                :key="index"
                class="w-10 h-10 flex items-center justify-center text-xl font-bold rounded-lg"
                :class="{
                  'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300': digit === roundState?.sequence[index],
                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300': digit !== roundState?.sequence[index],
                }"
              >
                {{ digit }}
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
.number-pad {
  display: grid;
  justify-items: center;
}

.number-btn:active,
.delete-btn:active {
  transform: scale(0.95);
}
</style>
