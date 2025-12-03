<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-gray-600">快速點擊出現的地鼠！</p>
      <p class="text-sm text-gray-500">小心不要點到炸彈 💣</p>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-gray-500">得分：</span>
        <span class="font-bold text-blue-600">{{ score }}</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">剩餘：</span>
        <span class="font-bold">{{ remainingTime }}秒</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">連擊：</span>
        <span class="font-bold text-orange-500">{{ combo }}x</span>
      </div>
    </div>

    <!-- 遊戲場地 -->
    <div 
      class="grid gap-4 p-6 bg-gradient-to-b from-green-100 to-green-200 rounded-2xl"
      :class="gridClass"
    >
      <div
        v-for="(hole, index) in holes"
        :key="index"
        class="hole relative aspect-square flex items-center justify-center cursor-pointer select-none"
        @click="handleHoleClick(index)"
      >
        <!-- 洞 -->
        <div class="absolute inset-0 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-inner"></div>
        
        <!-- 地鼠/炸彈 -->
        <transition name="pop">
          <div
            v-if="hole.active"
            class="absolute text-5xl md:text-6xl transform transition-transform"
            :class="{ 
              'animate-pulse': hole.type === 'mole',
              'scale-110': hole.hit,
              'opacity-50': hole.hit 
            }"
          >
            {{ hole.type === 'mole' ? '🐹' : '💣' }}
          </div>
        </transition>
        
        <!-- 得分提示 -->
        <transition name="fade">
          <div
            v-if="hole.showScore"
            class="absolute -top-4 font-bold text-xl"
            :class="hole.scoreClass"
          >
            {{ hole.scoreText }}
          </div>
        </transition>
      </div>
    </div>

    <!-- 開始/結束按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🎮
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

// 難度設定
const difficultyConfig = computed(() => {
  const defaults = {
    easy: { interval: 2000, duration: 1500, holes: 6, bombChance: 0.1, gameTime: 30 },
    medium: { interval: 1500, duration: 1200, holes: 9, bombChance: 0.15, gameTime: 45 },
    hard: { interval: 1000, duration: 800, holes: 9, bombChance: 0.2, gameTime: 60 },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 格線 class
const gridClass = computed(() => {
  const holes = difficultyConfig.value.holes
  if (holes <= 6) return 'grid-cols-3'
  return 'grid-cols-3'
})

// 遊戲狀態
interface Hole {
  active: boolean
  type: 'mole' | 'bomb'
  hit: boolean
  showScore: boolean
  scoreText: string
  scoreClass: string
}

const holes = ref<Hole[]>([])
const isPlaying = ref(false)
const isFinished = ref(false)
const score = ref(0)
const combo = ref(0)
const remainingTime = ref(0)

// 統計數據
const totalMoles = ref(0)
const hitMoles = ref(0)
const hitBombs = ref(0)
const reactionTimes = ref<number[]>([])
let lastMoleTime = 0

// 計時器
let gameTimer: ReturnType<typeof setInterval> | null = null
let spawnTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 初始化洞
function initHoles(): void {
  const count = difficultyConfig.value.holes
  holes.value = Array(count).fill(null).map(() => ({
    active: false,
    type: 'mole',
    hit: false,
    showScore: false,
    scoreText: '',
    scoreClass: '',
  }))
}

// 開始遊戲
function startGame(): void {
  initHoles()
  isPlaying.value = true
  isFinished.value = false
  score.value = 0
  combo.value = 0
  totalMoles.value = 0
  hitMoles.value = 0
  hitBombs.value = 0
  reactionTimes.value = []
  remainingTime.value = difficultyConfig.value.gameTime

  // 倒數計時
  countdownTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      endGame()
    }
  }, 1000)

  // 生成地鼠
  spawnMole()
  spawnTimer = setInterval(spawnMole, difficultyConfig.value.interval)
}

