<script setup lang="ts">
/**
 * 找不同遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useRoundTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
import {
  generateRound,
  processClick,
  isRoundComplete,
  summarizeResult,
  calculateGrade,
  DIFFICULTY_CONFIGS,
  type RoundData,
  type SpotDifferenceConfig,
} from '@/games/logic/spotDifference'

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
const config = computed<SpotDifferenceConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
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
  startRound,
  stopRound,
  resetRound,
} = useRoundTimer({
  timePerRound: config.value.timePerRound,
  onRoundTimeUp: () => handleRoundTimeout(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const currentRoundData = ref<RoundData | null>(null)
const foundDifferences = ref<number[]>([])
const wrongClicks = ref(0)
const totalFound = ref(0)
const foundTimes = ref<number[]>([])
const hintsUsed = ref(0)
let roundStartTime = 0

// ===== 計算屬性 =====
const gridSize = computed(() => config.value.gridSize)
const diffCount = computed(() => config.value.diffCount)

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
const gameInstructions = [
  '觀察左右兩張圖片',
  '點擊右圖中與左圖不同的位置',
  '找出所有不同點即可過關',
  '可使用提示功能，但次數有限',
]

// ===== 遊戲方法 =====
function handleStart() {
  foundDifferences.value = []
  wrongClicks.value = 0
  totalFound.value = 0
  foundTimes.value = []
  hintsUsed.value = 0
  
  startGame()
  generateNextRound()
}

function generateNextRound() {
  currentRoundData.value = generateRound(config.value)
  foundDifferences.value = []
  roundStartTime = Date.now()
  startRound()
}

function handleCellClick(index: number) {
  if (!isPlaying.value || !currentRoundData.value) return
  
  const result = processClick(
    index,
    currentRoundData.value.differences,
    foundDifferences.value
  )
  
  if (result.isNewFind) {
    foundDifferences.value = [...foundDifferences.value, index]
    totalFound.value++
    foundTimes.value.push(Date.now() - roundStartTime)
    
    playCorrect()
    addScore(10)
    setFeedback('correct', '找到了！')
    
    setTimeout(() => clearFeedback(), 500)
    
    // 檢查是否完成回合
    if (isRoundComplete(foundDifferences.value.length, diffCount.value)) {
      handleRoundComplete()
    }
  } else if (!result.isCorrect) {
    wrongClicks.value++
    playWrong()
    setFeedback('wrong', '這裡沒有不同')
    setTimeout(() => clearFeedback(), 500)
  }
}

function handleRoundComplete() {
  stopRound()
  
  setTimeout(() => {
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNextRound()
    } else {
      handleGameEnd()
    }
  }, 800)
}

function handleRoundTimeout() {
  // 超時，進入下一回合
  setTimeout(() => {
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNextRound()
    } else {
      handleGameEnd()
    }
  }, 500)
}

function handleUseHint() {
  if (!isPlaying.value || !currentRoundData.value) return
  if (hintsUsed.value >= config.value.maxHints) return
  
  // 找出尚未發現的不同點
  const unfound = currentRoundData.value.differences.filter(
    d => !foundDifferences.value.includes(d)
  )
  
  if (unfound.length > 0) {
    hintsUsed.value++
    // 顯示提示（閃爍效果由模板處理）
    const hintIndex = unfound[0]!
    setFeedback('correct', `提示：注意位置 ${hintIndex + 1}`)
    setTimeout(() => clearFeedback(), 2000)
  }
}

function handleGameEnd() {
  stopRound()
  playEnd()
  
  const result = summarizeResult(
    totalFound.value,
    config.value.rounds,
    config.value.diffCount,
    wrongClicks.value,
    foundTimes.value,
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
      timeLeft: roundTime.value,
      score: score.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: true,
      showScore: true,
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
  <div class="spot-difference-game w-full max-w-4xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="找不同"
      icon="🔍"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
      <div class="game-info flex justify-between items-center mt-4 px-2">
        <div class="text-sm">
          <span class="text-gray-500 dark:text-gray-400">第</span>
          <span class="font-bold mx-1">{{ currentRound + 1 }} / {{ totalRounds }}</span>
          <span class="text-gray-500 dark:text-gray-400">回合</span>
        </div>
        <div class="text-sm">
          <span class="text-gray-500 dark:text-gray-400">找到：</span>
          <span class="font-bold text-green-500">{{ foundDifferences.length }}</span>
          <span class="text-gray-500 dark:text-gray-400"> / {{ diffCount }}</span>
        </div>
        <button
          v-if="config.maxHints > 0"
          class="hint-btn text-sm px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
          :disabled="hintsUsed >= config.maxHints"
          @click="handleUseHint"
        >
          💡 提示 ({{ config.maxHints - hintsUsed }})
        </button>
      </div>

      <!-- 圖片對比區域 -->
      <div 
        class="comparison-area mt-6 grid grid-cols-2 gap-4"
        v-if="currentRoundData"
      >
        <!-- 原圖（左邊） -->
        <div class="image-container">
          <div class="label text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            原圖
          </div>
          <div 
            class="image-grid"
            :style="{ 
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
            }"
          >
            <div
              v-for="(emoji, index) in currentRoundData.originalGrid"
              :key="`original-${index}`"
              class="grid-cell aspect-square flex items-center justify-center text-2xl md:text-3xl bg-gray-100 dark:bg-gray-700 rounded"
            >
              {{ emoji }}
            </div>
          </div>
        </div>

        <!-- 比對圖（右邊，可點擊） -->
        <div class="image-container">
          <div class="label text-center text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            找出不同（點擊此處）
          </div>
          <div 
            class="image-grid"
            :style="{ 
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
            }"
          >
            <button
              v-for="(emoji, index) in currentRoundData.compareGrid"
              :key="`compare-${index}`"
              class="grid-cell aspect-square flex items-center justify-center text-2xl md:text-3xl rounded cursor-pointer transition-all"
              :class="{
                'bg-green-200 dark:bg-green-800 ring-2 ring-green-500': foundDifferences.includes(index),
                'bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900': !foundDifferences.includes(index),
              }"
              :disabled="foundDifferences.includes(index)"
              @click="handleCellClick(index)"
            >
              {{ emoji }}
            </button>
          </div>
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
.image-grid {
  display: grid;
  gap: 4px;
}

.grid-cell {
  min-width: 30px;
  min-height: 30px;
}

.hint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
