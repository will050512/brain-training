<script setup lang="ts">
/**
 * 迷宮導航遊戲（重構版）
 * 使用新的遊戲核心架構
 * 支援觸控滑動手勢控制
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useTouchGesture, type SwipeDirection } from '@/composables/useTouchGesture'
import { useResponsive } from '@/composables/useResponsive'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateMaze,
  move,
  canMove,
  hasReachedEnd,
  indexToPosition,
  getCellType,
  getShortestPathLength,
  summarizeResult,
  calculateGrade,
  DIFFICULTY_CONFIGS,
  type MazeState,
  type MazeConfig,
  type Direction,
} from '@/games/logic/mazeNavigation'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

import playerImg from '@/assets/images/maze-navigation/player.svg'
import exitImg from '@/assets/images/maze-navigation/exit.svg'
import wallImg from '@/assets/images/maze-navigation/wall.svg'
import pathImg from '@/assets/images/maze-navigation/path.svg'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
  subDifficulty?: SubDifficulty
  autoStart?: boolean
}>(), {
  difficulty: 'easy',
  subDifficulty: 2,
  autoStart: false,
})

const emit = defineEmits<{
  'game-start': []
  'game-end': [result: any]
  'score-change': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()

// ===== 遊戲配置 =====
const baseConfig = computed<MazeConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<MazeConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})

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

// ===== 正計時器 =====
const {
  time: elapsedTime,
  start: startTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'stopwatch',
  initialTime: 0,
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const mazeState = ref<MazeState | null>(null)
const moves = ref(0)
const gameAreaRef = ref<HTMLElement | null>(null)

// ===== 觸控手勢偵測 =====
const { handlers: touchHandlers } = useTouchGesture({
  threshold: 30,
  preventDefault: true,
  onSwipe: (direction: SwipeDirection) => {
    if (!isPlaying.value || !direction) return
    handleMove(direction as Direction)
  },
})

// ===== 計算屬性 =====
const gridSize = computed(() => config.value.size)
const cells = computed(() => mazeState.value?.cells || [])
const playerPosition = computed(() => mazeState.value?.playerPosition || 0)
const playerPos = computed(() => indexToPosition(playerPosition.value, gridSize.value))
const mazeWidth = computed(() => Math.min(gridSize.value * 35, Math.min(window.innerWidth - 40, 350)))

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
  '使用方向鍵或點擊按鈕移動',
  '在螢幕上滑動也可控制方向',
  '從起點（綠色）走到終點（紅色）',
  '規劃最短路線可獲得更高分數',
]

// ===== 遊戲方法 =====
function handleStart() {
  // 生成迷宮
  mazeState.value = generateMaze(config.value)
  moves.value = 0
  
  // 開始遊戲
  startGame()
  resetTimer()
  startTimer()
}

function handleMove(direction: Direction) {
  if (!isPlaying.value || !mazeState.value) return
  
  if (!canMove(mazeState.value, direction)) {
    playWrong()
    return
  }
  
  const newState = move(mazeState.value, direction)
  if (newState) {
    mazeState.value = newState
    moves.value++
    
    // 檢查是否到達終點
    if (hasReachedEnd(newState)) {
      playCorrect()
      handleGameEnd()
    }
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isPlaying.value) return
  
  const keyMap: Record<string, Direction> = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'w': 'up',
    'W': 'up',
    's': 'down',
    'S': 'down',
    'a': 'left',
    'A': 'left',
    'd': 'right',
    'D': 'right',
  }
  
  const direction = keyMap[event.key]
  if (direction) {
    event.preventDefault()
    handleMove(direction)
  }
}

function handleGameEnd() {
  stopTimer()
  playEnd()

  const optimalMoves = mazeState.value
    ? getShortestPathLength(
        mazeState.value.cells,
        mazeState.value.size,
        mazeState.value.startPosition,
        mazeState.value.endPosition
      )
    : config.value.size * 2
  
  const result = summarizeResult(
    moves.value,
    elapsedTime.value,
    config.value.size,
    optimalMoves
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  window.addEventListener('keydown', handleKeyDown)
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: elapsedTime.value,
      score: score.value,
      showTimer: true,
      showScore: false,
      showProgress: false
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  cleanupThrottle()
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    resetGame()
  }
})
</script>

<template>
  <div class="maze-navigation-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="迷宮導航"
      icon="🧭"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
      <div class="game-info flex justify-center gap-6 mt-4 text-sm">
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">步數：</span>
          <span class="font-bold">{{ moves }}</span>
        </div>
      </div>

      <!-- 迷宮（含觸控手勢偵測區域） -->
      <div
        ref="gameAreaRef"
        class="maze-container mt-4 sm:mt-6 flex justify-center touch-area px-2"
        v-if="mazeState"
        v-on="touchHandlers"
      >
        <div
          class="maze-grid"
          :style="{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: `${mazeWidth}px`,
            maxWidth: '100%'
          }"
        >
          <div
            v-for="(_, index) in cells"
            :key="index"
            class="maze-cell aspect-square min-h-[25px] sm:min-h-[30px] md:min-h-[35px]"
            :class="{
              'cell-wall': getCellType(mazeState!, index) === 'wall',
              'cell-path': getCellType(mazeState!, index) === 'path',
              'cell-start': getCellType(mazeState!, index) === 'start',
              'cell-end': getCellType(mazeState!, index) === 'end',
              'cell-player': index === playerPosition,
            }"
          >
            <span v-if="index === playerPosition" class="text-lg sm:text-xl">🏃</span>
            <img v-else-if="getCellType(mazeState!, index) === 'end'" class="maze-icon" :src="exitImg" alt="" aria-hidden="true" />
          </div>
        </div>
      </div>

      <!-- 方向控制 -->
      <div class="controls mt-4 sm:mt-6 flex flex-col items-center gap-2 px-4">
        <button
          class="control-btn min-h-[48px] w-12 sm:w-14 md:w-16 text-lg sm:text-xl md:text-2xl"
          @click="handleMove('up')"
          :disabled="!mazeState || !canMove(mazeState, 'up')"
        >
          ↑
        </button>
        <div class="flex gap-2 sm:gap-3">
          <button
            class="control-btn min-h-[48px] w-12 sm:w-14 md:w-16 text-lg sm:text-xl md:text-2xl"
            @click="handleMove('left')"
            :disabled="!mazeState || !canMove(mazeState, 'left')"
          >
            ←
          </button>
          <button
            class="control-btn min-h-[48px] w-12 sm:w-14 md:w-16 text-lg sm:text-xl md:text-2xl"
            @click="handleMove('down')"
            :disabled="!mazeState || !canMove(mazeState, 'down')"
          >
            ↓
          </button>
          <button
            class="control-btn min-h-[48px] w-12 sm:w-14 md:w-16 text-lg sm:text-xl md:text-2xl"
            @click="handleMove('right')"
            :disabled="!mazeState || !canMove(mazeState, 'right')"
          >
            →
          </button>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
          滑動螢幕或使用鍵盤方向鍵
        </p>
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
.maze-container {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.touch-area {
  min-height: clamp(220px, 40vh, 300px);
  padding: 1rem;
  border-radius: 12px;
  background: var(--color-surface);
}

.maze-grid {
  display: grid;
  gap: 1px;
  background: #333;
  padding: 1px;
  border-radius: 8px;
}

.maze-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  background-size: cover;
  background-position: center;
}

.cell-wall {
  background-image: url(v-bind(wallImg));
  background-color: #4a5568;
}

.cell-path {
  background-image: url(v-bind(pathImg));
  background-color: #e2e8f0;
}

.cell-start {
  background: #48bb78;
}

.cell-end {
  background: #f56565;
}

.cell-player {
  background: #4299e1;
}

.maze-icon {
  width: clamp(16px, 4vw, 28px);
  height: clamp(16px, 4vw, 28px);
}

.dark .cell-path {
  background: #2d3748;
}

.control-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 手機版觸控控制提示 */
@media (hover: none) and (pointer: coarse) {
  .touch-area {
    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-soft) 100%);
    border: 2px dashed var(--color-border);
  }
  
  .touch-area::after {
    content: '👆 滑動控制';
    display: block;
    text-align: center;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }
}

/* 響應式控制按鈕 */
@media (max-width: 640px) {
  .control-btn {
    width: 56px;
    height: 56px;
    font-size: 1.75rem;
  }
}
</style>


