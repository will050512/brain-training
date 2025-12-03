<script setup lang="ts">
/**
 * 數字連連看遊戲
 * 訓練維度：注意力 + 認知力
 * 玩法：按順序依次點擊 1, 2, 3... 的數字
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
    totalTime: number
    avgClickTime: number
    errors: number
  }): void
  (e: 'progress', progress: number): void
}>()

// 數字位置
interface NumberNode {
  value: number
  x: number
  y: number
  clicked: boolean
  isWrong: boolean
}

// 遊戲配置
const gameConfig = computed(() => {
  const configs = {
    easy: {
      count: 10,
      timeLimit: 60,
      nodeSize: 50,
      spacing: 80
    },
    medium: {
      count: 15,
      timeLimit: 90,
      nodeSize: 45,
      spacing: 70
    },
    hard: {
      count: 25,
      timeLimit: 120,
      nodeSize: 40,
      spacing: 55
    }
  }

  const base = configs[props.difficulty]
  
  // 根據子難度微調
  const subAdjust = props.subDifficulty - 2
  
  return {
    count: base.count + subAdjust * 2,
    timeLimit: base.timeLimit - subAdjust * 10,
    nodeSize: base.nodeSize - subAdjust * 3,
    spacing: base.spacing - subAdjust * 5
  }
})

// 遊戲狀態
type GamePhase = 'ready' | 'playing' | 'gameover'

const phase = ref<GamePhase>('ready')
const nodes = ref<NumberNode[]>([])
const currentTarget = ref(1)
const timeLeft = ref(0)
const score = ref(0)
const errors = ref(0)
const clickTimes = ref<number[]>([])
const lastClickTime = ref(0)
const gameAreaRef = ref<HTMLElement | null>(null)

// 計時器
let gameTimer: ReturnType<typeof setInterval> | null = null

// 產生不重疊的隨機位置
function generateNodes(): NumberNode[] {
  const result: NumberNode[] = []
  const { count, nodeSize, spacing } = gameConfig.value
  
  // 遊戲區域大小
  const width = 350
  const height = 400
  
  const padding = nodeSize / 2
  const maxAttempts = 100
  
  for (let i = 1; i <= count; i++) {
    let placed = false
    let attempts = 0
    
    while (!placed && attempts < maxAttempts) {
      const x = padding + Math.random() * (width - nodeSize - padding * 2)
      const y = padding + Math.random() * (height - nodeSize - padding * 2)
      
      // 檢查與已放置節點的距離
      const overlaps = result.some(node => {
        const dx = node.x - x
        const dy = node.y - y
        return Math.sqrt(dx * dx + dy * dy) < spacing
      })
      
      if (!overlaps) {
        result.push({
          value: i,
          x,
          y,
          clicked: false,
          isWrong: false
        })
        placed = true
      }
      
      attempts++
    }
    
    // 如果多次嘗試後仍無法放置，強制放置
    if (!placed) {
      result.push({
        value: i,
        x: padding + Math.random() * (width - nodeSize - padding * 2),
        y: padding + Math.random() * (height - nodeSize - padding * 2),
        clicked: false,
        isWrong: false
      })
    }
  }
  
  return result
}

// 開始遊戲
function startGame(): void {
  phase.value = 'ready'
  nodes.value = generateNodes()
  currentTarget.value = 1
  timeLeft.value = gameConfig.value.timeLimit
  score.value = 0
  errors.value = 0
  clickTimes.value = []
  lastClickTime.value = 0
  
  setTimeout(() => {
    phase.value = 'playing'
    lastClickTime.value = Date.now()
    startTimer()
  }, 1000)
}

// 開始計時
function startTimer(): void {
  gameTimer = setInterval(() => {
    timeLeft.value--
    
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

// 點擊數字
function clickNode(node: NumberNode): void {
  if (phase.value !== 'playing' || node.clicked) return
  
  if (node.value === currentTarget.value) {
    // 正確
    node.clicked = true
    
    // 記錄點擊時間
    const now = Date.now()
    if (lastClickTime.value > 0) {
      clickTimes.value.push(now - lastClickTime.value)
    }
    lastClickTime.value = now
    
    // 計算分數
    const baseScore = 10
    const recentClickTime = clickTimes.value[clickTimes.value.length - 1] ?? 0
    const speedBonus = Math.max(0, Math.floor((5000 - recentClickTime) / 500))
    score.value += baseScore + speedBonus
    
    currentTarget.value++
    emit('progress', ((currentTarget.value - 1) / gameConfig.value.count) * 100)
    
    // 檢查是否完成
    if (currentTarget.value > gameConfig.value.count) {
      endGame()
    }
  } else {
    // 錯誤
    errors.value++
    node.isWrong = true
    
    // 扣分
    score.value = Math.max(0, score.value - 5)
    
    // 短暫顯示錯誤後恢復
    setTimeout(() => {
      node.isWrong = false
    }, 500)
  }
}

// 結束遊戲
function endGame(): void {
  phase.value = 'gameover'
  
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
  
  const completed = currentTarget.value - 1
  const accuracy = completed > 0 
    ? Math.round((completed / (completed + errors.value)) * 100)
    : 0
  
  const avgClickTime = clickTimes.value.length > 0
    ? Math.round(clickTimes.value.reduce((a, b) => a + b, 0) / clickTimes.value.length)
    : 0
  
  const totalTime = gameConfig.value.timeLimit - timeLeft.value
  
  emit('complete', {
    score: score.value,
    accuracy,
    totalTime,
    avgClickTime,
    errors: errors.value
  })
}

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 清理
function cleanup(): void {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
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
  <div class="number-connect p-4">
    <!-- 遊戲資訊 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-4">
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">分數</span>
          <span class="font-bold ml-1 text-blue-600">{{ score }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">進度</span>
          <span class="font-bold ml-1">{{ currentTarget - 1 }}/{{ gameConfig.count }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">錯誤</span>
          <span class="font-bold ml-1 text-red-500">{{ errors }}</span>
        </div>
      </div>
      <div class="text-lg font-mono font-bold" :class="timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[var(--color-text)]'">
        {{ formatTime(timeLeft) }}
      </div>
    </div>

    <!-- 目標提示 -->
    <div class="text-center mb-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
      <span class="text-[var(--color-text-secondary)]">找到數字：</span>
      <span class="text-2xl font-bold text-blue-600">{{ currentTarget }}</span>
    </div>

    <!-- 遊戲區域 -->
    <div 
      ref="gameAreaRef"
      class="game-area relative bg-[var(--game-area-bg)] rounded-xl overflow-hidden mx-auto"
      style="width: 350px; height: 400px;"
    >
      <!-- 準備階段 -->
      <div v-if="phase === 'ready'" class="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]/80">
        <div class="text-center">
          <div class="text-6xl mb-4">🔢</div>
          <p class="text-xl text-[var(--color-text-secondary)]">準備開始...</p>
          <p class="text-sm text-[var(--color-text-muted)] mt-2">依序點擊 1 到 {{ gameConfig.count }}</p>
        </div>
      </div>

      <!-- 數字節點 -->
      <template v-if="phase !== 'ready'">
        <button
          v-for="node in nodes"
          :key="node.value"
          @click="clickNode(node)"
          :disabled="node.clicked"
          class="number-node absolute flex items-center justify-center rounded-full
                 font-bold transition-all duration-200 select-none"
          :class="[
            node.clicked 
              ? 'bg-green-500 text-white scale-75 opacity-50' 
              : node.isWrong 
                ? 'bg-red-500 text-white animate-shake'
                : 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-md hover:shadow-lg hover:scale-110 cursor-pointer',
            node.value === currentTarget && !node.clicked ? 'ring-2 ring-blue-400 ring-offset-2' : ''
          ]"
          :style="{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${gameConfig.nodeSize}px`,
            height: `${gameConfig.nodeSize}px`,
            fontSize: `${gameConfig.nodeSize * 0.4}px`
          }"
        >
          {{ node.value }}
        </button>
      </template>

      <!-- 連線 -->
      <svg 
        v-if="phase !== 'ready'" 
        class="absolute inset-0 pointer-events-none"
        style="width: 350px; height: 400px;"
      >
        <template v-for="(node, index) in nodes.filter(n => n.clicked)" :key="'line-' + node.value">
          <line
            v-if="index > 0"
            :x1="(nodes.filter(n => n.clicked)[index - 1]?.x ?? 0) + gameConfig.nodeSize / 2"
            :y1="(nodes.filter(n => n.clicked)[index - 1]?.y ?? 0) + gameConfig.nodeSize / 2"
            :x2="node.x + gameConfig.nodeSize / 2"
            :y2="node.y + gameConfig.nodeSize / 2"
            stroke="#22c55e"
            stroke-width="2"
            stroke-linecap="round"
          />
        </template>
      </svg>

      <!-- 遊戲結束 -->
      <div v-if="phase === 'gameover'" class="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]/90">
        <div class="text-center p-6">
          <div class="text-6xl mb-4">
            {{ currentTarget > gameConfig.count ? '🎉' : '⏱️' }}
          </div>
          <p class="text-2xl font-bold text-[var(--color-text)] mb-2">
            {{ currentTarget > gameConfig.count ? '完美完成！' : '時間到！' }}
          </p>
          <div class="bg-[var(--color-bg-soft)] rounded-xl p-4 mt-4">
            <div class="grid grid-cols-2 gap-3 text-left text-sm">
              <div>
                <p class="text-[var(--color-text-muted)]">最終分數</p>
                <p class="text-xl font-bold text-blue-600">{{ score }}</p>
              </div>
              <div>
                <p class="text-[var(--color-text-muted)]">完成數量</p>
                <p class="text-xl font-bold">{{ currentTarget - 1 }}/{{ gameConfig.count }}</p>
              </div>
              <div>
                <p class="text-[var(--color-text-muted)]">平均速度</p>
                <p class="font-bold">
                  {{ clickTimes.length > 0 ? Math.round(clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length) : 0 }}ms
                </p>
              </div>
              <div>
                <p class="text-[var(--color-text-muted)]">錯誤次數</p>
                <p class="font-bold text-red-500">{{ errors }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.number-connect {
  max-width: 400px;
  margin: 0 auto;
}

.number-node {
  transform-origin: center;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
</style>
