<script setup lang="ts">
/**
 * 節奏模仿遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
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
}>(), {
  difficulty: 'easy'
})

const emit = defineEmits<{
  'game:start': []
  'game:end': [result: any]
  'score:update': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)

// ===== 遊戲配置 =====
const config = computed<RhythmMimicConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
  emit('game:start')
}

function finishGame() {
  finishGameState()
}

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const patterns = ref<RhythmPattern[]>([])
const currentPattern = computed(() => patterns.value[currentRound.value])
const gamePhase = ref<'listening' | 'input' | 'result'>('listening')
const currentBeatIndex = ref(-1)
const userTaps = ref<number[]>([])
const roundResults = ref<RoundResult[]>([])
const streak = ref(0)
const maxStreak = ref(0)
const isTapping = ref(false)
let audioContext: AudioContext | null = null
let inputStartTime = 0
let playCount = 0

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
  '仔細聆聽節奏模式',
  '記住每個敲擊的時間間隔',
  '盡可能精確地複製節奏',
  '越接近原始節奏分數越高',
]

// ===== 音效生成 =====
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

function playBeat() {
  const ctx = initAudioContext()
  if (!ctx) return
  
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.type = 'sine'
  oscillator.frequency.value = 800
  
  gainNode.gain.setValueAtTime(0.8, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.1)
}

// ===== 遊戲方法 =====
function handleStart() {
  patterns.value = generateRoundPatterns(config.value.totalRounds, props.difficulty)
  roundResults.value = []
  streak.value = 0
  maxStreak.value = 0
  
  // 初始化音頻
  initAudioContext()
  
  startGame()
  startNewRound()
}

function startNewRound() {
  gamePhase.value = 'listening'
  currentBeatIndex.value = -1
  userTaps.value = []
  playCount = 0
  
  // 延遲後開始播放
  setTimeout(() => {
    playPattern()
  }, 1000)
}

async function playPattern() {
  if (!currentPattern.value) return
  
  const beats = currentBeats.value
  
  for (let i = 0; i < beats.length; i++) {
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
  playCount++
  
  // 檢查是否需要再播放一次
  if (playCount < config.value.playCount) {
    await delay(config.value.waitTime)
    playPattern()
  } else {
    // 進入輸入階段
    await delay(500)
    gamePhase.value = 'input'
    inputStartTime = Date.now()
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function handleTap() {
  if (!isPlaying.value || gamePhase.value !== 'input') return
  
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
  const result = evaluateRound(userTaps.value, currentPattern.value, config.value)
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
  
  // 如果敲擊數量不足，補上空敲
  while (userTaps.value.length < currentBeats.value.length) {
    handleTap()
  }
}

function handleGameEnd() {
  playEnd()
  
  const result = summarizeResult(roundResults.value)
  
  finishGame()
  emit('game:end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
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

onBeforeUnmount(() => {
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
})

onUnmounted(() => {
  cleanupThrottle()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    resetGame()
  }
})
</script>

<template>
  <div class="rhythm-mimic-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="節奏模仿"
      icon="🥁"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
      <div class="game-info text-center mt-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
        </div>
        <div class="text-sm mt-1">
          <span class="text-gray-500 dark:text-gray-400">模式：</span>
          <span class="font-medium">{{ currentPattern?.name || '' }}</span>
        </div>
        <div class="flex justify-center gap-4 mt-2 text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">節拍數：</span>
            <span class="font-bold text-blue-500">{{ currentBeats.length }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">連續正確：</span>
            <span class="font-bold text-orange-500">{{ streak }}</span>
          </div>
        </div>
      </div>

      <!-- 顯示區域 -->
      <div class="display-area mt-8">
        <!-- 聆聽階段 -->
        <div 
          v-if="gamePhase === 'listening'"
          class="listening-phase text-center"
        >
          <div class="text-lg font-medium mb-6">
            🎵 仔細聆聽節奏...
          </div>
          
          <!-- 節拍視覺指示 -->
          <div class="beat-indicator flex justify-center gap-3 flex-wrap">
            <div
              v-for="(beat, index) in currentBeats"
              :key="index"
              class="beat-dot w-12 h-12 rounded-full transition-all duration-100 flex items-center justify-center text-xl"
              :class="{
                'bg-blue-500 scale-125 shadow-lg shadow-blue-500/50': currentBeatIndex === index,
                'bg-gray-300 dark:bg-gray-600': currentBeatIndex !== index && index > currentBeatIndex,
                'bg-blue-200 dark:bg-blue-800': currentBeatIndex !== index && index < currentBeatIndex,
              }"
            >
              {{ currentBeatIndex === index ? '🔊' : '' }}
            </div>
          </div>
          
          <div class="text-sm text-gray-400 mt-4">
            播放次數：{{ playCount + 1 }} / {{ config.playCount }}
          </div>
        </div>

        <!-- 輸入階段 -->
        <div 
          v-else-if="gamePhase === 'input'"
          class="input-phase text-center"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            點擊下方按鈕複製節奏
          </div>
          
          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-3 mb-8 flex-wrap">
            <div
              v-for="(tap, index) in userTaps"
              :key="index"
              class="tap-dot w-8 h-8 bg-green-500 rounded-full"
            />
            <div
              v-for="i in (currentBeats.length - userTaps.length)"
              :key="'placeholder-' + i"
              class="tap-placeholder w-8 h-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full"
            />
          </div>

          <!-- 敲擊按鈕 -->
          <button
            class="tap-btn w-40 h-40 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-6xl shadow-xl transition-all transform"
            :class="{ 'scale-90 bg-blue-700': isTapping }"
            @click="handleTap"
            @touchstart.prevent="handleTap"
          >
            👆
          </button>
          
          <div class="text-sm text-gray-500 dark:text-gray-400 mt-6">
            剩餘 {{ currentBeats.length - userTaps.length }} 次敲擊
          </div>

          <!-- 跳過按鈕 -->
          <button
            class="skip-btn mt-4 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            @click="skipInput"
          >
            完成輸入
          </button>
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
