<script setup lang="ts">
/**
 * 數字連連看遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
import {
  createGameState,
  tryConnect,
  isCompleted,
  getHintPosition,
  calculateScore,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  type NumberConnectState,
  type NumberNode,
  type NumberConnectConfig,
} from '@/games/logic/numberConnect'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'

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
const config = computed<NumberConnectConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  feedback,
  showFeedback,
  isPlaying,
  startGame: startGameState,
  finishGame: finishGameState,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
} = useGameState({
  totalRounds: 1,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 計時器 =====
const { 
  time: timeRemaining, 
  start: startTimer, 
  stop: stopTimer,
  reset: resetTimer 
} = useGameTimer({
  mode: 'countdown',
  initialTime: 60,
  onTimeUp: handleTimeout,
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const gameState = ref<NumberConnectState | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const hintUsed = ref(0)
const startTime = ref(0)

// ===== 計算屬性 =====
const nodes = computed(() => gameState.value?.nodes || [])
const connectedPath = computed(() => gameState.value?.connectedPath || [])
const currentTarget = computed(() => gameState.value?.currentTarget || 1)
const errors = computed(() => gameState.value?.errors || 0)
const connectionCount = computed(() => connectedPath.value.length)

const progress = computed(() => {
  const total = config.value.count - 1 // N-1 connections needed
  return Math.round((connectionCount.value / total) * 100)
})

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
  '找到數字 1 開始',
  '按順序點擊數字連接它們',
  '在時間內連接所有數字',
  '越快完成分數越高',
]

// ===== 遊戲方法 =====
function handleStart() {
  // 建立遊戲狀態
  gameState.value = createGameState(config.value)
  hintUsed.value = 0
  startTime.value = Date.now()
  
  startGame()
  
  // 重置並開始計時
  resetTimer(config.value.timeLimit)
  startTimer()
  
  // 延遲繪製連線
  requestAnimationFrame(() => {
    drawConnections()
  })
}

function handleNodeClick(node: NumberNode) {
  if (!isPlaying.value || !gameState.value) return
  
  // 嘗試連接
  const result = tryConnect(gameState.value, node.value)
  
  if (result.success) {
    gameState.value = result.newState
    playCorrect()
    
    // 重繪連線
    requestAnimationFrame(() => {
      drawConnections()
    })
    
    // 檢查是否完成
    if (isCompleted(gameState.value)) {
      handleGameEnd()
    }
  } else {
    gameState.value = result.newState // 更新錯誤計數
    playWrong()
    setFeedback('wrong', `應該連接 ${currentTarget.value}`)
    setTimeout(clearFeedback, 1000)
  }
}

function showHint() {
  if (!isPlaying.value || !gameState.value) return
  
  hintUsed.value++
  
  // 找出下一個應該連接的數字位置
  const hintPos = getHintPosition(gameState.value)
  
  if (hintPos) {
    setFeedback('correct', `下一個是 ${currentTarget.value}`)
    setTimeout(clearFeedback, 2000)
  }
}

function drawConnections() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 更新 canvas 尺寸
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  
  // 清除畫布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  if (connectedPath.value.length < 2) return
  
  // 繪製連線
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.beginPath()
  
  // 轉換遊戲座標到畫布座標
  const scaleX = canvas.width / config.value.canvasWidth
  const scaleY = canvas.height / config.value.canvasHeight
  
  connectedPath.value.forEach((pos, index) => {
    const x = pos.x * scaleX
    const y = pos.y * scaleY
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  ctx.stroke()
}

function handleTimeout() {
  handleGameEnd()
}

function handleGameEnd() {
  stopTimer()
  playEnd()
  
  const elapsed = (Date.now() - startTime.value) / 1000
  const finalScore = calculateScore(
    connectionCount.value,
    config.value.count,
    errors.value,
    elapsed,
    config.value.timeLimit
  )
  
  addScore(finalScore)
  
  const result = gameState.value 
    ? summarizeResult(gameState.value, elapsed, config.value)
    : {
        score: finalScore,
        completionTime: elapsed,
        errors: errors.value,
        completed: false,
        connectedCount: connectionCount.value,
        totalCount: config.value.count,
      }
  
  finishGame()
  emit('game-end', result)
}

// ===== 視窗大小變化處理 =====
function handleResize() {
  drawConnections()
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  window.addEventListener('resize', handleResize)
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: timeRemaining.value,
      score: score.value,
      currentRound: connectionCount.value,
      totalRounds: config.value.count - 1,
      showTimer: true,
      showScore: true,
      showProgress: true
    })
  }
})

onBeforeUnmount(() => {
  stopTimer()
  window.removeEventListener('resize', handleResize)
})

onUnmounted(() => {
  cleanupThrottle()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    resetGame()
  }
})
</script>

<template>
  <div class="number-connect-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="數字連連看"
      icon="🔢"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 工具列 -->
      <div class="toolbar flex justify-center gap-4 mt-4 px-4">
        <button
          class="tool-btn min-h-[48px] px-4 py-2 rounded-lg bg-yellow-200 dark:bg-yellow-700 hover:bg-yellow-300 dark:hover:bg-yellow-600 transition-colors text-base sm:text-lg font-medium"
          @click="showHint"
        >
          💡 提示
        </button>
      </div>

      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
        <div class="flex flex-wrap justify-center gap-2 sm:gap-4">
          <span>下一個：<strong class="text-blue-600">{{ currentTarget }}</strong></span>
          <span class="hidden sm:inline">|</span>
          <span>連接：{{ connectionCount }} / {{ config.count - 1 }}</span>
          <span class="hidden sm:inline">|</span>
          <span>錯誤：{{ errors }}</span>
        </div>
      </div>

      <!-- 遊戲區域 -->
      <div
        ref="containerRef"
        class="game-area relative mt-4 sm:mt-6 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mx-4"
        :style="{
          width: 'calc(100% - 2rem)',
          aspectRatio: `${config.canvasWidth}/${config.canvasHeight}`,
          maxWidth: '500px',
          margin: '0 auto'
        }"
      >
        <!-- Canvas 層 - 繪製連線 -->
        <canvas
          ref="canvasRef"
          class="absolute inset-0 w-full h-full pointer-events-none"
        />

        <!-- 節點層 -->
        <div class="nodes-layer absolute inset-0">
          <button
            v-for="node in nodes"
            :key="node.value"
            class="node-btn absolute w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold transition-all transform hover:scale-110 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px]"
            :class="{
              'bg-green-500 text-white': node.connected,
              'bg-blue-500 text-white ring-2 ring-blue-300 animate-pulse': !node.connected && node.value === currentTarget,
              'bg-white dark:bg-gray-700 shadow-md': !node.connected && node.value !== currentTarget,
            }"
            :style="{
              left: `${(node.position.x / config.canvasWidth) * 100}%`,
              top: `${(node.position.y / config.canvasHeight) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }"
            @click="handleNodeClick(node)"
          >
            {{ node.display }}
          </button>
        </div>
      </div>

      <!-- 回饋訊息 -->
      <div
        v-if="feedbackData?.show"
        class="feedback-toast fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-xl text-lg font-medium z-50"
        :class="{
          'bg-green-500 text-white': feedbackData.type === 'correct',
          'bg-red-500 text-white': feedbackData.type === 'wrong',
        }"
      >
        {{ feedbackData.message }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.node-btn:active {
  transform: translate(-50%, -50%) scale(0.95) !important;
}
</style>
