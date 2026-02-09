<script setup lang="ts">
/**
 * 打地鼠遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
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

import holeImg from '@/assets/images/whack-a-mole/hole.svg'
import moleImg from '@/assets/images/whack-a-mole/mole.svg'
import moleHitImg from '@/assets/images/whack-a-mole/mole-hit.svg'
import bombImg from '@/assets/images/whack-a-mole/bomb.svg'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
  subDifficulty?: SubDifficulty
  autoStart?: boolean
  isPaused?: boolean
}>(), {
  difficulty: 'easy',
  subDifficulty: 2,
  autoStart: false,
  isPaused: false,
})

const emit = defineEmits<{
  'game-start': []
  'game-end': [result: any]
  'score-change': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, immediateEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()

// ===== 遊戲配置 =====
const baseConfig = computed<WhackAMoleConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<WhackAMoleConfig>(() => {
  const adjusted = adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
  return {
    ...adjusted,
    holes: baseConfig.value.holes,
  }
})
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, scheduleInterval, clearTimers } = usePauseController(isPaused)

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  combo,
  maxCombo,
  feedback,
  showFeedback,
  isPlaying,
  pauseGame,
  resumeGame,
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
  pause: pauseTimer,
  resume: resumeTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'countdown',
  initialTime: config.value.gameTime,
  warningTime: 10,
  onTimeUp: () => handleTimeUp(),
})

// ===== 音效 =====
const { playEnd, playCustomSound, preloadDefaultSounds, preloadSounds } = useGameAudio({
  gameFolder: 'whack-a-mole',
  customSounds: [
    { id: 'mole-appear', name: 'Mole Appear', frequency: 720, duration: 120 },
    { id: 'mole-hit', name: 'Mole Hit', frequency: 880, duration: 160 },
    { id: 'bomb-explode', name: 'Bomb Explode', frequency: 180, duration: 220 },
  ],
})

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
  if (holeCount === 3) return 'grid-cols-3 max-w-sm'
  if (holeCount === 6) return 'grid-cols-3 max-w-md'
  return 'grid-cols-3 max-w-lg'
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
  spawnTimer = scheduleInterval(spawnMole, config.value.interval)
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
    playCustomSound('mole-appear')
  }
  
  // 自動消失
  scheduleTimeout(() => {
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
    playCustomSound('mole-hit')
    
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
    playCustomSound('bomb-explode')
    setFeedback('wrong', '💣 炸彈！', result.scoreChange)
  }
  
  // 清除得分顯示
  scheduleTimeout(() => {
    holes.value = clearHoleAfterHit(holes.value, index)
    clearFeedback()
  }, 400)
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
  clearTimers()
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
  preloadSounds(['mole-appear', 'mole-hit', 'bomb-explode'])
})

onUnmounted(() => {
  if (spawnTimer) {
    clearInterval(spawnTimer)
  }
  clearTimers()
  cleanupThrottle()
})

watch(isPaused, (paused) => {
  if (paused && phase.value === 'playing') {
    pauseGame()
    pauseTimer()
    return
  }

  if (!paused && phase.value === 'paused') {
    resumeGame()
    resumeTimer()
  }
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    if (spawnTimer) {
      clearInterval(spawnTimer)
      spawnTimer = null
    }
    clearTimers()
    resetGame()
  }
})
</script>

<template>
  <div class="whack-a-mole-game game-root game-frame" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="打地鼠"
      icon="🐹"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲場地 -->
      <div
        class="game-field whack-board game-board grid gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl mt-4"
        :class="gridClass"
      >
        <div
          v-for="(hole, index) in holes"
          :key="index"
          class="hole relative aspect-square flex items-center justify-center cursor-pointer select-none min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]"
          @click="handleHoleClick(index)"
        >
          <img class="hole-img" :src="holeImg" alt="" aria-hidden="true" />

          <Transition name="pop">
            <img
              v-if="hole.active && hole.type === 'mole'"
              class="actor-img mole"
              :class="{
                'hit': hole.hit
              }"
              :src="hole.hit ? moleHitImg : moleImg"
              alt=""
              aria-hidden="true"
            />
            <img
              v-else-if="hole.active && hole.type === 'bomb'"
              class="actor-img bomb"
              :src="bombImg"
              alt=""
              aria-hidden="true"
            />
          </Transition>

          <!-- 得分提示 -->
          <Transition name="fade">
            <div
              v-if="hole.showScore"
              class="absolute -top-2 sm:-top-4 font-bold game-text-xl"
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
  border-radius: 18px;
  background: radial-gradient(circle at 50% 60%, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.05));
  box-shadow: inset 0 10px 18px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(15, 23, 42, 0.12);
}

.whack-board {
  background:
    radial-gradient(240px 120px at 15% 20%, rgba(34, 197, 94, 0.35), transparent 60%),
    radial-gradient(260px 140px at 85% 10%, rgba(16, 185, 129, 0.25), transparent 60%),
    linear-gradient(180deg, #e6f9d8 0%, #c8f2c1 100%);
  border: 1px solid rgba(22, 163, 74, 0.25);
  box-shadow: 0 18px 30px rgba(22, 163, 74, 0.2);
  position: relative;
  overflow: hidden;
}

.whack-board::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.5;
  pointer-events: none;
}

.hole-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.actor-img {
  position: absolute;
  width: clamp(64px, 14vw, 120px);
  height: clamp(64px, 14vw, 120px);
  transition: transform 0.15s ease, opacity 0.15s ease;
  pointer-events: none;
  filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.25));
}

.actor-img.mole {
  animation: mole-bob 0.6s ease-in-out infinite;
}

.actor-img.hit {
  transform: scale(1.15);
  opacity: 0.6;
}

.actor-img.bomb {
  animation: bomb-wiggle 0.6s ease-in-out infinite;
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.15s ease;
}

.pop-enter-from {
  transform: scale(0.4) translateY(24px);
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

@keyframes bomb-wiggle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  40% { transform: rotate(-6deg) scale(1.05); }
  70% { transform: rotate(6deg) scale(1.05); }
}

@keyframes mole-bob {
  0%, 100% { transform: translateY(6px) scale(1); }
  50% { transform: translateY(-6px) scale(1.08); }
}

@media (prefers-reduced-motion: reduce) {
  .actor-img.bomb {
    animation: none;
  }
  .actor-img.mole {
    animation: none;
  }
}
</style>
