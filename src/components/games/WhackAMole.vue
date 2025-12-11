<script setup lang="ts">
/**
 * 打地鼠遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
import {
  createInitialHoles,
  findInactiveHoles,
  determineSpawnType,
  spawnAtHole,
  processHoleClick,
  clearHoleAfterHit,
  hideHole,
  summarizeResult,
  calculateGrade,
  DIFFICULTY_CONFIGS,
  type Hole,
  type WhackAMoleConfig,
} from '@/games/logic/whackAMole'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

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
const { throttledEmit, immediateEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)

// ===== 遊戲配置 =====
const config = computed<WhackAMoleConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  combo,
  maxCombo,
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
  totalRounds: 0, // 打地鼠沒有回合數限制
  timeLimit: config.value.gameTime,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 倒數計時器 =====
const {
  time: timeLeft,
  isWarning: timerWarning,
  start: startTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'countdown',
  initialTime: config.value.gameTime,
  warningTime: 10,
  onTimeUp: () => handleTimeUp(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const holes = ref<Hole[]>([])
const currentCombo = ref(0)
const currentMaxCombo = ref(0)
const hitMoles = ref(0)
const totalMoles = ref(0)
const hitBombs = ref(0)
const reactionTimes = ref<number[]>([])
let lastMoleTime = 0
let spawnTimer: ReturnType<typeof setInterval> | null = null

// ===== 計算屬性 =====
const gridClass = computed(() => {
  const holeCount = config.value.holes
  if (holeCount <= 6) return 'grid-cols-3'
  return 'grid-cols-3'
})

const displayScore = computed(() => score.value)

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: timeLeft.value,
      score: score.value,
      combo: currentCombo.value,
      correctCount: hitMoles.value,
      wrongCount: hitBombs.value,
      showTimer: true,
      showScore: true,
      showCounts: true,
      showCombo: currentCombo.value > 1
    })
  }
})

// ===== 回饋映射 =====
const feedbackData = computed(() => {
  if (!feedback.value) return undefined
  return {
    type: feedback.value.type,
    show: showFeedback.value,
    message: feedback.value.message,
    score: feedback.value.score,
    combo: feedback.value.combo,
  }
})

// ===== 遊戲說明 =====
const gameInstructions = [
  '點擊「開始遊戲」按鈕',
  '當地鼠 🐹 出現時，快速點擊它',
  '小心避開炸彈 💣，點到會扣分',
  '連續擊中可獲得連擊加成',
]

// ===== 遊戲方法 =====
function handleStart() {
  // 初始化狀態
  holes.value = createInitialHoles(config.value.holes)
  currentCombo.value = 0
  currentMaxCombo.value = 0
  hitMoles.value = 0
  totalMoles.value = 0
  hitBombs.value = 0
  reactionTimes.value = []
  lastMoleTime = Date.now()
  
  // 開始遊戲
  startGame()
  resetTimer(config.value.gameTime)
  startTimer()
  
  // 開始生成地鼠
  spawnMole()
  spawnTimer = setInterval(spawnMole, config.value.interval)
}

function spawnMole() {
  if (!isPlaying.value) return
  
  const inactiveIndices = findInactiveHoles(holes.value)
  if (inactiveIndices.length === 0) return
  
  const randomIdx = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)]
  if (randomIdx === undefined) return
  
  const spawnType = determineSpawnType(config.value.bombChance)
  holes.value = spawnAtHole(holes.value, randomIdx, spawnType)
  
  if (spawnType === 'mole') {
    totalMoles.value++
    lastMoleTime = Date.now()
  }
  
  // 自動消失
  setTimeout(() => {
    const hole = holes.value[randomIdx]
    if (hole && hole.active && !hole.hit) {
      holes.value = hideHole(holes.value, randomIdx)
      if (hole.type === 'mole') {
        currentCombo.value = 0 // 漏掉地鼠，連擊歸零
      }
    }
  }, config.value.duration)
}

function handleHoleClick(index: number) {
  if (!isPlaying.value) return
  
  const hole = holes.value[index]
  if (!hole || !hole.active || hole.hit) return
  
  const reactionTime = Date.now() - lastMoleTime
  
  const result = processHoleClick(
    holes.value,
    index,
    config.value,
    currentCombo.value
  )
  
  holes.value = result.holes
  currentCombo.value = result.newCombo
  
  if (result.isMoleHit) {
    hitMoles.value++
    reactionTimes.value.push(reactionTime)
    addScore(result.scoreChange)
    playCorrect()
    
    if (currentCombo.value > currentMaxCombo.value) {
      currentMaxCombo.value = currentCombo.value
    }
    
    if (currentCombo.value >= 3) {
      setFeedback('combo', `${currentCombo.value}x 連擊！`, result.scoreChange)
    } else {
      setFeedback('correct', undefined, result.scoreChange)
    }
  } else if (result.isBombHit) {
    hitBombs.value++
    addScore(result.scoreChange)
    playWrong()
    setFeedback('wrong', '💣 炸彈！', result.scoreChange)
  }
  
  // 清除得分顯示
  setTimeout(() => {
    holes.value = clearHoleAfterHit(holes.value, index)
    clearFeedback()
  }, 300)
}

function handleTimeUp() {
  handleGameEnd()
}

function handleGameEnd() {
  stopTimer()
  if (spawnTimer) {
    clearInterval(spawnTimer)
    spawnTimer = null
  }
  playEnd()
  
  const result = summarizeResult(
    hitMoles.value,
    totalMoles.value,
    hitBombs.value,
    reactionTimes.value,
    currentMaxCombo.value,
    config.value.gameTime
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

onUnmounted(() => {
  if (spawnTimer) {
    clearInterval(spawnTimer)
  }
  cleanupThrottle()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    if (spawnTimer) {
      clearInterval(spawnTimer)
      spawnTimer = null
    }
    resetGame()
  }
})
</script>

<template>
  <div class="whack-a-mole-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="打地鼠"
      icon="🐹"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲場地 -->
      <div
        class="game-field grid gap-3 sm:gap-4 p-4 sm:p-6 bg-gradient-to-b from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-2xl mt-4"
        :class="gridClass"
      >
        <div
          v-for="(hole, index) in holes"
          :key="index"
          class="hole relative aspect-square flex items-center justify-center cursor-pointer select-none min-h-[80px] sm:min-h-[100px] md:min-h-[120px]"
          @click="handleHoleClick(index)"
        >
          <!-- 洞 -->
          <div class="absolute inset-0 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-inner"></div>

          <!-- 地鼠/炸彈 -->
          <Transition name="pop">
            <div
              v-if="hole.active"
              class="absolute text-4xl sm:text-5xl md:text-6xl lg:text-7xl transform transition-transform"
              :class="{
                'animate-pulse': hole.type === 'mole',
                'scale-110': hole.hit,
                'opacity-50': hole.hit
              }"
            >
              {{ hole.type === 'mole' ? '🐹' : '💣' }}
            </div>
          </Transition>

          <!-- 得分提示 -->
          <Transition name="fade">
            <div
              v-if="hole.showScore"
              class="absolute -top-2 sm:-top-4 font-bold text-lg sm:text-xl"
              :class="hole.scoreClass"
            >
              {{ hole.scoreText }}
            </div>
          </Transition>
        </div>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
        :score="feedbackData.score"
        :combo="feedbackData.combo"
      />
    </template>
  </div>
</template>

<style scoped>
.hole {
  min-height: 100px;
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
