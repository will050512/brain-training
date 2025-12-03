<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-gray-600">使用方向鍵或點擊按鈕，幫助角色走出迷宮！</p>
      <p class="text-sm text-gray-500">🟢 起點 → 🔴 終點</p>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-gray-500">步數：</span>
        <span class="font-bold text-blue-600">{{ moves }}</span>
      </div>
      <div class="text-lg">
        <span class="text-gray-500">時間：</span>
        <span class="font-bold">{{ formatTime(elapsedTime) }}</span>
      </div>
    </div>

    <!-- 迷宮 -->
    <div class="maze-container" v-if="isPlaying || isFinished">
      <div 
        class="maze"
        :style="{ 
          gridTemplateColumns: `repeat(${mazeSize}, 1fr)`,
          gridTemplateRows: `repeat(${mazeSize}, 1fr)`,
        }"
      >
        <div
          v-for="(cell, index) in maze"
          :key="index"
          class="cell"
          :class="getCellClass(cell, index)"
        >
          <!-- 玩家 -->
          <transition name="move">
            <span 
              v-if="playerPosition === index" 
              class="player text-2xl md:text-3xl"
            >
              🚶
            </span>
          </transition>
          <!-- 終點 -->
          <span v-if="cell === 'end'" class="text-xl md:text-2xl">🎯</span>
        </div>
      </div>
    </div>

    <!-- 控制按鈕（觸控友好） -->
    <div v-if="isPlaying" class="controls mt-6">
      <div class="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <div></div>
        <button 
          @click="move('up')" 
          class="control-btn"
          :disabled="!canMove('up')"
        >
          ⬆️
        </button>
        <div></div>
        <button 
          @click="move('left')" 
          class="control-btn"
          :disabled="!canMove('left')"
        >
          ⬅️
        </button>
        <button 
          @click="move('down')" 
          class="control-btn"
          :disabled="!canMove('down')"
        >
          ⬇️
        </button>
        <button 
          @click="move('right')" 
          class="control-btn"
          :disabled="!canMove('right')"
        >
          ➡️
        </button>
      </div>
    </div>

    <!-- 開始按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🧭
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
    easy: { size: 7, complexity: 0.3 },
    medium: { size: 9, complexity: 0.4 },
    hard: { size: 11, complexity: 0.5 },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 遊戲狀態
type CellType = 'path' | 'wall' | 'start' | 'end'

const maze = ref<CellType[]>([])
const mazeSize = computed(() => difficultyConfig.value.size)
const isPlaying = ref(false)
const isFinished = ref(false)
const playerPosition = ref(0)
const moves = ref(0)
const elapsedTime = ref(0)

// 計時器
let timer: ReturnType<typeof setInterval> | null = null

// 格式化時間
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 生成迷宮（簡化版）
function generateMaze(): void {
  const size = mazeSize.value
  const cells: CellType[] = new Array(size * size).fill('wall')

  // 使用遞歸回溯法生成迷宮
  const visited = new Set<number>()
  const stack: number[] = []
  
  // 起點
  const start = size + 1
  cells[start] = 'start'
  visited.add(start)
  stack.push(start)

  // 終點（右下角區域）
  const end = (size - 2) * size + (size - 2)
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    if (current === undefined) break
    
    const neighbors = getUnvisitedNeighbors(current, visited, size)
    
    if (neighbors.length > 0) {
      const nextIdx = Math.floor(Math.random() * neighbors.length)
      const next = neighbors[nextIdx]
      if (next === undefined) continue
      
      // 打通牆壁
      const wallIndex = getWallBetween(current, next, size)
      cells[wallIndex] = 'path'
      cells[next] = 'path'
      
      visited.add(wallIndex)
      visited.add(next)
      stack.push(next)
    } else {
      stack.pop()
    }
  }

  // 確保終點可達
  cells[end] = 'end'
  
  // 確保終點附近有通路
  const endNeighbors = [end - 1, end - size]
  for (const n of endNeighbors) {
    if (n >= 0 && n < size * size) {
      cells[n] = 'path'
    }
  }

  maze.value = cells
}

// 獲取未訪問的鄰居（步長為2）
function getUnvisitedNeighbors(index: number, visited: Set<number>, size: number): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const neighbors: number[] = []

  const directions = [
    { dr: -2, dc: 0 },  // 上
    { dr: 2, dc: 0 },   // 下
    { dr: 0, dc: -2 },  // 左
    { dr: 0, dc: 2 },   // 右
  ]

  for (const { dr, dc } of directions) {
    const newRow = row + dr
    const newCol = col + dc
    const newIndex = newRow * size + newCol

    if (
      newRow > 0 && newRow < size - 1 &&
      newCol > 0 && newCol < size - 1 &&
      !visited.has(newIndex)
    ) {
      neighbors.push(newIndex)
    }
  }

  return neighbors
}

