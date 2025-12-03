<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-gray-600">哪邊比較重？點選較重的一側！</p>
      <p class="text-sm text-gray-500">觀察物品數量和大小來判斷</p>
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

    <!-- 天平 -->
    <div class="scale-container relative" v-if="isPlaying || isFinished">
      <!-- 天平支架 -->
      <div class="scale-stand">
        <div class="stand-base"></div>
        <div class="stand-pole"></div>
        <div class="stand-top"></div>
      </div>

      <!-- 天平臂 -->
      <div 
        class="scale-arm"
        :style="{ transform: `rotate(${armRotation}deg)` }"
      >
        <!-- 左盤 -->
        <div 
          class="scale-pan left cursor-pointer hover:ring-4 hover:ring-blue-300 transition-all"
          :class="{ 
            'ring-4 ring-green-400': showResult && leftWeight > rightWeight,
            'ring-4 ring-red-400': showResult && leftWeight < rightWeight && selectedSide === 'left'
          }"
          @click="selectSide('left')"
        >
          <div class="pan-items">
            <span v-for="(item, i) in leftItems" :key="i" class="text-3xl md:text-4xl">
              {{ item.emoji }}
            </span>
          </div>
          <div class="pan-base"></div>
        </div>

        <!-- 右盤 -->
        <div 
          class="scale-pan right cursor-pointer hover:ring-4 hover:ring-blue-300 transition-all"
          :class="{ 
            'ring-4 ring-green-400': showResult && rightWeight > leftWeight,
            'ring-4 ring-red-400': showResult && rightWeight < leftWeight && selectedSide === 'right'
          }"
          @click="selectSide('right')"
        >
          <div class="pan-items">
            <span v-for="(item, i) in rightItems" :key="i" class="text-3xl md:text-4xl">
              {{ item.emoji }}
            </span>
          </div>
          <div class="pan-base"></div>
        </div>
      </div>

      <!-- 結果提示 -->
      <transition name="fade">
        <div 
          v-if="showResult"
          class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl"
        >
          {{ isCorrect ? '✅' : '❌' }}
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
        開始遊戲 ⚖️
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

// 物品定義
interface WeightItem {
  emoji: string
  weight: number
}

const weightItems: WeightItem[] = [
  { emoji: '🍎', weight: 1 },
  { emoji: '🍊', weight: 1 },
  { emoji: '🍋', weight: 1 },
  { emoji: '🍇', weight: 2 },
  { emoji: '🍉', weight: 3 },
  { emoji: '🥝', weight: 1 },
  { emoji: '🍓', weight: 1 },
  { emoji: '🥕', weight: 1 },
  { emoji: '🥔', weight: 2 },
  { emoji: '🎃', weight: 4 },
  { emoji: '🏀', weight: 3 },
  { emoji: '⚽', weight: 2 },
  { emoji: '🎱', weight: 2 },
]

