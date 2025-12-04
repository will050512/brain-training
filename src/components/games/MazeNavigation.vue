<script setup lang="ts">
/**
 * 迷宮導航遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import {
  generateMaze,
  move,
  canMove,
  hasReachedEnd,
  indexToPosition,
  getCellType,
  summarizeResult,
  calculateGrade,
  DIFFICULTY_CONFIGS,
  type MazeState,
  type MazeConfig,
  type Direction,
} from '@/games/logic/mazeNavigation'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameResultScreen from './ui/GameResultScreen.vue'
import GameStatusBar from './ui/GameStatusBar.vue'
import GameFeedback from './ui/GameFeedback.vue'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
}>(), {
  difficulty: 'easy'
})

const emit = defineEmits<{
  'game:start': []
  'game:end': [result: any]
  'score:update': [score: number]
  'state:change': [phase: string]
}>()

// ===== 遊戲配置 =====
const config = computed<MazeConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
  emit('game:start')
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

// ===== 計算屬性 =====
const gridSize = computed(() => config.value.size)
const cells = computed(() => mazeState.value?.cells || [])
const playerPosition = computed(() => mazeState.value?.playerPosition || 0)
const playerPos = computed(() => indexToPosition(playerPosition.value, gridSize.value))

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
  '從起點（綠色）走到終點（紅色）',
  '規劃最短路線可獲得更高分數',
  '支援鍵盤 WASD 或方向鍵控制',
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
  
  const result = summarizeResult(
    moves.value,
    elapsedTime.value,
    config.value.size
  )
  
  finishGame()
  emit('game:end', result)
}

function handleRestart() {
  stopTimer()
  resetGame()
  handleStart()
}

function handleQuit() {
  stopTimer()
  resetGame()
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
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
  <div class="maze-navigation-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="迷宮導航"
      icon="🧭"
      :rules="gameInstructions"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 狀態列 -->
      <GameStatusBar
        :time="elapsedTime"
        show-timer
      />

      <!-- 遊戲資訊 -->
      <div class="game-info flex justify-center gap-6 mt-4 text-sm">
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">步數：</span>
          <span class="font-bold">{{ moves }}</span>
        </div>
      </div>

      <!-- 迷宮 -->
      <div 
        class="maze-container mt-6 flex justify-center"
        v-if="mazeState"
      >
        <div 
          class="maze-grid"
          :style="{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: `${Math.min(gridSize * 40, 400)}px`
          }"
        >
          <div
            v-for="(_, index) in cells"
            :key="index"
            class="maze-cell aspect-square"
            :class="{
              'cell-wall': getCellType(mazeState!, index) === 'wall',
              'cell-path': getCellType(mazeState!, index) === 'path',
              'cell-start': getCellType(mazeState!, index) === 'start',
              'cell-end': getCellType(mazeState!, index) === 'end',
              'cell-player': index === playerPosition,
            }"
          >
            <span v-if="index === playerPosition" class="text-xl">🏃</span>
            <span v-else-if="getCellType(mazeState!, index) === 'end'" class="text-lg">🏁</span>
          </div>
        </div>
      </div>

      <!-- 方向控制 -->
      <div class="controls mt-6 flex flex-col items-center gap-2">
        <button
          class="control-btn"
          @click="handleMove('up')"
          :disabled="!mazeState || !canMove(mazeState, 'up')"
        >
          ↑
        </button>
        <div class="flex gap-2">
          <button
            class="control-btn"
            @click="handleMove('left')"
            :disabled="!mazeState || !canMove(mazeState, 'left')"
          >
            ←
          </button>
          <button
            class="control-btn"
            @click="handleMove('down')"
            :disabled="!mazeState || !canMove(mazeState, 'down')"
          >
            ↓
          </button>
          <button
            class="control-btn"
            @click="handleMove('right')"
            :disabled="!mazeState || !canMove(mazeState, 'right')"
          >
            →
          </button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          也可使用鍵盤方向鍵或 WASD
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

    <!-- 結果畫面 -->
    <GameResultScreen
      v-else-if="phase === 'finished' || phase === 'result'"
      :score="score"
      :time-spent="elapsedTime"
      :grade="calculateGrade(score) as 'S' | 'A' | 'B' | 'C' | 'D' | 'F'"
      :custom-stats="[
        { label: '步數', value: moves, icon: '👣' },
        { label: '花費時間', value: `${elapsedTime}秒`, icon: '⏱️' },
      ]"
      @replay="handleRestart"
      @back="handleQuit"
    />
  </div>
</template>

<style scoped>
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
}

.cell-wall {
  background: #4a5568;
}

.cell-path {
  background: #e2e8f0;
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
</style>