// 獲取兩個格子之間的牆
function getWallBetween(a: number, b: number, size: number): number {
  const aRow = Math.floor(a / size)
  const aCol = a % size
  const bRow = Math.floor(b / size)
  const bCol = b % size

  return ((aRow + bRow) / 2) * size + (aCol + bCol) / 2
}

// 獲取格子樣式
function getCellClass(cell: CellType, index: number): string {
  const classes: string[] = []

  if (cell === 'wall') {
    classes.push('bg-gray-700')
  } else if (cell === 'start') {
    classes.push('bg-green-400')
  } else if (cell === 'end') {
    classes.push('bg-red-400')
  } else {
    classes.push('bg-amber-100')
  }

  if (playerPosition.value === index) {
    classes.push('ring-2 ring-blue-500')
  }

  return classes.join(' ')
}

// 判斷能否移動
function canMove(direction: 'up' | 'down' | 'left' | 'right'): boolean {
  const size = mazeSize.value
  const pos = playerPosition.value
  const row = Math.floor(pos / size)
  const col = pos % size

  let targetIndex: number

  switch (direction) {
    case 'up':
      targetIndex = pos - size
      if (row <= 0) return false
      break
    case 'down':
      targetIndex = pos + size
      if (row >= size - 1) return false
      break
    case 'left':
      targetIndex = pos - 1
      if (col <= 0) return false
      break
    case 'right':
      targetIndex = pos + 1
      if (col >= size - 1) return false
      break
  }

  return maze.value[targetIndex] !== 'wall'
}

// 移動
function move(direction: 'up' | 'down' | 'left' | 'right'): void {
  if (!isPlaying.value || !canMove(direction)) return

  const size = mazeSize.value

  switch (direction) {
    case 'up':
      playerPosition.value -= size
      break
    case 'down':
      playerPosition.value += size
      break
    case 'left':
      playerPosition.value -= 1
      break
    case 'right':
      playerPosition.value += 1
      break
  }

  moves.value++
  emit('score-change', moves.value)

  // 檢查是否到達終點
  if (maze.value[playerPosition.value] === 'end') {
    endGame()
  }
}

// 鍵盤控制
function handleKeydown(e: KeyboardEvent): void {
  if (!isPlaying.value) return

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault()
      move('up')
      break
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault()
      move('down')
      break
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault()
      move('left')
      break
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault()
      move('right')
      break
  }
}

// 開始遊戲
function startGame(): void {
  generateMaze()
  isPlaying.value = true
  isFinished.value = false
  moves.value = 0
  elapsedTime.value = 0

  // 設置玩家起始位置
  const startIndex = maze.value.findIndex(cell => cell === 'start')
  playerPosition.value = startIndex

  // 開始計時
  timer = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  if (timer) clearInterval(timer)

  // 計算最佳步數（曼哈頓距離的估算）
  const size = mazeSize.value
  const optimalMoves = (size - 2) * 2

  // 效率分數
  const efficiency = Math.max(0, 1 - (moves.value - optimalMoves) / (optimalMoves * 2))
  
  // 時間分數
  const timeScore = Math.max(0, 1 - elapsedTime.value / (size * 15))

  // 最終分數：效率 60% + 時間 40%
  const finalScore = Math.round((efficiency * 60 + timeScore * 40))

  const result: GameResult = {
    gameId: 'maze-navigation',
    difficulty: props.difficulty,
    score: Math.min(100, Math.max(0, finalScore)),
    maxScore: 100,
    correctCount: 1, // 完成即成功
    totalCount: 1,
    accuracy: 1,
    avgReactionTime: Math.round((elapsedTime.value * 1000) / moves.value),
    duration: elapsedTime.value,
    timestamp: new Date(),
  }

  emit('game-end', result)
}

// 生命週期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.maze-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.maze {
  display: grid;
  gap: 2px;
  background: #374151;
  padding: 4px;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
}

.cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 30px;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.player {
  animation: bounce 0.5s infinite alternate;
}

.control-btn {
  width: 60px;
  height: 60px;
  font-size: 1.5rem;
  background: linear-gradient(145deg, #f0f0f0, #e0e0e0);
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.control-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-enter-active,
.move-leave-active {
  transition: all 0.15s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-3px); }
}

@media (max-width: 640px) {
  .cell {
    min-width: 25px;
    min-height: 25px;
  }
  
  .control-btn {
    width: 50px;
    height: 50px;
  }
}
</style>
