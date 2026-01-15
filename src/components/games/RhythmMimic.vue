<script setup lang="ts">
/**
 * 節奏模仿遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateRoundPatterns,
  evaluateRound,
  getPatternDuration,
  calculateScore,
  calculateGrade,
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
const baseConfig = computed<RhythmMimicConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<RhythmMimicConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
  correctCount,
  wrongCount,
  progress,
  feedback,
  showFeedback,
  isPlaying,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
} = useGameState({
  totalRounds: config.value.totalRounds,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, playStart, playCustomSound, preloadDefaultSounds, preloadSounds } = useGameAudio({
  gameFolder: 'rhythm-mimic',
  volume: 0.95,
  customSounds: [
    { id: 'beat', name: 'Beat', frequency: 760, duration: 110, volume: 0.9, oscillatorType: 'sine' },
    { id: 'miss', name: 'Miss', frequency: 200, duration: 180, volume: 0.9, oscillatorType: 'square' },
  ],
})

// ===== 遊戲資料 =====
const patterns = ref<RhythmPattern[]>([])
const currentPattern = computed(() => patterns.value[currentRound.value])
const gamePhase = ref<'listening' | 'countdown' | 'input' | 'result'>('listening')
const currentBeatIndex = ref(-1)
const userTaps = ref<number[]>([])
const roundResults = ref<RoundResult[]>([])
const streak = ref(0)
const maxStreak = ref(0)
const isTapping = ref(false)
let inputStartTime = 0
let playCount = 0
const countdown = ref(3)
const replayRemaining = ref(0)
const inputReady = ref(false)
let playToken = 0

// ===== 計算屬性 =====
const currentBeats = computed(() => currentPattern.value?.beats || [])
const currentAccuracy = computed(() => {
  if (roundResults.value.length === 0) return 0
  const lastResult = roundResults.value[roundResults.value.length - 1]
  return lastResult?.accuracy || 0
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
  '先聆聽節奏，注意每拍的間隔',
  '聽到「開始提示音」後再開始敲擊',
  '敲擊節奏越貼近，評分越高',
  '可重播次數會隨難度下降',
]

function playBeat() {
  playCustomSound('beat')
}

// ===== 遊戲方法 =====
function handleStart() {
  patterns.value = generateRoundPatterns(config.value.totalRounds, props.difficulty)
  roundResults.value = []
  streak.value = 0
  maxStreak.value = 0
  
  startGame()
  startNewRound()
}

function startNewRound() {
  gamePhase.value = 'listening'
  currentBeatIndex.value = -1
  userTaps.value = []
  playCount = 0
  replayRemaining.value = config.value.replayLimit
  countdown.value = 3
  inputReady.value = false
  playToken++
  
  // 延遲後開始播放
  setTimeout(() => {
    playPatternSequence(playToken)
  }, 1000)
}

async function playPatternSequence(token: number) {
  if (!currentPattern.value) return
  const beats = currentBeats.value
  if (beats.length === 0) return
  
  for (let repeat = 0; repeat < config.value.playCount; repeat++) {
    if (token !== playToken) return

    // 從頭播放一次 pattern
    for (let i = 0; i < beats.length; i++) {
      if (token !== playToken) return
      currentBeatIndex.value = i
      playBeat()

      // 等待到下一個節拍
      if (i < beats.length - 1) {
        const currentBeat = beats[i]
        const nextBeat = beats[i + 1]
        if (currentBeat && nextBeat) {
          const interval = nextBeat.time - currentBeat.time
          await delay(interval)
        }
      }
    }

    currentBeatIndex.value = -1
    playCount = repeat + 1

    // repeat 間隔
    if (repeat < config.value.playCount - 1) {
      await delay(config.value.waitTime)
    }
  }

  await delay(500)
  startCountdownToInput(token)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function startCountdownToInput(token: number) {
  if (token !== playToken) return

  gamePhase.value = 'countdown'
  countdown.value = 3

  const tick = () => {
    if (token !== playToken) return
    if (countdown.value <= 1) {
      // 開始輸入：給一個明確的開始點，並把期望節拍整體往後移，避免第一拍在 0ms 造成「不可能準時」
      countdown.value = 0
      gamePhase.value = 'input'
      inputStartTime = Date.now()
      playStart()
      setTimeout(() => {
        if (token !== playToken) return
        inputReady.value = true
      }, config.value.leadInMs)
      return
    }
    countdown.value--
    setTimeout(tick, 1000)
  }

  setTimeout(tick, 1000)
}

function handleTap() {
  if (!isPlaying.value || gamePhase.value !== 'input' || !inputReady.value) return
  
  // 播放敲擊聲音
  playBeat()
  
  // 觸發視覺效果
  isTapping.value = true
  setTimeout(() => { isTapping.value = false }, 100)
  
  // 記錄敲擊時間
  const timestamp = Date.now() - inputStartTime
  userTaps.value.push(timestamp)
  
  // 檢查是否輸入完成
  if (userTaps.value.length >= currentBeats.value.length) {
    handleInputComplete()
  }
}

function handleInputComplete() {
  if (!currentPattern.value) return
  
  gamePhase.value = 'result'
  
  // 評估結果
  // 輸入階段加入 lead-in offset，避免第一拍 0ms 導致長者難以理解與完成
  const shiftedPattern: RhythmPattern = {
    ...currentPattern.value,
    beats: currentPattern.value.beats.map(b => ({ ...b, time: b.time + config.value.leadInMs }))
  }
  const result = evaluateRound(userTaps.value, shiftedPattern, config.value)
  roundResults.value.push(result)
  
  const isGood = result.accuracy >= 60
  
  if (isGood) {
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    addScore(result.score)
    playCorrect()
    setFeedback('correct', `準確度 ${result.accuracy}%！+${result.score}分`, result.score)
  } else {
    streak.value = 0
    playWrong()
    playCustomSound('miss')
    setFeedback('wrong', `準確度僅 ${result.accuracy}%`)
  }
  
  // 延遲後進入下一回合或結束
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      startNewRound()
    } else {
      handleGameEnd()
    }
  }, 2000)
}

function skipInput() {
  if (gamePhase.value !== 'input') return
  handleInputComplete()
}

function replayPattern() {
  if (!isPlaying.value || gamePhase.value !== 'input') return
  if (replayRemaining.value <= 0) return
  if (!currentPattern.value) return

  replayRemaining.value--
  userTaps.value = []
  currentBeatIndex.value = -1
  playCount = 0
  inputReady.value = false

  gamePhase.value = 'listening'
  playToken++
  const token = playToken
  setTimeout(() => {
    playPatternSequence(token)
  }, 500)
}

function handleGameEnd() {
  playEnd()
  
  const result = summarizeResult(roundResults.value)
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
  preloadSounds(['beat', 'miss'])
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: false,
      showScore: true,
      showCounts: true,
      showProgress: true
    })
  }
})

onUnmounted(() => {
  cleanupThrottle()
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    resetGame()
  }
})
</script>

<template>
  <div class="rhythm-mimic-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="節奏模仿"
      icon="🥁"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4 px-4">
        <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
        </div>
        <div class="text-xs sm:text-sm mt-1">
          <span class="text-gray-500 dark:text-gray-400">模式：</span>
          <span class="font-medium">{{ currentPattern?.name || '' }}</span>
        </div>
        <div class="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">節拍數：</span>
            <span class="font-bold text-blue-500">{{ currentBeats.length }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">連續正確：</span>
            <span class="font-bold text-orange-500">{{ streak }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">容許誤差：</span>
            <span class="font-bold text-purple-500">{{ config.tolerance }}ms</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">可重播：</span>
            <span class="font-bold text-emerald-500">{{ config.replayLimit }}</span>
          </div>
        </div>
      </div>

      <!-- 顯示區域 -->
      <div class="display-area mt-6 sm:mt-8 px-4">
        <!-- 聆聽階段 -->
        <div
          v-if="gamePhase === 'listening'"
          class="listening-phase text-center"
        >
          <div class="text-base sm:text-lg font-medium mb-4 sm:mb-6">
            🎵 仔細聆聽節奏...
          </div>

          <!-- 節拍視覺指示 -->
          <div class="beat-indicator flex justify-center gap-2 sm:gap-3 flex-wrap">
            <div
              v-for="(beat, index) in currentBeats"
              :key="index"
              class="beat-dot w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-100 flex items-center justify-center text-lg sm:text-xl min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px]"
              :class="{
                'bg-blue-500 scale-125 shadow-lg shadow-blue-500/50': currentBeatIndex === index,
                'bg-gray-300 dark:bg-gray-600': currentBeatIndex !== index && index > currentBeatIndex,
                'bg-blue-200 dark:bg-blue-800': currentBeatIndex !== index && index < currentBeatIndex,
              }"
            >
              {{ currentBeatIndex === index ? '🔊' : '' }}
            </div>
          </div>

          <div class="text-xs sm:text-sm text-gray-400 mt-3 sm:mt-4">
            播放次數：{{ playCount + 1 }} / {{ config.playCount }}
          </div>
        </div>

        <!-- 輸入階段 -->
        <div
          v-else-if="gamePhase === 'input'"
          class="input-phase text-center"
        >
          <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
            <span v-if="!inputReady">等待提示音後開始敲擊</span>
            <span v-else>跟著剛才的節奏敲擊，盡量保持間隔</span>
          </div>

          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
            <div
              v-for="(tap, index) in userTaps"
              :key="index"
              class="tap-dot w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full min-h-[24px] min-w-[24px] sm:min-h-[32px] sm:min-w-[32px]"
            />
            <div
              v-for="i in (currentBeats.length - userTaps.length)"
              :key="'placeholder-' + i"
              class="tap-placeholder w-6 h-6 sm:w-8 sm:h-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full min-h-[24px] min-w-[24px] sm:min-h-[32px] sm:min-w-[32px]"
            />
          </div>

          <!-- 敲擊按鈕 -->
          <button
            class="tap-btn w-[clamp(7rem,28vw,10rem)] h-[clamp(7rem,28vw,10rem)] rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[clamp(2.5rem,8vw,3.75rem)] shadow-xl transition-all transform"
            :class="{ 'scale-90 bg-blue-700': isTapping, 'opacity-50 pointer-events-none': !inputReady }"
            @click="handleTap"
            @touchstart.prevent="handleTap"
          >
            👆
          </button>

          <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4 sm:mt-6">
            <span v-if="inputReady">剩餘 {{ currentBeats.length - userTaps.length }} 次敲擊</span>
            <span v-else>準備中...</span>
          </div>

          <!-- 跳過按鈕 -->
          <div class="mt-3 sm:mt-4 flex justify-center gap-2 flex-wrap">
            <button
              v-if="replayRemaining > 0"
              class="skip-btn px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base font-medium min-h-[44px]"
              @click="replayPattern"
            >
              再聽一次（剩 {{ replayRemaining }} 次）
            </button>
            <button
              class="skip-btn px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base font-medium min-h-[44px]"
              @click="skipInput"
            >
              直接結算
            </button>
          </div>
        </div>

        <!-- 倒數階段 -->
        <div v-else-if="gamePhase === 'countdown'" class="text-center">
          <div class="text-base sm:text-lg font-medium mb-4 sm:mb-6">
            準備開始
          </div>
          <div class="text-6xl sm:text-7xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
            {{ countdown }}
          </div>
          <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
            倒數結束後會播放提示音，聽到後開始敲擊
          </div>
        </div>

        <!-- 結果階段 -->
        <div 
          v-else-if="gamePhase === 'result'"
          class="result-phase text-center"
        >
          <div 
            class="accuracy-display text-4xl font-bold mb-4" 
            :class="{
              'text-green-500': currentAccuracy >= 80,
              'text-yellow-500': currentAccuracy >= 50 && currentAccuracy < 80,
              'text-red-500': currentAccuracy < 50,
            }"
          >
            {{ currentAccuracy }}%
          </div>
          <div class="text-gray-500 dark:text-gray-400">
            準確度
          </div>
        </div>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
        :score="feedbackData.score"
      />
    </template>
  </div>
</template>

<style scoped>
.tap-btn:active {
  transform: scale(0.9);
}

.beat-dot {
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
}

.beat-dot.bg-blue-500 {
  animation: pulse-beat 0.3s ease-out;
}

@keyframes pulse-beat {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(1.25);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}
</style>

