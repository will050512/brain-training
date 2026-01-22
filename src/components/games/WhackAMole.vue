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
const { throttledEmit, immediateEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape, isMobile } = useResponsive()

// ===== 遊戲配置 =====
const baseConfig = computed<WhackAMoleConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<WhackAMoleConfig>(() => {
  const adjusted = adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )

  return {
    ...adjusted,
    holes: baseConfig.value.holes
  }
})

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
  if (holeCount <= 3) return 'grid-cols-3'
  if (holeCount <= 6) return 'grid-cols-3'
  return 'grid-cols-3'
})

const boardClass = computed(() => {
  const holeCount = config.value.holes
  if (holeCount <= 3) return 'board-3'
  if (holeCount <= 6) return 'board-6'
  return 'board-9'
})

const boardStyle = computed(() => {
  const holeCount = config.value.holes
  const compact = isSmallLandscape()
  if (holeCount <= 3) {
    return {
      '--whack-hole-size': isMobile.value
        ? (compact ? 'clamp(80px, 20vmin, 120px)' : 'clamp(96px, 28vw, 150px)')
        : (compact ? 'clamp(76px, 19vmin, 116px)' : 'clamp(88px, 26vw, 140px)'),
      '--whack-actor-size': isMobile.value
        ? (compact ? 'clamp(48px, 12vmin, 84px)' : 'clamp(56px, 16vw, 98px)')
        : (compact ? 'clamp(44px, 11vmin, 80px)' : 'clamp(48px, 14vw, 90px)')
    } as Record<string, string>
  }
  if (holeCount <= 6) {
    return {
      '--whack-hole-size': isMobile.value
        ? (compact ? 'clamp(70px, 18vmin, 108px)' : 'clamp(82px, 23vw, 128px)')
        : (compact ? 'clamp(66px, 17vmin, 102px)' : 'clamp(76px, 22vw, 120px)'),
      '--whack-actor-size': isMobile.value
        ? (compact ? 'clamp(42px, 11vmin, 76px)' : 'clamp(48px, 13vw, 88px)')
        : (compact ? 'clamp(40px, 10vmin, 72px)' : 'clamp(44px, 12vw, 84px)')
    } as Record<string, string>
  }
  return {
    '--whack-hole-size': isMobile.value
      ? (compact ? 'clamp(60px, 16vmin, 98px)' : 'clamp(70px, 19vw, 112px)')
      : (compact ? 'clamp(58px, 15vmin, 94px)' : 'clamp(68px, 18vw, 108px)'),
    '--whack-actor-size': isMobile.value
      ? (compact ? 'clamp(36px, 9vmin, 68px)' : 'clamp(42px, 11vw, 80px)')
      : (compact ? 'clamp(34px, 8.5vmin, 64px)' : 'clamp(40px, 10vw, 76px)')
  } as Record<string, string>
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
    playCustomSound('mole-appear')
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
    config.value.gameTime,
    config.value.holes
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
  cleanupThrottle()
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
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
  <div class="whack-a-mole-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
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
        class="game-field game-grid game-board grid p-4 sm:p-6 bg-gradient-to-b from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-2xl mt-4"
        :class="[gridClass, boardClass]"
        :style="boardStyle"
      >
        <div
          v-for="(hole, index) in holes"
          :key="index"
          class="hole game-tile-lg game-touch relative aspect-square flex items-center justify-center cursor-pointer select-none"
          @click="handleHoleClick(index)"
        >
          <img class="hole-img" :src="holeImg" alt="" aria-hidden="true" />

          <Transition name="pop">
            <img
              v-if="hole.active && hole.type === 'mole'"
              class="actor-img"
              :class="{
                'animate-pulse': !hole.hit,
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
  min-width: var(--whack-hole-size, var(--game-tile-lg));
  min-height: var(--whack-hole-size, var(--game-tile-lg));
  width: var(--whack-hole-size, var(--game-tile-lg));
  height: var(--whack-hole-size, var(--game-tile-lg));
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
  width: var(--whack-actor-size, clamp(48px, 12vw, 96px));
  height: var(--whack-actor-size, clamp(48px, 12vw, 96px));
  transition: transform 0.15s ease, opacity 0.15s ease;
  pointer-events: none;
}

.board-3 {
  max-width: min(92vw, 360px);
}

.board-6 {
  max-width: min(92vw, 460px);
}

.board-9 {
  max-width: min(92vw, 520px);
}

.is-landscape .board-3 {
  max-width: min(88vw, 300px);
}

.is-landscape .board-6 {
  max-width: min(88vw, 380px);
}

.is-landscape .board-9 {
  max-width: min(88vw, 440px);
}

.actor-img.hit {
  transform: scale(1.1);
  opacity: 0.6;
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

