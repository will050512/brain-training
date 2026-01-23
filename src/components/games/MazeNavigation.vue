<script setup lang="ts">
/**
 * 皇家花園漫步 (Royal Garden Walk)
 * * 修正：
 * 1. 更新說明文字以符合遊戲註冊資訊。
 * 2. 調整顏色：起點為綠色，終點為紅色。
 * 3. 尺寸支援 7/9/11。
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
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
  DIFFICULTY_CONFIGS,
  type MazeState,
  type MazeConfig,
  type Direction,
} from '@/games/logic/mazeNavigation'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

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

const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isMobile } = useResponsive()

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
  resetGame,
  addScore,
} = useGameState({ totalRounds: 1 })

const {
  time: elapsedTime,
  start: startTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({ mode: 'stopwatch', initialTime: 0 })

const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

const mazeState = ref<MazeState | null>(null)
const moves = ref(0)
const shakeCellIndex = ref<number | null>(null)
const lastMoveDir = ref<Direction | null>(null)

// ===== 佈局計算 =====
const gameContainerRef = ref<HTMLElement | null>(null)
const cellSize = ref(40)
const isLandscapeLayout = ref(false)

const resizeObserver = new ResizeObserver(() => {
  calculateLayout()
})

function calculateLayout() {
  if (!gameContainerRef.value || !mazeState.value) return

  const container = gameContainerRef.value
  const size = mazeState.value.size
  const w = container.clientWidth
  const h = container.clientHeight

  isLandscapeLayout.value = w > h && h < 600

  let availableW = w
  let availableH = h
  
  if (isLandscapeLayout.value) {
    availableW = w - 160
    availableH = h - 20
  } else {
    availableH = h - 180
    availableW = w - 20
  }

  const maxCellW = Math.floor(availableW / size)
  const maxCellH = Math.floor(availableH / size)
  
  cellSize.value = Math.max(20, Math.min(maxCellW, maxCellH, 80))
}

// 觸控手勢
const { handlers: touchHandlers } = useTouchGesture({
  threshold: 30,
  preventDefault: true,
  onSwipe: (direction: SwipeDirection) => {
    if (!isPlaying.value || !direction) return
    handleMove(direction as Direction)
  },
})

// ===== 計算屬性 =====
const gridSize = computed(() => mazeState.value?.size || config.value.size)
const cells = computed(() => mazeState.value?.cells || [])
const playerPosition = computed(() => mazeState.value?.playerPosition || 0)
const visitedSet = computed(() => new Set(mazeState.value?.visitedPath || []))

const difficultyLabel = computed(() => {
  switch (props.difficulty) {
    case 'easy': return '散步模式'
    case 'medium': return '賞花模式'
    case 'hard': return '迷宮挑戰'
    default: return '散步模式'
  }
})

// ===== 遊戲流程 =====
function handleStart() {
  mazeState.value = generateMaze(config.value)
  moves.value = 0
  lastMoveDir.value = null
  startGameState()
  resetTimer()
  startTimer()
  emit('game-start')
  
  nextTick(() => {
    calculateLayout()
    if (gameContainerRef.value) {
      resizeObserver.observe(gameContainerRef.value)
    }
  })
}

function handleMove(direction: Direction) {
  if (!isPlaying.value || !mazeState.value) return
  
  if (!canMove(mazeState.value, direction)) {
    playWrong()
    const targetIdx = getTargetIndex(mazeState.value.playerPosition, direction, mazeState.value.size)
    if (targetIdx !== null) triggerShake(targetIdx)
    return
  }
  
  lastMoveDir.value = direction
  const newState = move(mazeState.value, direction)
  if (newState) {
    mazeState.value = newState
    moves.value++
    if (hasReachedEnd(newState)) handleGameEnd()
  }
}

function handleCellClick(index: number) {
  if (!isPlaying.value || !mazeState.value) return
  
  const current = mazeState.value.playerPosition
  const size = mazeState.value.size
  const { row: cr, col: cc } = indexToPosition(current, size)
  const { row: tr, col: tc } = indexToPosition(index, size)

  const dr = tr - cr
  const dc = tc - cc
  
  if (Math.abs(dr) + Math.abs(dc) === 1) {
    let dir: Direction | null = null
    if (dr === -1) dir = 'up'
    if (dr === 1) dir = 'down'
    if (dc === -1) dir = 'left'
    if (dc === 1) dir = 'right'
    
    if (dir) handleMove(dir)
  }
}

function getTargetIndex(current: number, dir: Direction, size: number): number | null {
  const { row, col } = indexToPosition(current, size)
  let tr = row, tc = col
  if (dir === 'up') tr--
  if (dir === 'down') tr++
  if (dir === 'left') tc--
  if (dir === 'right') tc++
  if (tr < 0 || tr >= size || tc < 0 || tc >= size) return null
  return tr * size + tc
}

function triggerShake(index: number) {
  shakeCellIndex.value = index
  setTimeout(() => shakeCellIndex.value = null, 400)
}

function handleGameEnd() {
  stopTimer()
  playCorrect() 
  setTimeout(() => playEnd(), 500)
  resizeObserver.disconnect()

  if (!mazeState.value) return

  const optimalMoves = getShortestPathLength(
    mazeState.value.cells,
    mazeState.value.size,
    mazeState.value.startPosition,
    mazeState.value.endPosition
  )
  
  const result = summarizeResult(
    moves.value,
    elapsedTime.value,
    config.value.size,
    optimalMoves
  )
  
  addScore(result.score - score.value)
  finishGameState()
  emit('game-end', result)
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isPlaying.value) return
  const keyMap: Record<string, Direction> = {
    'ArrowUp': 'up', 'w': 'up', 'W': 'up',
    'ArrowDown': 'down', 's': 'down', 'S': 'down',
    'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
    'ArrowRight': 'right', 'd': 'right', 'D': 'right',
  }
  const direction = keyMap[event.key]
  if (direction) {
    event.preventDefault()
    handleMove(direction)
  }
}

onMounted(() => {
  preloadDefaultSounds()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', calculateLayout)
})

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
  window.removeEventListener('resize', calculateLayout)
  resizeObserver.disconnect()
  cleanupThrottle()
})

watch(() => [props.difficulty, props.subDifficulty], () => {
  if (phase.value !== 'ready') {
    stopTimer()
    resetGame()
  }
})
</script>

<template>
  <div 
      class="garden-walk-game game-root maze-shell w-full h-full flex flex-col overflow-hidden relative"
    >
    <!-- 背景裝飾 -->
    <div class="absolute inset-0 pointer-events-none opacity-10 pattern-grid"></div>

    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="皇家花園"
      icon="🧭"
      :description="`規劃路線走出迷宮。\n從起點 (綠色) 走到終點 (紅色)。\n可以直接點擊主角旁邊的格子，或使用按鈕移動。`"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
      class="z-20"
    />

    <!-- 遊戲區域 -->
    <div 
      v-else
      class="w-full h-full flex z-10"
      :class="isLandscapeLayout ? 'flex-row' : 'flex-col'"
      ref="gameContainerRef"
    >
      <!-- 1. 資訊列 -->
      <div 
        class="info-bar shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-stone-200"
        :class="isLandscapeLayout ? 'hidden' : 'block'"
      >
        <div class="flex items-center gap-2">
           <span class="text-xl">🧭</span>
           <span class="font-bold text-stone-700">{{ difficultyLabel }}</span>
        </div>
        <div class="bg-amber-100 rounded-full px-3 py-1 text-sm font-bold text-amber-800 flex items-center gap-2 border border-amber-200">
          <span>👣</span>
          <span>{{ moves }} 步</span>
        </div>
      </div>

      <!-- 2. 迷宮顯示區 -->
      <div 
        class="maze-viewport flex-1 flex items-center justify-center p-2 relative overflow-hidden"
        v-on="touchHandlers"
      >
        <!-- 迷宮 Grid -->
        <div
          v-if="mazeState"
          class="garden-grid relative shadow-2xl rounded-xl overflow-hidden bg-[#8D6E63]"
          :style="{
            width: `${gridSize * cellSize}px`,
            height: `${gridSize * cellSize}px`,
            border: `${Math.max(4, cellSize * 0.1)}px solid #5D4037`
          }"
        >
          <div
            v-for="(type, index) in cells"
            :key="index"
            class="absolute transition-all duration-200"
            :class="{
              'cursor-pointer': type !== 'wall',
              'hover:brightness-110': type !== 'wall'
            }"
            :style="{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${(index % gridSize) * cellSize}px`,
              top: `${Math.floor(index / gridSize) * cellSize}px`,
            }"
            @click="handleCellClick(index)"
          >
            <!-- 格子背景 -->
            <div class="w-full h-full" :class="`bg-${type}`"></div>

            <!-- 足跡 -->
            <div 
              v-if="visitedSet.has(index) && index !== playerPosition && type !== 'start'" 
              class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
            >
              <div class="w-1/3 h-1/3 rounded-full bg-amber-900/50"></div>
            </div>

            <!-- 物件層 -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <!-- 主角 -->
              <span 
                v-if="index === playerPosition" 
                class="text-[1.2em] leading-none filter drop-shadow-md transition-transform duration-200"
                :style="{ fontSize: `${cellSize * 0.7}px` }"
              >
                🧑‍🌾
              </span>
              <!-- 終點 -->
              <span 
                v-else-if="type === 'end'" 
                class="text-[1.2em] leading-none animate-bounce text-red-700"
                :style="{ fontSize: `${cellSize * 0.6}px` }"
              >
                🚩
              </span>
              <!-- 起點標記 -->
              <span 
                v-else-if="type === 'start'" 
                class="font-bold text-green-900/60 select-none"
                :style="{ fontSize: `${cellSize * 0.3}px` }"
              >
                START
              </span>
            </div>
          </div>
        </div>

        <!-- 提示文字 -->
        <div v-if="moves === 0" class="absolute bottom-4 bg-black/60 text-white px-4 py-2 rounded-full text-sm animate-pulse pointer-events-none">
          點擊鄰近格子或滑動螢幕移動
        </div>
      </div>

      <!-- 3. 控制面板 -->
      <div 
        class="controls-panel shrink-0 bg-[var(--color-surface-alt)] border-stone-300 p-3 flex items-center justify-center"
        :class="[
          isLandscapeLayout ? 'w-40 border-l flex-col justify-center gap-4' : 'w-full border-t pb-safe'
        ]"
      >
        <div v-if="isLandscapeLayout" class="mb-4 text-center">
          <div class="text-stone-700 font-bold mb-2">{{ difficultyLabel }}</div>
          <div class="bg-white rounded-lg px-2 py-1 text-sm font-bold text-stone-600 border border-stone-200">
            👣 {{ moves }}
          </div>
        </div>

        <div class="d-pad grid grid-cols-3 gap-2">
          <div></div>
          <button class="d-btn" @click="handleMove('up')" aria-label="上">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>
          </button>
          <div></div>
          
          <button class="d-btn" @click="handleMove('left')" aria-label="左">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M4 12l8-8v6h8v4h-8v6z"/></svg>
          </button>
          <div class="flex items-center justify-center">
            <div class="w-4 h-4 rounded-full bg-stone-400/50"></div>
          </div>
          <button class="d-btn" @click="handleMove('right')" aria-label="右">
             <svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M20 12l-8 8v-6H4v-4h8V4z"/></svg>
          </button>
          
          <div></div>
          <button class="d-btn" @click="handleMove('down')" aria-label="下">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M12 20l8-8h-6V4h-4v8H4z"/></svg>
          </button>
          <div></div>
        </div>
      </div>
    </div>

    <GameFeedback
        v-if="feedback && showFeedback"
        :type="feedback.type"
        :show="showFeedback"
        :message="feedback.message"
      />
  </div>
</template>

<style scoped>
.pattern-grid {
  background-image: radial-gradient(#A1887F 1px, transparent 1px);
  background-size: 20px 20px;
}

.maze-shell {
  background:
    radial-gradient(420px 220px at 10% 0%, rgba(56, 189, 248, 0.18), transparent 60%),
    radial-gradient(420px 240px at 90% 10%, rgba(34, 197, 94, 0.18), transparent 60%),
    var(--color-bg-soft);
}

.bg-wall {
  background-color: #2E7D32;
  background-image: 
    radial-gradient(circle at 50% 50%, #388E3C 20%, transparent 25%),
    radial-gradient(circle at 0% 0%, #1B5E20 20%, transparent 25%),
    radial-gradient(circle at 100% 100%, #1B5E20 20%, transparent 25%);
  background-size: 10px 10px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
  border-radius: 4px;
}

.bg-path {
  background-color: #FFF9C4;
  background-image: linear-gradient(45deg, #F1F8E9 25%, transparent 25%, transparent 50%, #F1F8E9 50%, #F1F8E9 75%, transparent 75%, transparent);
  background-size: 20px 20px;
  border: 1px solid rgba(0,0,0,0.05);
}

/* 起點：綠色 */
.bg-start { 
  background-color: #A5D6A7; 
  background-image: linear-gradient(135deg, #81C784 25%, transparent 25%);
  background-size: 10px 10px;
  border: 1px solid rgba(0,100,0,0.1);
}

/* 終點：紅色 */
.bg-end { 
  background-color: #EF9A9A;
  background-image: linear-gradient(135deg, #E57373 25%, transparent 25%);
  background-size: 10px 10px;
  border: 1px solid rgba(100,0,0,0.1);
}

.d-btn {
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5D4037;
  box-shadow: 0 4px 0 #A1887F, 0 5px 10px rgba(0,0,0,0.2);
  transition: all 0.1s;
}

.d-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 #A1887F, inset 0 2px 5px rgba(0,0,0,0.1);
  background: #EFEBE9;
}

@media (min-width: 640px) {
  .d-btn { width: 70px; height: 70px; }
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
</style>
