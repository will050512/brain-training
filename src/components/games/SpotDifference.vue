<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-gray-600">找出兩張圖片的不同之處！</p>
      <p class="text-sm text-gray-500">點擊右圖中不同的位置</p>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-gray-500">第</span>
        <span class="font-bold text-blue-600">{{ currentRound }}/{{ totalRounds }}</span>
        <span class="text-gray-500">關</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">找到：</span>
        <span class="font-bold text-green-500">{{ foundCount }}/{{ differences.length }}</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">剩餘：</span>
        <span class="font-bold">{{ remainingTime }}秒</span>
      </div>
    </div>

    <!-- 找不同區域 -->
    <div v-if="isPlaying" class="spot-area">
      <div class="grid md:grid-cols-2 gap-4">
        <!-- 原圖 -->
        <div class="image-container">
          <div class="image-label">原圖</div>
          <div 
            class="emoji-grid"
            :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }"
          >
            <div
              v-for="(item, index) in originalGrid"
              :key="'orig-' + index"
              class="emoji-cell"
            >
              {{ item }}
            </div>
          </div>
        </div>

        <!-- 比對圖（可點擊） -->
        <div class="image-container">
          <div class="image-label">找不同</div>
          <div 
            class="emoji-grid cursor-pointer"
            :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }"
          >
            <div
              v-for="(item, index) in compareGrid"
              :key="'comp-' + index"
              class="emoji-cell relative"
              :class="{ 
                'found': foundDifferences.includes(index),
                'hint': showHint && isDifference(index) && !foundDifferences.includes(index)
              }"
              @click="handleClick(index)"
            >
              {{ item }}
              <transition name="pop">
                <span 
                  v-if="foundDifferences.includes(index)" 
                  class="found-marker"
                >
                  ✓
                </span>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示按鈕 -->
      <div class="mt-4 text-center">
        <button
          @click="useHint"
          :disabled="hintsUsed >= maxHints"
          class="btn btn-secondary"
        >
          💡 提示 ({{ maxHints - hintsUsed }} 次)
        </button>
      </div>
    </div>

    <!-- 錯誤提示 -->
    <transition name="fade">
      <div 
        v-if="showWrong" 
        class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
               text-6xl pointer-events-none z-50"
      >
        ❌
      </div>
    </transition>

    <!-- 開始按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🔍
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

// Emoji 庫
const emojiSets = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
  fruits: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🥝', '🍒', '🍑', '🥭', '🍍', '🥥', '🍌', '🫐', '🍈'],
  nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌵', '🌲', '🌴', '🍁', '🍂', '🌾', '🌱', '🌿'],
  objects: ['⭐', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈', '💎', '🔮', '🎈', '🎁', '🎀', '🎄', '🎃'],
}

