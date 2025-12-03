<script setup lang="ts">
/**
 * 圖形推理遊戲
 * 訓練維度：邏輯力 + 認知力
 * 玩法：找出圖形序列的規律，選擇正確的下一個圖形
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Difficulty, SubDifficulty } from '@/types/game'

// Props
interface Props {
  difficulty?: Difficulty
  subDifficulty?: SubDifficulty
}

const props = withDefaults(defineProps<Props>(), {
  difficulty: 'medium',
  subDifficulty: 2
})

// Emits
const emit = defineEmits<{
  (e: 'complete', result: {
    score: number
    accuracy: number
    totalRounds: number
    correctRounds: number
    avgResponseTime: number
  }): void
  (e: 'progress', progress: number): void
}>()

// 圖形類型
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon'
type ShapeColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'
type ShapeSize = 'small' | 'medium' | 'large'

interface Shape {
  type: ShapeType
  color: ShapeColor
  size: ShapeSize
  rotation: number
}

// 題目類型
interface Question {
  sequence: Shape[]
  answer: Shape
  options: Shape[]
  rule: string
}

// 遊戲配置
const gameConfig = computed(() => {
  const configs = {
    easy: {
      sequenceLength: 3,
      optionCount: 3,
      totalRounds: 8,
      timePerRound: 30,
      complexity: 1 // 只變一個屬性
    },
    medium: {
      sequenceLength: 4,
      optionCount: 4,
      totalRounds: 10,
      timePerRound: 25,
      complexity: 2 // 變兩個屬性
    },
    hard: {
      sequenceLength: 5,
      optionCount: 4,
      totalRounds: 12,
      timePerRound: 20,
      complexity: 3 // 複雜規律
    }
  }

  const base = configs[props.difficulty]
  
  // 根據子難度微調
  const subAdjust = props.subDifficulty - 2
  
  return {
    ...base,
    totalRounds: base.totalRounds + subAdjust,
    timePerRound: base.timePerRound - subAdjust * 3
  }
})

// 遊戲狀態
type GamePhase = 'ready' | 'playing' | 'result' | 'gameover'

const phase = ref<GamePhase>('ready')
const currentRound = ref(0)
const currentQuestion = ref<Question | null>(null)
const selectedOption = ref<number | null>(null)
const isCorrect = ref<boolean | null>(null)
const score = ref(0)
const correctRounds = ref(0)
const timeLeft = ref(0)
const responseTimes = ref<number[]>([])
const roundStartTime = ref(0)

// 計時器
let roundTimer: ReturnType<typeof setInterval> | null = null

// 形狀列表
const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon']
const COLORS: ShapeColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
const SIZES: ShapeSize[] = ['small', 'medium', 'large']

// 取得隨機元素
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

// 取得下一個元素（循環）
function nextInSequence<T>(arr: readonly T[], current: T): T {
  const index = arr.indexOf(current)
  return arr[(index + 1) % arr.length] as T
}

// 產生題目
function generateQuestion(): Question {
  const { sequenceLength, optionCount, complexity } = gameConfig.value
  const sequence: Shape[] = []
  
  // 選擇基本圖形
  const baseShape = randomFrom(SHAPES)
  const baseColor = randomFrom(COLORS)
  const baseSize = randomFrom(SIZES)
  const baseRotation = 0
  
  // 決定變化規律
  type RuleType = 'shape' | 'color' | 'size' | 'rotation'
  const possibleRules: RuleType[] = ['shape', 'color', 'size', 'rotation']
  const activeRules = possibleRules.slice(0, Math.min(complexity, possibleRules.length))
  const selectedRule = randomFrom(activeRules)
  
  let rule = ''
  
  // 產生序列
  for (let i = 0; i < sequenceLength; i++) {
    let shape: ShapeType = baseShape
    let color: ShapeColor = baseColor
    let size: ShapeSize = baseSize
    let rotation = baseRotation

    switch (selectedRule) {
      case 'shape':
        shape = SHAPES[(SHAPES.indexOf(baseShape) + i) % SHAPES.length] as ShapeType
        rule = '形狀依序變化'
        break
      case 'color':
        color = COLORS[(COLORS.indexOf(baseColor) + i) % COLORS.length] as ShapeColor
        rule = '顏色依序變化'
        break
      case 'size':
        size = SIZES[i % SIZES.length] as ShapeSize
        rule = '大小依序變化'
        break
      case 'rotation':
        rotation = (i * 45) % 360
        rule = '角度依序旋轉'
        break
    }
    
    sequence.push({ type: shape, color, size, rotation })
  }
  
  // 產生正確答案
  const lastShape = sequence[sequence.length - 1]
  if (!lastShape) {
    throw new Error('Sequence is empty')
  }
  const answer: Shape = { ...lastShape }
  
  switch (selectedRule) {
    case 'shape':
      answer.type = nextInSequence(SHAPES, lastShape.type)
      break
    case 'color':
      answer.color = nextInSequence(COLORS, lastShape.color)
      break
    case 'size':
      answer.size = nextInSequence(SIZES, lastShape.size)
      break
    case 'rotation':
      answer.rotation = (lastShape.rotation + 45) % 360
      break
  }
  
  // 產生選項
  const options: Shape[] = [answer]
  
  while (options.length < optionCount) {
    const wrongAnswer: Shape = {
      type: randomFrom(SHAPES),
      color: randomFrom(COLORS),
      size: randomFrom(SIZES),
      rotation: Math.floor(Math.random() * 8) * 45
    }
    
    // 確保不重複
    const isDuplicate = options.some(opt => 
      opt.type === wrongAnswer.type &&
      opt.color === wrongAnswer.color &&
      opt.size === wrongAnswer.size &&
      opt.rotation === wrongAnswer.rotation
    )
    
    if (!isDuplicate) {
      options.push(wrongAnswer)
    }
  }
  
  // 打亂選項順序
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = options[i]
    const swapItem = options[j]
    if (temp !== undefined && swapItem !== undefined) {
      options[i] = swapItem
      options[j] = temp
    }
  }
  
  return { sequence, answer, options, rule }
}

// 開始遊戲
function startGame(): void {
  phase.value = 'ready'
  currentRound.value = 0
  score.value = 0
  correctRounds.value = 0
  responseTimes.value = []
  
  setTimeout(() => startRound(), 1000)
}

// 開始新一輪
function startRound(): void {
  currentRound.value++
  
  if (currentRound.value > gameConfig.value.totalRounds) {
    endGame()
    return
  }

  currentQuestion.value = generateQuestion()
  selectedOption.value = null
  isCorrect.value = null
  timeLeft.value = gameConfig.value.timePerRound
  roundStartTime.value = Date.now()
  
  phase.value = 'playing'
  startTimer()
  
  emit('progress', ((currentRound.value - 1) / gameConfig.value.totalRounds) * 100)
}

// 開始計時
function startTimer(): void {
  roundTimer = setInterval(() => {
    timeLeft.value--
    
    if (timeLeft.value <= 0) {
      selectOption(-1) // 時間到，自動判錯
    }
  }, 1000)
}

// 選擇答案
function selectOption(index: number): void {
  if (phase.value !== 'playing' || !currentQuestion.value) return
  
  if (roundTimer) {
    clearInterval(roundTimer)
    roundTimer = null
  }
  
  selectedOption.value = index
  phase.value = 'result'
  
  // 記錄反應時間
  responseTimes.value.push(Date.now() - roundStartTime.value)
  
  // 檢查答案
  if (index >= 0) {
    const selected = currentQuestion.value.options[index]
    if (selected) {
      isCorrect.value = 
        selected.type === currentQuestion.value.answer.type &&
        selected.color === currentQuestion.value.answer.color &&
        selected.size === currentQuestion.value.answer.size &&
        selected.rotation === currentQuestion.value.answer.rotation
    } else {
      isCorrect.value = false
    }
  } else {
    isCorrect.value = false
  }
  
  if (isCorrect.value) {
    correctRounds.value++
    // 基本分數 + 時間獎勵
    const baseScore = 100
    const timeBonus = Math.floor(timeLeft.value * 2)
    score.value += baseScore + timeBonus
  }
  
  // 延遲後進入下一輪
  setTimeout(() => {
    startRound()
  }, 2000)
}

// 結束遊戲
function endGame(): void {
  phase.value = 'gameover'
  
  const accuracy = gameConfig.value.totalRounds > 0 
    ? (correctRounds.value / gameConfig.value.totalRounds) * 100 
    : 0
  
  const avgTime = responseTimes.value.length > 0
    ? responseTimes.value.reduce((a, b) => a + b, 0) / responseTimes.value.length
    : 0
  
  emit('complete', {
    score: score.value,
    accuracy: Math.round(accuracy),
    totalRounds: gameConfig.value.totalRounds,
    correctRounds: correctRounds.value,
    avgResponseTime: Math.round(avgTime)
  })
}

// 取得形狀 SVG 路徑
function getShapePath(shape: ShapeType): string {
  switch (shape) {
    case 'circle':
      return 'M 50,25 A 25,25 0 1,1 50,75 A 25,25 0 1,1 50,25'
    case 'square':
      return 'M 25,25 L 75,25 L 75,75 L 25,75 Z'
    case 'triangle':
      return 'M 50,20 L 80,75 L 20,75 Z'
    case 'diamond':
      return 'M 50,15 L 85,50 L 50,85 L 15,50 Z'
    case 'star':
      return 'M 50,15 L 61,40 L 88,40 L 67,57 L 76,85 L 50,68 L 24,85 L 33,57 L 12,40 L 39,40 Z'
    case 'hexagon':
      return 'M 50,15 L 82,32 L 82,68 L 50,85 L 18,68 L 18,32 Z'
    default:
      return ''
  }
}

// 取得顏色值
function getColorValue(color: ShapeColor): string {
  const colors: Record<ShapeColor, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316'
  }
  return colors[color]
}

// 取得尺寸值
function getSizeValue(size: ShapeSize): number {
  const sizes: Record<ShapeSize, number> = {
    small: 40,
    medium: 60,
    large: 80
  }
  return sizes[size]
}

// 清理
function cleanup(): void {
  if (roundTimer) {
    clearInterval(roundTimer)
    roundTimer = null
  }
}

// 生命週期
onMounted(() => {
  startGame()
})

onUnmounted(() => {
  cleanup()
})

// 監聽難度變化
watch([() => props.difficulty, () => props.subDifficulty], () => {
  cleanup()
  startGame()
})
</script>

<template>
  <div class="pattern-reasoning p-4">
    <!-- 遊戲資訊 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-4">
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">回合</span>
          <span class="font-bold ml-1">{{ currentRound }}/{{ gameConfig.totalRounds }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">分數</span>
          <span class="font-bold ml-1 text-blue-600">{{ score }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">正確</span>
          <span class="font-bold ml-1 text-green-600">{{ correctRounds }}</span>
        </div>
      </div>
      <div v-if="phase === 'playing'" class="text-lg font-mono font-bold" 
           :class="timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[var(--color-text)]'">
        {{ timeLeft }}s
      </div>
    </div>

    <!-- 遊戲區域 -->
    <div class="game-area min-h-[450px] flex flex-col items-center justify-center">
      <!-- 準備階段 -->
      <div v-if="phase === 'ready'" class="text-center">
        <div class="text-6xl mb-4">🧩</div>
        <p class="text-xl text-[var(--color-text-secondary)]">準備開始...</p>
        <p class="text-sm text-[var(--color-text-muted)] mt-2">找出圖形規律，選擇下一個！</p>
      </div>

      <!-- 遊戲進行中 -->
      <template v-if="phase === 'playing' || phase === 'result'">
        <div v-if="currentQuestion" class="w-full">
          <!-- 序列區域 -->
          <div class="mb-6">
            <p class="text-center text-[var(--color-text-muted)] mb-3">找出規律，下一個是？</p>
            <div class="flex items-center justify-center gap-2 flex-wrap">
              <div 
                v-for="(shape, index) in currentQuestion.sequence" 
                :key="index"
                class="flex items-center"
              >
                <svg 
                  :width="getSizeValue(shape.size)" 
                  :height="getSizeValue(shape.size)" 
                  viewBox="0 0 100 100"
                  :style="{ transform: `rotate(${shape.rotation}deg)` }"
                >
                  <path 
                    :d="getShapePath(shape.type)" 
                    :fill="getColorValue(shape.color)"
                  />
                </svg>
                <span v-if="index < currentQuestion.sequence.length - 1" class="text-2xl text-gray-300 mx-1">→</span>
              </div>
              <!-- 問號 -->
              <span class="text-2xl text-[var(--color-text-muted)] mx-1">→</span>
              <div class="w-16 h-16 border-3 border-dashed border-[var(--color-border)] rounded-xl flex items-center justify-center">
                <span class="text-3xl text-[var(--color-text-muted)]">?</span>
              </div>
            </div>
          </div>

          <!-- 選項區域 -->
          <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <button
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              @click="selectOption(index)"
              :disabled="phase === 'result'"
              class="option-btn aspect-square bg-[var(--color-surface)] rounded-xl shadow-md p-4
                     flex items-center justify-center transition-all
                     hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              :class="[
                phase === 'result' && selectedOption === index
                  ? isCorrect 
                    ? 'ring-4 ring-green-500 bg-green-50'
                    : 'ring-4 ring-red-500 bg-red-50'
                  : '',
                phase === 'result' && 
                  option.type === currentQuestion.answer.type &&
                  option.color === currentQuestion.answer.color &&
                  option.size === currentQuestion.answer.size &&
                  option.rotation === currentQuestion.answer.rotation
                  ? 'ring-4 ring-green-500'
                  : ''
              ]"
            >
              <svg 
                :width="getSizeValue(option.size)" 
                :height="getSizeValue(option.size)" 
                viewBox="0 0 100 100"
                :style="{ transform: `rotate(${option.rotation}deg)` }"
              >
                <path 
                  :d="getShapePath(option.type)" 
                  :fill="getColorValue(option.color)"
                />
              </svg>
            </button>
          </div>

          <!-- 結果提示 -->
          <div v-if="phase === 'result'" class="text-center mt-6">
            <p class="text-xl font-bold" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
              {{ isCorrect ? '✅ 正確！' : '❌ 錯誤' }}
            </p>
            <p class="text-sm text-[var(--color-text-muted)] mt-2">
              規律：{{ currentQuestion.rule }}
            </p>
          </div>
        </div>
      </template>

      <!-- 遊戲結束 -->
      <div v-if="phase === 'gameover'" class="text-center">
        <div class="text-6xl mb-4">🎉</div>
        <p class="text-2xl font-bold text-[var(--color-text)] mb-4">遊戲結束！</p>
        <div class="bg-[var(--color-bg-soft)] rounded-xl p-6 max-w-sm mx-auto">
          <div class="grid grid-cols-2 gap-4 text-left">
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">最終分數</p>
              <p class="text-2xl font-bold text-blue-600">{{ score }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">正確率</p>
              <p class="text-2xl font-bold text-green-600">
                {{ Math.round((correctRounds / gameConfig.totalRounds) * 100) }}%
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">正確題數</p>
              <p class="text-xl font-bold">{{ correctRounds }}/{{ gameConfig.totalRounds }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">平均反應</p>
              <p class="text-xl font-bold">
                {{ responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000).toFixed(1) : 0 }}s
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pattern-reasoning {
  max-width: 500px;
  margin: 0 auto;
}

.option-btn {
  min-height: 100px;
}
</style>
