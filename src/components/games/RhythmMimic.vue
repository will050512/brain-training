<script setup lang="ts">
/**
 * 節奏模仿遊戲 - 視覺化時間軸版 (3回合優化版)
 * 修正重點：
 * 1. 確保回合間動畫完全清理 (防止卡死)
 * 2. 配合資料層的 1000ms 緩衝，優化視覺呈現
 * 3. 修復回合結算邏輯，確保能順利進行完所有回合 (現在是3回合)
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateRoundPatterns,
  evaluateRound,
  getPatternDuration,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  type RhythmPattern,
  type RoundResult,
  type RhythmMimicConfig,
} from '@/games/logic/rhythmMimic'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

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
  'status-update': [status: GameStatusUpdate]
}>()

const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, scheduleInterval, pauseAwareDelay, clearTimers } = usePauseController(isPaused)

// ===== 遊戲核心設定 =====
const baseConfig = computed<RhythmMimicConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<RhythmMimicConfig>(() => {
  return adjustSettingsForSubDifficulty(baseConfig.value, props.subDifficulty ?? 2)
})

const {
  phase,
  score,
  currentRound,
  totalRounds,
  correctCount,
  wrongCount,
  feedback,
  showFeedback,
  isPlaying,
  pauseGame,
  resumeGame,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
} = useGameState({ totalRounds: config.value.totalRounds })

// ===== 音效系統 =====
const { playCorrect, playWrong, playEnd, playCustomSound, preloadDefaultSounds, preloadSounds } = useGameAudio({
  gameFolder: 'rhythm-mimic',
  volume: 0.9,
  customSounds: [
    { id: 'beat', name: 'Beat', frequency: 800, duration: 80, volume: 0.8, oscillatorType: 'sine' },
    { id: 'tick', name: 'Tick', frequency: 600, duration: 50, volume: 0.5, oscillatorType: 'square' },
    { id: 'go', name: 'Go', frequency: 1000, duration: 300, volume: 0.8, oscillatorType: 'sine' },
  ],
})

// ===== 遊戲狀態 =====
type GamePhase = 'listening' | 'countdown' | 'input' | 'result'
const gamePhase = ref<GamePhase>('listening')

const patterns = ref<RhythmPattern[]>([])
const currentPattern = computed(() => patterns.value[currentRound.value])
const roundResults = ref<RoundResult[]>([])

const userTaps = ref<number[]>([])
const isTapping = ref(false)
const inputReady = ref(false)
const replayRemaining = ref(0)
const countdown = ref(3)

// 動畫循環控制
let animationFrameId: number = 0
let startTime = 0
let pausedAt: number | null = null
let pausedDuration = 0
const currentTime = ref(0)
const totalDuration = ref(3000)
const playToken = ref(0)

const timelinePaddingPct = computed(() => (isSmallLandscape.value ? 10 : 6))

function clampTimelinePosition(value: number): number {
  const padding = timelinePaddingPct.value
  return Math.min(100 - padding, Math.max(padding, value))
}

function applyLeadInToPattern(pattern: RhythmPattern, leadInMs: number): RhythmPattern {
  const beats = pattern.beats.map(beat => ({ ...beat }))
  if (beats.length === 0) return { ...pattern, beats }
  const earliestBeat = Math.min(...beats.map(beat => beat.time))
  const offset = Math.max(0, leadInMs - earliestBeat)

  if (offset === 0) {
    return { ...pattern, beats }
  }

  return {
    ...pattern,
    beats: beats.map(beat => ({ ...beat, time: beat.time + offset })),
    totalDuration: pattern.totalDuration ? pattern.totalDuration + offset : undefined,
  }
}

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

// ===== 遊戲流程控制 =====

function startGame() {
  startGameState()
  emit('game-start')
  
  // 生成新的譜面
  const leadInMs = Math.max(0, config.value.leadInMs ?? 0)
  patterns.value = generateRoundPatterns(config.value.totalRounds, props.difficulty)
    .map(pattern => applyLeadInToPattern(pattern, leadInMs))
  roundResults.value = []
  
  startNewRound()
}

async function startNewRound() {
  // 1. 強制清理上一回合
  cancelAnimationFrame(animationFrameId)
  const token = playToken.value + 1
  playToken.value = token
  
  gamePhase.value = 'listening'
  userTaps.value = []
  inputReady.value = false
  replayRemaining.value = config.value.replayLimit
  currentTime.value = 0
  
  // 2. 等待 Vue 更新 currentPattern，確保讀取到正確的下一回合資料
  await nextTick()
  
  if (currentPattern.value) {
    totalDuration.value = getPatternDuration(currentPattern.value)
  } else {
    // 防呆：如果讀取不到譜面，安全結束遊戲
    console.warn('Pattern not found for round:', currentRound.value)
    finishGame()
    emit('game-end', summarizeResult(roundResults.value))
    return
  }

  // 3. 延遲啟動，確保畫面準備好
  scheduleTimeout(() => {
    if (playToken.value === token) {
      startPlaybackSequence(token)
    }
  }, 1000)
}

// 播放示範序列
async function startPlaybackSequence(token: number) {
  for (let i = 0; i < config.value.playCount; i++) {
    if (playToken.value !== token) return
    
    await runTimelineAnimation(token, 'listening')
    
    if (i < config.value.playCount - 1) {
      await pauseAwareDelay(config.value.waitTime)
    }
  }
  
  if (playToken.value === token) {
    startCountdown(token)
  }
}

// 倒數計時
function startCountdown(token: number) {
  gamePhase.value = 'countdown'
  countdown.value = 3
  
  const timer = scheduleInterval(() => {
    if (playToken.value !== token) {
      clearInterval(timer)
      return
    }
    
    playCustomSound('tick')
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(timer)
      playCustomSound('go')
      startInputPhase(token)
    }
  }, 900)
}

// 開始輸入階段
function startInputPhase(token: number) {
  gamePhase.value = 'input'
  inputReady.value = true
  userTaps.value = []
  
  runTimelineAnimation(token, 'input').then(() => {
    if (playToken.value === token) {
      handleRoundComplete()
    }
  })
}

// 通用的時間軸動畫函數
function runTimelineAnimation(token: number, mode: 'listening' | 'input'): Promise<void> {
  return new Promise((resolve) => {
    cancelAnimationFrame(animationFrameId)
    
    startTime = performance.now()
    pausedDuration = 0
    pausedAt = isPaused.value ? startTime : null
    const duration = totalDuration.value
    const playedBeats = new Set<number>()

    const getTimelineTime = (now: number) => {
      if (pausedAt !== null) {
        return Math.max(0, pausedAt - startTime - pausedDuration)
      }
      return Math.max(0, now - startTime - pausedDuration)
    }
    
    function loop(now: number) {
      if (playToken.value !== token) return

      if (pausedAt !== null) {
        animationFrameId = requestAnimationFrame(loop)
        return
      }

      const elapsed = getTimelineTime(now)
      currentTime.value = elapsed
      
      if (mode === 'listening' && currentPattern.value) {
        currentPattern.value.beats.forEach((beat, index) => {
          if (!playedBeats.has(index) && elapsed >= beat.time) {
            playCustomSound('beat')
            playedBeats.add(index)
          }
        })
      }

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(loop)
      } else {
        currentTime.value = duration
        resolve()
      }
    }
    
    animationFrameId = requestAnimationFrame(loop)
  })
}

function handleTap() {
  if (gamePhase.value !== 'input' || !inputReady.value || isPaused.value) return
  
  playCustomSound('beat')
  isTapping.value = true
  scheduleTimeout(() => {
    isTapping.value = false
  }, 150)
  
  const tapTime = pausedAt !== null
    ? Math.max(0, pausedAt - startTime - pausedDuration)
    : Math.max(0, performance.now() - startTime - pausedDuration)
  userTaps.value.push(tapTime)
}

function handleRoundComplete() {
  inputReady.value = false
  gamePhase.value = 'result'
  
  if (!currentPattern.value) return

  const result = evaluateRound(userTaps.value, currentPattern.value, config.value)
  roundResults.value.push(result)
  
  const isPass = result.accuracy >= 60
  if (isPass) {
    playCorrect()
    addScore(result.score)
    setFeedback('correct', `準確度 ${result.accuracy}%`, result.score)
  } else {
    playWrong()
    setFeedback('wrong', `準確度 ${result.accuracy}%`)
  }
  
  // 結算畫面停留 2.5 秒
  scheduleTimeout(async () => {
    clearFeedback()
    
    // 檢查是否還有下一回合 (使用 patterns.length 作為唯一真理，避免 totalRounds 不同步)
    const maxRounds = patterns.value.length
    
    if (currentRound.value < maxRounds - 1) {
      nextRound() // 呼叫 useGameState 的 nextRound
      await nextTick() // 重要：等待狀態更新
      startNewRound()
    } else {
      finishGame()
      emit('game-end', summarizeResult(roundResults.value))
    }
  }, 2700)
}

// 供父組件呼叫的結束函數 (以防萬一)
function finishGame() {
  finishGameState()
}

function replay() {
  if (replayRemaining.value <= 0 || gamePhase.value !== 'input') return
  replayRemaining.value--
  
  const token = playToken.value + 1
  playToken.value = token
  cancelAnimationFrame(animationFrameId)
  
  gamePhase.value = 'listening'
  scheduleTimeout(() => {
    startPlaybackSequence(token)
  }, 500)
}

// ===== 輔助顯示計算 =====

function getBeatPosition(time: number) {
  if (totalDuration.value <= 0) return 0
  const pct = (time / totalDuration.value) * 100
  return clampTimelinePosition(pct)
}

const cursorPosition = computed(() => {
  if (totalDuration.value <= 0) return clampTimelinePosition(0)
  const pct = (currentTime.value / totalDuration.value) * 100
  return clampTimelinePosition(pct)
})

function isBeatActive(beatTime: number) {
  return Math.abs(currentTime.value - beatTime) < 100
}

function getTapStatusForBeat(beatTime: number) {
  if (gamePhase.value !== 'input' && gamePhase.value !== 'result') return 'none'
  const tolerance = config.value.tolerance
  const hit = userTaps.value.some(tapTime => Math.abs(tapTime - beatTime) <= tolerance)
  return hit ? 'hit' : 'none'
}

onMounted(() => {
  preloadDefaultSounds()
  preloadSounds(['beat']).catch(() => {})
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  cleanupThrottle()
  clearTimers()
})

watch(() => score.value, (newScore) => emit('score-change', newScore))
watch(phase, () => {
  if (phase.value === 'playing') {
    throttledEmit({
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds,
      showTimer: false,
      showScore: true,
      showProgress: true
    })
  }
})

watch(isPaused, (paused) => {
  if (paused && phase.value === 'playing') {
    pauseGame()
    if (pausedAt === null) {
      pausedAt = performance.now()
    }
    return
  }

  if (!paused && phase.value === 'paused') {
    if (pausedAt !== null) {
      pausedDuration += performance.now() - pausedAt
      pausedAt = null
    }
    resumeGame()
  }
})
</script>

<template>
  <div class="rhythm-game-root game-root w-full max-w-2xl mx-auto p-4 select-none">
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="節奏拍拍樂"
      description="看著游標移動，當它碰到圓圈時按下按鈕！"
      icon="🥁"
      :difficulty="difficulty"
      :auto-start="autoStart"
      @start="startGame"
    />

    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <div class="game-panel flex justify-between items-center mb-6 p-3 rounded-xl">
        <div class="text-sm font-bold text-[var(--color-text-muted)]">
          回合 {{ currentRound + 1 }}/{{ config.totalRounds }}
        </div>
        <div class="text-xl font-bold text-[var(--color-primary)]">
          {{ score }} 分
        </div>
        <div class="text-sm font-medium px-2 py-1 rounded bg-[var(--color-bg-soft)]">
          {{ currentPattern?.name }}
        </div>
      </div>

      <div class="game-board game-panel relative rounded-2xl p-6 sm:p-10 min-h-[200px] flex flex-col justify-center overflow-hidden">
        
        <div class="absolute top-4 left-0 w-full text-center z-10 transition-colors duration-300"
             :class="gamePhase === 'input' ? 'text-green-600 font-bold' : 'text-gray-400'">
          <span v-if="gamePhase === 'listening'" class="flex items-center justify-center gap-2">
            👂 請仔細聆聽示範
          </span>
          <span v-else-if="gamePhase === 'countdown'" class="text-4xl font-black text-blue-500 animate-pulse">
            {{ countdown }}
          </span>
          <span v-else-if="gamePhase === 'input'" class="flex items-center justify-center gap-2 text-xl">
            👇 換你跟著拍子按！
          </span>
          <span v-else-if="gamePhase === 'result'" class="text-xl font-bold text-blue-500">
            結算中...
          </span>
        </div>

        <div class="timeline-track relative w-full h-16 bg-gray-200 dark:bg-gray-700 rounded-full mt-6">
          <div
            v-for="(beat, index) in currentPattern?.beats"
            :key="`beat-${currentRound}-${index}`"
            class="beat-note absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 transition-all duration-150 z-10 flex items-center justify-center"
            :style="{ left: `${getBeatPosition(beat.time)}%` }"
            :class="{
              'bg-white border-gray-400': !isBeatActive(beat.time) && getTapStatusForBeat(beat.time) === 'none',
              'scale-125 bg-yellow-300 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]': isBeatActive(beat.time) && gamePhase === 'listening',
              'scale-110 bg-green-400 border-green-600 shadow-lg': getTapStatusForBeat(beat.time) === 'hit',
            }"
          >
            <div class="w-3 h-3 rounded-full bg-current opacity-30"></div>
          </div>

          <div 
            class="cursor absolute top-0 bottom-0 w-1 bg-red-500 z-20 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            :style="{ left: `${cursorPosition}%` }"
          >
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500"></div>
            <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-500"></div>
          </div>
          <div class="user-taps-layer absolute left-0 top-full mt-3 w-full h-6 pointer-events-none">
            <div 
              v-for="(tapTime, i) in userTaps" 
              :key="i"
              class="absolute top-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-50 transition-opacity duration-1000 -translate-y-1/2 -translate-x-1/2"
              :style="{ left: `${getBeatPosition(tapTime)}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="controls-area mt-8 flex flex-col items-center gap-6">
        <button
          class="tap-button relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-b-8 transition-all active:border-b-0 active:translate-y-2 flex items-center justify-center overflow-hidden group"
          :class="[
            inputReady 
              ? 'bg-blue-500 border-blue-700 hover:bg-blue-400 text-white cursor-pointer shadow-xl' 
              : 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed'
          ]"
          @touchstart.prevent="handleTap"
          @mousedown.prevent="handleTap"
        >
          <div class="text-4xl sm:text-5xl transform transition-transform group-active:scale-90">
            👏
          </div>
          <div v-if="isTapping" class="absolute inset-0 bg-white opacity-30 animate-ping rounded-full"></div>
        </button>

        <div class="flex gap-4">
          <button 
            v-if="replayRemaining > 0 && gamePhase === 'input'"
            @click="replay"
            class="px-4 py-2 min-h-[44px] rounded-full bg-amber-100 text-amber-700 font-bold text-sm hover:bg-amber-200 transition-colors flex items-center gap-2"
          >
            <span>↺</span> 再聽一次 ({{ replayRemaining }})
          </button>
        </div>
      </div>

      <GameFeedback v-if="feedbackData" v-bind="feedbackData" />
    </template>
  </div>
</template>

<style scoped>
.cursor {
  will-change: left;
}
.beat-note {
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.game-board {
  background:
    radial-gradient(240px 120px at 15% 0%, rgba(59, 130, 246, 0.12), transparent 60%),
    radial-gradient(240px 120px at 90% 10%, rgba(14, 165, 233, 0.12), transparent 60%),
    var(--color-surface);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-lg);
}

.tap-button {
  box-shadow: 0 14px 26px rgba(30, 58, 138, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .tap-button,
  .tap-button .group-active\:scale-90 {
    transition: none;
  }
}
</style>
