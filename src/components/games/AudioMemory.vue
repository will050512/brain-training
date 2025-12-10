<script setup lang="ts">
/**
 * 聲音記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import type { GameStatusUpdate } from '@/types'
import {
  createGameState,
  addUserInput,
  isInputComplete,
  validateAnswer,
  calculateRoundScore,
  getNextLength,
  createNextRound,
  calculateGrade,
  summarizeResult,
  getSoundPool,
  DIFFICULTY_CONFIGS,
  type AudioMemoryState,
  type SoundItem,
  type AudioMemoryConfig,
} from '@/games/logic/audioMemory'

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
const config = computed<AudioMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

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
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const gameState = ref<AudioMemoryState | null>(null)
const soundPool = ref<SoundItem[]>([])
const maxLength = ref(config.value.startLength)
const gamePhase = ref<'listening' | 'input' | 'result'>('listening')
const currentPlayingIndex = ref(-1)
const streak = ref(0)
const maxStreak = ref(0)
let audioContext: AudioContext | null = null

// ===== 計算屬性 =====
const userInput = computed(() => gameState.value?.userInput || [])
const sequence = computed(() => gameState.value?.sequence || [])
const currentLength = computed(() => gameState.value?.currentLength || config.value.startLength)

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
  '仔細聆聽播放的聲音序列',
  '記住聲音出現的順序',
  '按照相同順序點擊對應聲音',
  '連續答對可增加序列長度',
]

// ===== 音效生成 =====
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// 為每個聲音類別分配不同頻率
const SOUND_FREQUENCIES: Record<string, number> = {
  dog: 200, cat: 400, bird: 800, cow: 150, pig: 250, rooster: 600,
  piano: 440, guitar: 330, drum: 100, violin: 550, trumpet: 466, bell: 880,
  rain: 300, thunder: 80, wind: 200, wave: 250,
  doorbell: 523, phone: 440, clock: 261, whistle: 700,
}

function playSoundById(soundId: string) {
  const ctx = initAudioContext()
  if (!ctx) return

  const frequency = SOUND_FREQUENCIES[soundId] || 440
  
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  
  gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
  
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.5)
}

// ===== 遊戲方法 =====
function handleStart() {
  soundPool.value = getSoundPool(config.value.soundPoolSize)
  maxLength.value = config.value.startLength
  streak.value = 0
  maxStreak.value = 0
  
  // 初始化音頻
  initAudioContext()
  
  startGame()
  startNewRound()
}

function startNewRound() {
  gameState.value = createGameState(config.value)
  gamePhase.value = 'listening'
  currentPlayingIndex.value = -1
  
  // 開始播放序列
  playSequence()
}

async function playSequence() {
  if (!gameState.value) return
  
  const interval = config.value.interval
  
  for (let i = 0; i < sequence.value.length; i++) {
    currentPlayingIndex.value = i
    const sound = sequence.value[i]
    if (sound) {
      playSoundById(sound.id)
    }
    await delay(interval)
    currentPlayingIndex.value = -1
    await delay(200) // 間隔
  }
  
  // 進入輸入階段
  gamePhase.value = 'input'
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function handleSoundClick(sound: SoundItem) {
  if (!isPlaying.value || gamePhase.value !== 'input' || !gameState.value) return
  
  // 播放選中的聲音
  playSoundById(sound.id)
  
  gameState.value = addUserInput(gameState.value, sound)
  
  // 檢查是否輸入完成
  if (isInputComplete(gameState.value)) {
    checkAnswer()
  }
}

function checkAnswer() {
  if (!gameState.value) return
  
  gamePhase.value = 'result'
  const isCorrect = validateAnswer(gameState.value)
  
  if (isCorrect) {
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    const earnedScore = calculateRoundScore(currentLength.value, isCorrect, streak.value)
    addScore(earnedScore)
    playCorrect()
    setFeedback('correct', `正確！+${earnedScore}分`, earnedScore)
    
    // 更新最大長度
    if (currentLength.value > maxLength.value) {
      maxLength.value = currentLength.value
    }
  } else {
    streak.value = 0
    playWrong()
    setFeedback('wrong', '順序錯誤')
  }
  
  // 延遲後進入下一回合或結束
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      // 建立新回合
      if (gameState.value) {
        gameState.value = createNextRound(gameState.value, isCorrect, streak.value, config.value)
      }
      gamePhase.value = 'listening'
      currentPlayingIndex.value = -1
      playSequence()
    } else {
      handleGameEnd()
    }
  }, 1500)
}

function replaySequence() {
  if (gamePhase.value !== 'input' || !gameState.value) return
  
  gamePhase.value = 'listening'
  // 清空使用者輸入
  gameState.value = {
    ...gameState.value,
    userInput: [],
  }
  playSequence()
}

function handleGameEnd() {
  playEnd()
  
  const result = summarizeResult(
    score.value,
    correctCount.value,
    config.value.totalRounds,
    maxStreak.value,
    maxLength.value
  )
  
  finishGame()
  emit('game-end', result)
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
  <div class="audio-memory-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="聲音記憶"
      icon="🔊"
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
        <div class="flex justify-center gap-4 mt-2 text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">序列長度：</span>
            <span class="font-bold text-blue-500">{{ currentLength }}</span>
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
          <div class="text-lg font-medium mb-4">
            🎵 仔細聆聽...
          </div>
          <div class="sound-indicator flex justify-center gap-3 flex-wrap">
            <div
              v-for="(sound, index) in sequence"
              :key="index"
              class="sound-dot w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center text-2xl"
              :class="{
                'bg-blue-500 scale-125 shadow-lg shadow-blue-500/50': currentPlayingIndex === index,
                'bg-gray-300 dark:bg-gray-600': currentPlayingIndex !== index,
              }"
            >
              {{ currentPlayingIndex === index ? sound.emoji : '' }}
            </div>
          </div>
        </div>

        <!-- 輸入階段 -->
        <div 
          v-else-if="gamePhase === 'input'"
          class="input-phase"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            按順序點擊聲音
          </div>
          
          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-2 mb-6 min-h-14 flex-wrap">
            <div
              v-for="(sound, index) in userInput"
              :key="index"
              class="sound-icon w-12 h-12 flex items-center justify-center text-2xl bg-blue-100 dark:bg-blue-900 rounded-full"
            >
              {{ sound.emoji }}
            </div>
            <div
              v-for="i in (currentLength - userInput.length)"
              :key="'placeholder-' + i"
              class="sound-placeholder w-12 h-12 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full"
            >
              ?
            </div>
          </div>

          <!-- 重播按鈕 -->
          <div class="text-center mb-4">
            <button
              class="replay-btn px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              @click="replaySequence"
            >
              🔁 重播聲音
            </button>
          </div>

          <!-- 聲音選擇區 -->
          <div class="sound-grid grid grid-cols-3 md:grid-cols-4 gap-3 max-w-lg mx-auto">
            <button
              v-for="sound in soundPool"
              :key="sound.id"
              class="sound-btn p-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all transform hover:scale-105 active:scale-95"
              @click="handleSoundClick(sound)"
            >
              <div class="text-3xl">{{ sound.emoji }}</div>
              <div class="text-xs mt-1">{{ sound.name }}</div>
            </button>
          </div>
        </div>

        <!-- 結果階段 -->
        <div 
          v-else-if="gamePhase === 'result'"
          class="result-phase text-center"
        >
          <div class="sequence-compare">
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">正確順序</div>
            <div class="correct-sequence flex justify-center gap-2 mb-4 flex-wrap">
              <div
                v-for="(sound, index) in sequence"
                :key="index"
                class="w-12 h-12 flex items-center justify-center text-2xl bg-green-100 dark:bg-green-900 rounded-full"
              >
                {{ sound.emoji }}
              </div>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">你的順序</div>
            <div class="user-sequence flex justify-center gap-2 flex-wrap">
              <div
                v-for="(sound, index) in userInput"
                :key="index"
                class="w-12 h-12 flex items-center justify-center text-2xl rounded-full"
                :class="{
                  'bg-green-100 dark:bg-green-900': sound.id === sequence[index]?.id,
                  'bg-red-100 dark:bg-red-900': sound.id !== sequence[index]?.id,
                }"
              >
                {{ sound.emoji }}
              </div>
            </div>
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
.sound-btn:active {
  transform: scale(0.9);
}

.sound-dot {
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
}

.sound-dot.bg-blue-500 {
  box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
}
</style>
