<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-[var(--color-text-secondary)]">翻開卡片，找出相同的配對！</p>
      <p class="text-sm text-[var(--color-text-muted)]">記住卡片位置，用最少步數完成</p>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">配對：</span>
        <span class="font-bold text-green-500 dark:text-green-400">{{ matchedPairs }}/{{ totalPairs }}</span>
      </div>
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">翻牌：</span>
        <span class="font-bold text-blue-600 dark:text-blue-400">{{ moves }}</span>
      </div>
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">時間：</span>
        <span class="font-bold text-[var(--color-text)]">{{ formatTime(elapsedTime) }}</span>
      </div>
    </div>

    <!-- 卡片區域 -->
    <div 
      class="card-grid gap-3 p-4 bg-[var(--game-area-bg)] rounded-xl"
      :class="gridClass"
    >
      <div
        v-for="(card, index) in cards"
        :key="index"
        class="card aspect-square cursor-pointer"
        :class="{ 
          'flipped': card.isFlipped || card.isMatched,
          'matched': card.isMatched 
        }"
        @click="flipCard(index)"
      >
        <div class="card-inner">
          <!-- 卡片背面 -->
          <div class="card-face card-back">
            <span class="text-4xl">❓</span>
          </div>
          <!-- 卡片正面 -->
          <div class="card-face card-front">
            <span class="text-4xl md:text-5xl">{{ card.emoji }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 開始按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🃏
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

// 卡片圖案
const emojiPool = [
  '🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🥝', '🍒',
  '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🍀', '🌵',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '⭐', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈',
  '🎈', '🎁', '🎀', '🎄', '🎃', '🎪', '🎨', '🎭',
]

// 難度設定
const difficultyConfig = computed(() => {
  const defaults = {
    easy: { pairs: 6, previewTime: 3000, gridCols: 3 },
    medium: { pairs: 8, previewTime: 2000, gridCols: 4 },
    hard: { pairs: 12, previewTime: 1500, gridCols: 4 },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 格線 class
const gridClass = computed(() => {
  const cols = difficultyConfig.value.gridCols
  return `grid-cols-${cols}`
})

// 遊戲狀態
interface Card {
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

const cards = ref<Card[]>([])
const isPlaying = ref(false)
const isFinished = ref(false)
const moves = ref(0)
const matchedPairs = ref(0)
const totalPairs = computed(() => difficultyConfig.value.pairs)
const elapsedTime = ref(0)

const flippedIndices = ref<number[]>([])
const isChecking = ref(false)

// 計時器
let timer: ReturnType<typeof setInterval> | null = null

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 生成卡片
function generateCards(): void {
  const pairs = difficultyConfig.value.pairs
  
  // 隨機選擇圖案
  const shuffledEmojis = [...emojiPool].sort(() => Math.random() - 0.5)
  const selectedEmojis = shuffledEmojis.slice(0, pairs)

  // 創建配對
  const cardData: Card[] = []
  for (const emoji of selectedEmojis) {
    cardData.push({ emoji, isFlipped: false, isMatched: false })
    cardData.push({ emoji, isFlipped: false, isMatched: false })
  }

  // 洗牌
  cards.value = cardData.sort(() => Math.random() - 0.5)
}

// 開始遊戲
function startGame(): void {
  generateCards()
  isPlaying.value = true
  isFinished.value = false
  moves.value = 0
  matchedPairs.value = 0
  elapsedTime.value = 0
  flippedIndices.value = []
  isChecking.value = false

  // 預覽所有卡片
  cards.value.forEach(card => card.isFlipped = true)
  
  setTimeout(() => {
    cards.value.forEach(card => card.isFlipped = false)
    
    // 開始計時
    timer = setInterval(() => {
      elapsedTime.value++
    }, 1000)
  }, difficultyConfig.value.previewTime)
}

// 翻牌
function flipCard(index: number): void {
  if (!isPlaying.value || isChecking.value) return
  
  const card = cards.value[index]
  if (!card || card.isFlipped || card.isMatched) return
  if (flippedIndices.value.includes(index)) return

  card.isFlipped = true
  flippedIndices.value.push(index)
  moves.value++

  // 檢查配對
  if (flippedIndices.value.length === 2) {
    isChecking.value = true
    const first = flippedIndices.value[0]
    const second = flippedIndices.value[1]
    
    if (first === undefined || second === undefined) {
      flippedIndices.value = []
      isChecking.value = false
      return
    }
    
    const firstCard = cards.value[first]
    const secondCard = cards.value[second]
    
    if (!firstCard || !secondCard) {
      flippedIndices.value = []
      isChecking.value = false
      return
    }
    
    if (firstCard.emoji === secondCard.emoji) {
      // 配對成功
      firstCard.isMatched = true
      secondCard.isMatched = true
      matchedPairs.value++
      flippedIndices.value = []
      isChecking.value = false
      
      emit('score-change', matchedPairs.value)

      // 檢查是否全部完成
      if (matchedPairs.value === totalPairs.value) {
        endGame()
      }
    } else {
      // 配對失敗，翻回
      setTimeout(() => {
        firstCard.isFlipped = false
        secondCard.isFlipped = false
        flippedIndices.value = []
        isChecking.value = false
      }, 800)
    }
  }
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  if (timer) clearInterval(timer)

  // 計算分數
  // 理想步數 = 配對數 * 2
  const idealMoves = totalPairs.value * 2
  const efficiency = Math.max(0, 1 - (moves.value - idealMoves) / (totalPairs.value * 4))
  
  // 時間獎勵（越快越好）
  const timeBonus = Math.max(0, 1 - elapsedTime.value / (totalPairs.value * 30))
  
  // 分數計算：效率 70% + 時間 30%
  const finalScore = Math.round((efficiency * 70 + timeBonus * 30))

  const result: GameResult = {
    gameId: 'card-match',
    difficulty: props.difficulty,
    score: Math.min(100, finalScore),
    maxScore: 100,
    correctCount: matchedPairs.value,
    totalCount: totalPairs.value,
    accuracy: 1, // 完成即 100%
    avgReactionTime: Math.round((elapsedTime.value * 1000) / moves.value),
    duration: elapsedTime.value,
    timestamp: new Date(),
  }

  emit('game-end', result)
}

// 清理
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.card-grid {
  display: grid;
  max-width: 500px;
  margin: 0 auto;
}

.card {
  perspective: 1000px;
  min-height: 70px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.5s;
  transform-style: preserve-3d;
}

.card.flipped .card-inner {
  transform: rotateY(180deg);
}

.card.matched .card-inner {
  animation: celebrate 0.5s ease;
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card-back {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-front {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transform: rotateY(180deg);
}

.card.matched .card-front {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

@keyframes celebrate {
  0%, 100% { transform: rotateY(180deg) scale(1); }
  50% { transform: rotateY(180deg) scale(1.1); }
}

@media (max-width: 640px) {
  .card {
    min-height: 60px;
  }
  
  .card-grid {
    gap: 8px !important;
  }
}
</style>