// 難度設定
const difficultyConfig = computed(() => {
  const defaults = {
    easy: { gridSize: 4, diffCount: 2, rounds: 3, timePerRound: 45, maxHints: 3 },
    medium: { gridSize: 5, diffCount: 3, rounds: 4, timePerRound: 40, maxHints: 2 },
    hard: { gridSize: 6, diffCount: 4, rounds: 5, timePerRound: 35, maxHints: 1 },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 遊戲狀態
const gridSize = computed(() => difficultyConfig.value.gridSize)
const isPlaying = ref(false)
const isFinished = ref(false)
const currentRound = ref(0)
const totalRounds = computed(() => difficultyConfig.value.rounds)
const remainingTime = ref(0)

const originalGrid = ref<string[]>([])
const compareGrid = ref<string[]>([])
const differences = ref<number[]>([])
const foundDifferences = ref<number[]>([])
const foundCount = computed(() => foundDifferences.value.length)

const hintsUsed = ref(0)
const maxHints = computed(() => difficultyConfig.value.maxHints)
const showHint = ref(false)
const showWrong = ref(false)

const wrongClicks = ref(0)
const totalFoundTime = ref(0)
const roundStartTime = ref(0)

// 計時器
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 生成關卡
function generateRound(): void {
  const config = difficultyConfig.value
  const size = config.gridSize
  const totalCells = size * size
  
  // 選擇 emoji 集合
  const setKeys = Object.keys(emojiSets) as (keyof typeof emojiSets)[]
  const setKeyIdx = Math.floor(Math.random() * setKeys.length)
  const setKey = setKeys[setKeyIdx]
  const selectedSet = setKey ? emojiSets[setKey] : emojiSets.animals
  
  // 生成原圖
  originalGrid.value = []
  for (let i = 0; i < totalCells; i++) {
    const emoji = selectedSet[Math.floor(Math.random() * selectedSet.length)]
    if (emoji) originalGrid.value.push(emoji)
  }

  // 複製為比對圖
  compareGrid.value = [...originalGrid.value]

  // 隨機選擇不同的位置
  differences.value = []
  while (differences.value.length < config.diffCount) {
    const pos = Math.floor(Math.random() * totalCells)
    if (!differences.value.includes(pos)) {
      differences.value.push(pos)
      
      // 替換為不同的 emoji
      let newEmoji = selectedSet[Math.floor(Math.random() * selectedSet.length)] || '🎈'
      while (newEmoji === originalGrid.value[pos]) {
        newEmoji = selectedSet[Math.floor(Math.random() * selectedSet.length)] || '🎈'
      }
      compareGrid.value[pos] = newEmoji
    }
  }

  foundDifferences.value = []
  remainingTime.value = config.timePerRound
  roundStartTime.value = Date.now()
  showHint.value = false
}

// 判斷是否為不同點
function isDifference(index: number): boolean {
  return differences.value.includes(index)
}

// 點擊處理
function handleClick(index: number): void {
  if (!isPlaying.value) return
  if (foundDifferences.value.includes(index)) return

  if (isDifference(index)) {
    // 找到不同
    foundDifferences.value.push(index)
    totalFoundTime.value += Date.now() - roundStartTime.value
    emit('score-change', foundCount.value)

    // 檢查是否全部找到
    if (foundCount.value === differences.value.length) {
      // 過關
      if (countdownTimer) clearInterval(countdownTimer)
      
      setTimeout(() => {
        if (currentRound.value < totalRounds.value) {
          nextRound()
        } else {
          endGame()
        }
      }, 800)
    }
  } else {
    // 點錯
    wrongClicks.value++
    showWrong.value = true
    setTimeout(() => {
      showWrong.value = false
    }, 500)
  }
}

// 使用提示
function useHint(): void {
  if (hintsUsed.value >= maxHints.value) return
  
  hintsUsed.value++
  showHint.value = true
  
  setTimeout(() => {
    showHint.value = false
  }, 1500)
}

// 開始遊戲
function startGame(): void {
  isPlaying.value = true
  isFinished.value = false
  currentRound.value = 0
  wrongClicks.value = 0
  totalFoundTime.value = 0
  hintsUsed.value = 0
  
  nextRound()
}

// 下一關
function nextRound(): void {
  currentRound.value++
  generateRound()

  // 開始倒數
  countdownTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      // 時間到
      if (countdownTimer) clearInterval(countdownTimer)
      
      if (currentRound.value < totalRounds.value) {
        nextRound()
      } else {
        endGame()
      }
    }
  }, 1000)
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  if (countdownTimer) clearInterval(countdownTimer)

  const totalDiffs = totalRounds.value * difficultyConfig.value.diffCount
  const totalFound = currentRound.value > 0 
    ? (currentRound.value - 1) * difficultyConfig.value.diffCount + foundCount.value
    : 0
  
  const accuracy = totalDiffs > 0 ? totalFound / totalDiffs : 0
  const avgTime = totalFound > 0 ? Math.round(totalFoundTime.value / totalFound) : 0

  // 計算分數
  const accuracyScore = accuracy * 70
  const penaltyScore = Math.max(0, 20 - wrongClicks.value * 2)
  const speedBonus = avgTime > 0 && avgTime < 5000 ? Math.min(10, (5000 - avgTime) / 500) : 0
  
  const finalScore = Math.round(Math.min(100, accuracyScore + penaltyScore + speedBonus))

  const result: GameResult = {
    gameId: 'spot-difference',
    difficulty: props.difficulty,
    score: finalScore,
    maxScore: 100,
    correctCount: totalFound,
    totalCount: totalDiffs,
    accuracy,
    avgReactionTime: avgTime,
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
.spot-area {
  max-width: 800px;
  margin: 0 auto;
}

.image-container {
  position: relative;
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.image-label {
  position: absolute;
  top: -10px;
  left: 10px;
  background: #3b82f6;
  color: white;
  padding: 2px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.emoji-grid {
  display: grid;
  gap: 4px;
  padding: 8px;
}

.emoji-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: #f3f4f6;
  border-radius: 8px;
  transition: all 0.2s ease;
}

@media (min-width: 768px) {
  .emoji-cell {
    font-size: 2rem;
  }
}

.emoji-cell:hover {
  background: #e5e7eb;
  transform: scale(1.05);
}

.emoji-cell.found {
  background: #bbf7d0;
  animation: celebrate 0.5s ease;
}

.emoji-cell.hint {
  animation: pulse 0.5s ease infinite;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.found-marker {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #22c55e;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes celebrate {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.8); }
}

.pop-enter-active {
  animation: pop 0.3s ease;
}

@keyframes pop {
  0% { transform: scale(0); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
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
