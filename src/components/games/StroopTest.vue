<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-gray-600">快速說出文字的「顏色」，而非文字本身！</p>
      <p class="text-sm text-gray-500">例如：<span class="text-red-500 font-bold">藍色</span> → 答案是「紅色」</p>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-gray-500">第</span>
        <span class="font-bold text-blue-600">{{ currentRound }}/{{ totalRounds }}</span>
        <span class="text-gray-500">題</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">正確：</span>
        <span class="font-bold text-green-500">{{ correctCount }}</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">剩餘：</span>
        <span class="font-bold">{{ remainingTime }}秒</span>
      </div>
    </div>

    <!-- Stroop 測試區 -->
    <div v-if="isPlaying" class="stroop-area">
      <!-- 顯示文字 -->
      <div class="stroop-word mb-8">
        <span 
          class="text-6xl md:text-7xl font-bold"
          :style="{ color: currentColor }"
        >
          {{ currentWord }}
        </span>
      </div>

      <!-- 選項按鈕 -->
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          v-for="option in options"
          :key="option.name"
          class="btn btn-lg py-6 text-xl font-bold transition-all"
          :class="getButtonClass(option)"
          :disabled="showResult"
          @click="selectAnswer(option.name)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- 結果提示 -->
      <transition name="fade">
        <div v-if="showResult" class="mt-6 text-center">
          <span class="text-5xl">{{ isCorrect ? '✅' : '❌' }}</span>
        </div>
      </transition>
    </div>

    <!-- 開始按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🎨
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { Difficulty, GameResult } from '@/types/game'

// Props
const props = defineProps<{
  difficulty: Difficulty
  settings: Record<string, number | string | boolean>
}>()

// Emits
const emit = defineEmits<{
  'score-change': [score: number]
  'game-end': [result: GameResult]
}>()

// 顏色定義
interface ColorOption {
  name: string
  label: string
  value: string
}

const colors: ColorOption[] = [
  { name: 'red', label: '紅色', value: '#ef4444' },
  { name: 'blue', label: '藍色', value: '#3b82f6' },
  { name: 'green', label: '綠色', value: '#22c55e' },
  { name: 'yellow', label: '黃色', value: '#eab308' },
]

// 難度設定
const difficultyConfig = computed(() => {
  const defaults = {
    easy: { rounds: 10, timePerRound: 8, congruentChance: 0.5 },
    medium: { rounds: 15, timePerRound: 6, congruentChance: 0.3 },
    hard: { rounds: 20, timePerRound: 4, congruentChance: 0.2 },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 遊戲狀態
const isPlaying = ref(false)
const isFinished = ref(false)
const currentRound = ref(0)
const totalRounds = computed(() => difficultyConfig.value.rounds)
const correctCount = ref(0)
const remainingTime = ref(0)

const currentWord = ref('')
const currentColor = ref('')
const correctAnswer = ref('')
const selectedAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(false)

const options = ref<ColorOption[]>([])
const reactionTimes = ref<number[]>([])
let roundStartTime = 0

// 計時器
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 生成題目
function generateRound(): void {
  const config = difficultyConfig.value
  
  // 決定是否一致（文字和顏色相同）
  const isCongruent = Math.random() < config.congruentChance

  // 隨機選擇顏色
  const shuffledColors = [...colors].sort(() => Math.random() - 0.5)
  const wordColor = shuffledColors[0]
  const inkColor = isCongruent ? wordColor : shuffledColors[1]

  if (!wordColor || !inkColor) return

  currentWord.value = wordColor.label
  currentColor.value = inkColor.value
  correctAnswer.value = inkColor.name

  // 生成選項（打亂順序）
  options.value = [...colors].sort(() => Math.random() - 0.5)

  selectedAnswer.value = ''
  showResult.value = false
  remainingTime.value = config.timePerRound
  roundStartTime = Date.now()
}

// 獲取按鈕樣式
function getButtonClass(option: ColorOption): string {
  if (!showResult.value) {
    return 'bg-gray-100 hover:bg-gray-200 text-gray-800'
  }
  
  if (option.name === correctAnswer.value) {
    return 'bg-green-500 text-white'
  }
  
  if (option.name === selectedAnswer.value && !isCorrect.value) {
    return 'bg-red-500 text-white'
  }
  
  return 'bg-gray-100 text-gray-400'
}

// 選擇答案
function selectAnswer(answer: string): void {
  if (!isPlaying.value || showResult.value) return

  selectedAnswer.value = answer
  showResult.value = true

  const reactionTime = Date.now() - roundStartTime
  reactionTimes.value.push(reactionTime)

  isCorrect.value = answer === correctAnswer.value

  if (isCorrect.value) {
    correctCount.value++
    emit('score-change', correctCount.value)
  }

  // 清除倒數
  if (countdownTimer) clearInterval(countdownTimer)

  // 下一題
  setTimeout(() => {
    if (currentRound.value < totalRounds.value) {
      nextRound()
    } else {
      endGame()
    }
  }, 1000)
}

// 開始遊戲
function startGame(): void {
  isPlaying.value = true
  isFinished.value = false
  currentRound.value = 0
  correctCount.value = 0
  reactionTimes.value = []
  
  nextRound()
}

// 下一題
function nextRound(): void {
  currentRound.value++
  generateRound()

  // 開始倒數
  countdownTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      // 時間到
      showResult.value = true
      isCorrect.value = false
      if (countdownTimer) clearInterval(countdownTimer)
      
      setTimeout(() => {
        if (currentRound.value < totalRounds.value) {
          nextRound()
        } else {
          endGame()
        }
      }, 800)
    }
  }, 1000)
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  if (countdownTimer) clearInterval(countdownTimer)

  const accuracy = totalRounds.value > 0 ? correctCount.value / totalRounds.value : 0
  const avgReactionTime = reactionTimes.value.length > 0
    ? Math.round(reactionTimes.value.reduce((a, b) => a + b, 0) / reactionTimes.value.length)
    : 0

  // 計算分數
  const accuracyScore = accuracy * 75
  const speedBonus = avgReactionTime > 0 && avgReactionTime < 2000
    ? Math.min(25, (2000 - avgReactionTime) / 80)
    : 0
  
  const finalScore = Math.round(Math.min(100, accuracyScore + speedBonus))

  const result: GameResult = {
    gameId: 'stroop-test',
    difficulty: props.difficulty,
    score: finalScore,
    maxScore: 100,
    correctCount: correctCount.value,
    totalCount: totalRounds.value,
    accuracy,
    avgReactionTime,
    duration: totalRounds.value * difficultyConfig.value.timePerRound,
    timestamp: new Date(),
  }

  emit('game-end', result)
}

// 清理
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.stroop-area {
  text-align: center;
  padding: 2rem;
}

.stroop-word {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
