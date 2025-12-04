<script setup lang="ts">
/**
 * 手勢記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
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
import GameResultScreen from './ui/GameResultScreen.vue'
import GameStatusBar from './ui/GameStatusBar.vue'
import GameFeedback from './ui/GameFeedback.vue'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
}>(), {
  difficulty: 'easy'
})

const emit = defineEmits<{
  'game:start': []
  'game:end': [result: any]
  'score:update': [score: number]
  'state:change': [phase: string]
}>()

// ===== 遊戲配置 =====
const config = computed<GestureMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
  totalRounds: config.value.totalRounds,
})

function startGame() {
  startGameState()
  emit('game:start')
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
    currentShowIndex.value = i
    await delay(showTime)
    currentShowIndex.value = -1
    await delay(300) // 間隔
  }
  
  // 進入輸入階段
  showingPhase.value = 'input'
  roundStartTime = Date.now()
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  setTimeout(() => {
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
  }, 1500)
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
  emit('game:end', result)
}

function handleRestart() {
  resetGame()
  handleStart()
}

function handleQuit() {
  resetGame()
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    resetGame()
  }
})
</script>

<template>
  <div class="gesture-memory-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="手勢記憶"
      icon="👋"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 狀態列 -->
      <GameStatusBar
        :score="score"
        :progress="progress"
        show-score
        show-progress
      />

      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
        </div>
        <div class="flex justify-center gap-4 mt-2 text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">序列長度：</span>
            <span class="font-bold text-blue-500">{{ currentLength }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">連續正確：</span>
            <span class="font-bold text-orange-500">{{ streak }}</span>
          </div>
        </div>
      </div>

      <!-- 顯示區域 -->
      <div class="display-area mt-8">
        <!-- 顯示階段 -->
        <div 
          v-if="showingPhase === 'showing'"
          class="showing-phase text-center"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            記住手勢順序...
          </div>
          <div 
            class="gesture-display text-8xl transition-all duration-200 min-h-32 flex items-center justify-center"
            :class="{ 'opacity-0 scale-50': displayGesture === null, 'opacity-100 scale-110': displayGesture !== null }"
          >
            {{ displayGesture?.icon ?? '' }}
          </div>
          <div class="gesture-name text-xl font-medium mt-2">
            {{ displayGesture?.name ?? '' }}
          </div>
        </div>

        <!-- 輸入階段 -->
        <div 
          v-else-if="showingPhase === 'input'"
          class="input-phase"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            按順序點擊手勢
          </div>
          
          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-2 mb-6 min-h-12">
            <div
              v-for="(gesture, index) in userInput"
              :key="index"
              class="gesture-icon w-10 h-10 flex items-center justify-center text-2xl bg-blue-100 dark:bg-blue-900 rounded-lg"
            >
              {{ gesture.icon }}
            </div>
            <div
              v-for="i in (currentLength - userInput.length)"
              :key="'placeholder-' + i"
              class="gesture-placeholder w-10 h-10 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
            >
              ?
            </div>
          </div>

          <!-- 手勢選擇區 -->
          <div class="gesture-grid grid grid-cols-3 md:grid-cols-4 gap-3 max-w-md mx-auto">
            <button
              v-for="gesture in gesturePool"
              :key="gesture.id"
              class="gesture-btn p-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105 active:scale-95"
              @click="handleGestureClick(gesture)"
            >
              <div class="text-3xl">{{ gesture.icon }}</div>
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
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">正確順序</div>
            <div class="correct-sequence flex justify-center gap-2 mb-4">
              <div
                v-for="(gesture, index) in roundState?.sequence"
                :key="index"
                class="w-10 h-10 flex items-center justify-center text-2xl bg-green-100 dark:bg-green-900 rounded-lg"
              >
                {{ gesture.icon }}
              </div>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">你的順序</div>
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

    <!-- 結果畫面 -->
    <GameResultScreen
      v-else-if="phase === 'finished' || phase === 'result'"
      :score="score"
      :correct-count="correctCount"
      :wrong-count="wrongCount"
      :total-count="config.totalRounds"
      :grade="calculateGrade(correctCount / config.totalRounds * 100) as 'S' | 'A' | 'B' | 'C' | 'D' | 'F'"
      :custom-stats="[
        { label: '正確', value: correctCount, icon: '✅' },
        { label: '最長連續', value: maxStreak, icon: '🔥' },
        { label: '最大長度', value: maxLength, icon: '📏' },
      ]"
      @replay="handleRestart"
      @back="handleQuit"
    />
  </div>
</template>

<style scoped>
.gesture-btn:active {
  transform: scale(0.9);
}
</style>