// 生成地鼠
function spawnMole(): void {
  if (!isPlaying.value) return

  // 找出未激活的洞
  const inactiveIndices = holes.value
    .map((h, i) => (!h.active ? i : -1))
    .filter(i => i !== -1)
  
  if (inactiveIndices.length === 0) return

  // 隨機選擇一個洞
  const randomIdx = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)]
  if (randomIdx === undefined) return
  
  const hole = holes.value[randomIdx]
  if (!hole) return

  // 決定是地鼠還是炸彈
  const isBomb = Math.random() < difficultyConfig.value.bombChance
  
  hole.active = true
  hole.type = isBomb ? 'bomb' : 'mole'
  hole.hit = false

  if (!isBomb) {
    totalMoles.value++
    lastMoleTime = Date.now()
  }

  // 自動消失
  setTimeout(() => {
    if (hole.active && !hole.hit) {
      hole.active = false
      if (hole.type === 'mole') {
        combo.value = 0  // 漏掉地鼠，連擊歸零
      }
    }
  }, difficultyConfig.value.duration)
}

// 點擊洞
function handleHoleClick(index: number): void {
  if (!isPlaying.value) return

  const hole = holes.value[index]
  if (!hole || !hole.active || hole.hit) return

  hole.hit = true
  const reactionTime = Date.now() - lastMoleTime

  if (hole.type === 'mole') {
    // 打中地鼠
    hitMoles.value++
    combo.value++
    reactionTimes.value.push(reactionTime)
    
    // 計算分數（連擊加成）
    const baseScore = 10
    const comboBonus = Math.min(combo.value, 5)
    const points = baseScore + comboBonus * 2
    score.value += points

    hole.showScore = true
    hole.scoreText = `+${points}`
    hole.scoreClass = 'text-green-500'
    
    emit('score-change', score.value)
  } else {
    // 打中炸彈
    hitBombs.value++
    combo.value = 0
    score.value = Math.max(0, score.value - 20)

    hole.showScore = true
    hole.scoreText = '-20'
    hole.scoreClass = 'text-red-500'
    
    emit('score-change', score.value)
  }

  // 隱藏得分提示
  setTimeout(() => {
    hole.showScore = false
    hole.active = false
  }, 300)
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  // 清除計時器
  if (countdownTimer) clearInterval(countdownTimer)
  if (spawnTimer) clearInterval(spawnTimer)
  if (gameTimer) clearInterval(gameTimer)

  // 計算最終分數（滿分 100）
  const accuracy = totalMoles.value > 0 ? hitMoles.value / totalMoles.value : 0
  const avgReactionTime = reactionTimes.value.length > 0
    ? Math.round(reactionTimes.value.reduce((a, b) => a + b, 0) / reactionTimes.value.length)
    : 0

  // 分數計算：正確率 60% + 反應時間 30% + 連擊 10%
  const accuracyScore = accuracy * 60
  const reactionScore = avgReactionTime > 0 
    ? Math.max(0, 30 - (avgReactionTime - 300) / 50)
    : 0
  const comboScore = Math.min(10, hitMoles.value / 2)
  
  const finalScore = Math.round(Math.min(100, accuracyScore + reactionScore + comboScore))

  const result: GameResult = {
    gameId: 'whack-a-mole',
    difficulty: props.difficulty,
    score: finalScore,
    maxScore: 100,
    correctCount: hitMoles.value,
    totalCount: totalMoles.value,
    accuracy,
    avgReactionTime,
    duration: difficultyConfig.value.gameTime,
    timestamp: new Date(),
  }

  emit('game-end', result)
}

// 清理
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (spawnTimer) clearInterval(spawnTimer)
  if (gameTimer) clearInterval(gameTimer)
})

// 初始化
initHoles()
</script>

<style scoped>
.hole {
  min-height: 80px;
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.15s ease;
}

.pop-enter-from {
  transform: scale(0) translateY(20px);
  opacity: 0;
}

.pop-leave-to {
  transform: scale(0.5);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