// 難度設定
const difficultyConfig = computed(() => {
  const defaults = {
    easy: { rounds: 8, maxItems: 4, timePerRound: 10, showWeightHint: true },
    medium: { rounds: 12, maxItems: 5, timePerRound: 8, showWeightHint: false },
    hard: { rounds: 15, maxItems: 6, timePerRound: 6, showWeightHint: false },
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

const leftItems = ref<WeightItem[]>([])
const rightItems = ref<WeightItem[]>([])
const leftWeight = ref(0)
const rightWeight = ref(0)
const selectedSide = ref<'left' | 'right' | null>(null)
const showResult = ref(false)
const isCorrect = ref(false)

const reactionTimes = ref<number[]>([])
let roundStartTime = 0

// 天平臂旋轉角度
const armRotation = computed(() => {
  if (showResult.value) {
    const diff = leftWeight.value - rightWeight.value
    return Math.max(-15, Math.min(15, diff * 3))
  }
  return 0
})

// 計時器
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 生成題目
function generateRound(): void {
  const config = difficultyConfig.value
  
  // 隨機生成左右物品
  const leftCount = Math.floor(Math.random() * config.maxItems) + 1
  const rightCount = Math.floor(Math.random() * config.maxItems) + 1

  leftItems.value = []
  rightItems.value = []

  for (let i = 0; i < leftCount; i++) {
    const item = weightItems[Math.floor(Math.random() * weightItems.length)]
    if (item) leftItems.value.push(item)
  }

  for (let i = 0; i < rightCount; i++) {
    const item = weightItems[Math.floor(Math.random() * weightItems.length)]
    if (item) rightItems.value.push(item)
  }

  // 計算重量
  leftWeight.value = leftItems.value.reduce((sum, item) => sum + item.weight, 0)
  rightWeight.value = rightItems.value.reduce((sum, item) => sum + item.weight, 0)

  // 確保有明確的重量差異
  if (leftWeight.value === rightWeight.value) {
    // 添加一個額外物品到較少的一側
    const extraItem = weightItems[0]
    if (extraItem) {
      if (leftCount <= rightCount) {
        leftItems.value.push(extraItem)
        leftWeight.value += extraItem.weight
      } else {
        rightItems.value.push(extraItem)
        rightWeight.value += extraItem.weight
      }
    }
  }

  selectedSide.value = null
  showResult.value = false
  remainingTime.value = config.timePerRound
  roundStartTime = Date.now()
}

// 選擇一側
function selectSide(side: 'left' | 'right'): void {
  if (!isPlaying.value || showResult.value) return

  selectedSide.value = side
  showResult.value = true

  const reactionTime = Date.now() - roundStartTime
  reactionTimes.value.push(reactionTime)

  // 判斷是否正確
  if (side === 'left') {
    isCorrect.value = leftWeight.value > rightWeight.value
  } else {
    isCorrect.value = rightWeight.value > leftWeight.value
  }

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
  }, 1200)
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
      // 時間到，自動跳過
      showResult.value = true
      isCorrect.value = false
      if (countdownTimer) clearInterval(countdownTimer)
      
      setTimeout(() => {
        if (currentRound.value < totalRounds.value) {
          nextRound()
        } else {
          endGame()
        }
      }, 1000)
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

  // 計算分數（滿分 100）
  const accuracyScore = accuracy * 80
  const speedBonus = avgReactionTime > 0 && avgReactionTime < 3000
    ? Math.min(20, (3000 - avgReactionTime) / 150)
    : 0
  
  const finalScore = Math.round(Math.min(100, accuracyScore + speedBonus))

  const result: GameResult = {
    gameId: 'balance-scale',
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
.scale-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.scale-stand {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.stand-base {
  width: 120px;
  height: 20px;
  background: linear-gradient(to bottom, #8B4513, #654321);
  border-radius: 4px;
  margin: 0 auto;
}

.stand-pole {
  width: 16px;
  height: 120px;
  background: linear-gradient(to right, #8B4513, #A0522D, #8B4513);
  margin: 0 auto;
  border-radius: 2px;
}

.stand-top {
  width: 30px;
  height: 30px;
  background: #FFD700;
  border-radius: 50%;
  margin: -15px auto 0;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.scale-arm {
  position: relative;
  width: 400px;
  height: 12px;
  background: linear-gradient(to bottom, #D4AF37, #B8860B);
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.5s ease;
  z-index: 2;
}

.scale-pan {
  position: absolute;
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.scale-pan.left {
  left: -60px;
}

.scale-pan.right {
  right: -60px;
}

.pan-items {
  min-height: 80px;
  padding: 12px;
  background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
  border-radius: 50%;
  width: 120px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.pan-base {
  width: 4px;
  height: 40px;
  background: #888;
  margin-top: -5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .scale-arm {
    width: 300px;
  }
  
  .scale-pan {
    width: 100px;
  }
  
  .pan-items {
    width: 90px;
    min-height: 60px;
  }
  
  .scale-pan.left {
    left: -40px;
  }
  
  .scale-pan.right {
    right: -40px;
  }
}
</style>
