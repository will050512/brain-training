<script setup lang="ts">
/**
 * 聲音記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameAudio } from '@/games/core/useGameAudio'
import { usePauseController } from '@/games/core/usePauseController'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
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
  SOUND_LIBRARY,
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
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()

// ===== 遊戲配置 =====
const baseConfig = computed<AudioMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<AudioMemoryConfig>(() => {
  const adjusted = adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
  return {
    ...adjusted,
    soundPoolSize: Math.min(12, adjusted.soundPoolSize),
    totalRounds: baseConfig.value.totalRounds,
  }
})
const isPaused = computed(() => props.isPaused ?? false)
const { scheduleTimeout, pauseAwareDelay, waitForResume, clearTimers } = usePauseController(isPaused)

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
  pauseGame,
  resumeGame,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  setFeedback,
  clearFeedback,
  resetGame,
  recordAnswer,
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
const FALLBACK_NOTE_PROFILES = [
  { id: 'note-do', name: 'Do', frequency: 262, oscillatorType: 'sine', volume: 0.9 },
  { id: 'note-re', name: 'Re', frequency: 294, oscillatorType: 'triangle', volume: 0.9 },
  { id: 'note-mi', name: 'Mi', frequency: 330, oscillatorType: 'square', volume: 0.9 },
  { id: 'note-fa', name: 'Fa', frequency: 349, oscillatorType: 'sawtooth', volume: 0.9 },
  { id: 'note-sol', name: 'Sol', frequency: 392, oscillatorType: 'sine', volume: 0.95 },
  { id: 'note-la', name: 'La', frequency: 440, oscillatorType: 'triangle', volume: 0.95 },
  { id: 'note-si', name: 'Si', frequency: 494, oscillatorType: 'square', volume: 0.95 },
  { id: 'note-do2', name: 'Do+', frequency: 523, oscillatorType: 'sawtooth', volume: 0.95 },
] as const

const SOUND_IDS = SOUND_LIBRARY.map(sound => sound.id)
const AUDIO_MEMORY_VOLUME = 0.85
const FALLBACK_SOUND_CONFIGS = SOUND_IDS.map((id, index) => {
  const profile = FALLBACK_NOTE_PROFILES[index % FALLBACK_NOTE_PROFILES.length]!
  return {
    id,
    name: id,
    frequency: profile.frequency,
    duration: 420,
    volume: AUDIO_MEMORY_VOLUME,
    oscillatorType: profile.oscillatorType,
  }
})

const {
  playCorrect,
  playWrong,
  playEnd,
  playCustomSound,
  preloadSound,
  preloadDefaultSounds,
  preloadSounds,
  loadedSounds,
  stopAll,
} = useGameAudio({
  gameFolder: 'audio-memory',
  volume: AUDIO_MEMORY_VOLUME,
  customSounds: FALLBACK_SOUND_CONFIGS,
})

// ===== 遊戲資料 =====
const gameState = ref<AudioMemoryState | null>(null)
const soundPool = ref<SoundItem[]>([])
const maxLength = ref(config.value.startLength)
const gamePhase = ref<'listening' | 'input' | 'result'>('listening')
const currentPlayingIndex = ref(-1)
const streak = ref(0)
const maxStreak = ref(0)
const NOTE_DURATION_MS = 2000
let noteStopTimer: ReturnType<typeof setTimeout> | null = null

// ===== 計算屬性 =====
const userInput = computed(() => gameState.value?.userInput || [])
const sequence = computed(() => gameState.value?.sequence || [])
const currentLength = computed(() => gameState.value?.currentLength || config.value.startLength)
const soundGridClasses = computed(() =>
  props.difficulty === 'hard' ? 'grid-cols-4 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'
)

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
function stopNotePlayback(): void {
  if (noteStopTimer) {
    clearTimeout(noteStopTimer)
    noteStopTimer = null
  }
  stopAll()
}

async function ensureSoundLoaded(soundId: string): Promise<void> {
  if (!loadedSounds.value.has(soundId)) {
    await preloadSound(soundId)
  }
}

async function playNote(soundId: string): Promise<void> {
  stopNotePlayback()
  await ensureSoundLoaded(soundId)
  playCustomSound(soundId, AUDIO_MEMORY_VOLUME)
  noteStopTimer = window.setTimeout(() => {
    stopAll()
    noteStopTimer = null
  }, NOTE_DURATION_MS)
}

// ===== 遊戲方法 =====
function handleStart() {
  soundPool.value = getSoundPool(config.value.soundPoolSize)
  maxLength.value = config.value.startLength
  streak.value = 0
  maxStreak.value = 0
  
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
  
  const interval = Math.max(config.value.interval, NOTE_DURATION_MS)
  
  for (let i = 0; i < sequence.value.length; i++) {
    if (phase.value === 'paused') {
      await waitForResume()
    }
    if (phase.value !== 'playing') return

    currentPlayingIndex.value = i
    const sound = sequence.value[i]
    if (sound) {
      await playNote(sound.id)
    }
    await delay(NOTE_DURATION_MS)
    currentPlayingIndex.value = -1
    const gap = interval - NOTE_DURATION_MS
    if (gap > 0) {
      await delay(gap)
    }
  }
  
  // 進入輸入階段
  if (phase.value === 'paused') {
    await waitForResume()
  }
  if (phase.value !== 'playing') return
  gamePhase.value = 'input'
}

function delay(ms: number): Promise<void> {
  return pauseAwareDelay(ms)
}

function handleSoundClick(sound: SoundItem) {
  if (!isPlaying.value || gamePhase.value !== 'input' || !gameState.value) return
  
  // 播放選中的聲音
  void playNote(sound.id)
  
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
  const userAnswer = gameState.value.userInput.map(sound => sound.id)
  const correctAnswer = sequence.value.map(sound => sound.id)
  
  if (isCorrect) {
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    const earnedScore = calculateRoundScore(currentLength.value, isCorrect, streak.value)
    recordAnswer(true, userAnswer, correctAnswer, earnedScore)
    stopNotePlayback()
    playCorrect()
    setFeedback('correct', `正確！+${earnedScore}分`, earnedScore)
    
    // 更新最大長度
    if (currentLength.value > maxLength.value) {
      maxLength.value = currentLength.value
    }
  } else {
    streak.value = 0
    recordAnswer(false, userAnswer, correctAnswer, 0)
    stopNotePlayback()
    playWrong()
    setFeedback('wrong', '順序錯誤')
  }
  
  // 延遲後進入下一回合或結束
  scheduleTimeout(() => {
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
  }, 1700)
}

function replaySequence() {
  if (gamePhase.value !== 'input' || !gameState.value) return
  
  gamePhase.value = 'listening'
  stopNotePlayback()
  // 清空使用者輸入
  gameState.value = {
    ...gameState.value,
    userInput: [],
  }
  playSequence()
}

function handleGameEnd() {
  stopNotePlayback()
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
  preloadSounds(SOUND_IDS)
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
  stopNotePlayback()
  cleanupThrottle()
  clearTimers()
})

watch(isPaused, (paused) => {
  if (paused && phase.value === 'playing') {
    pauseGame()
    stopNotePlayback()
    return
  }

  if (!paused && phase.value === 'paused') {
    resumeGame()
  }
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    clearTimers()
    stopNotePlayback()
    resetGame()
  }
})
</script>

<template>
  <div class="audio-memory-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="聲音記憶"
      icon="🔊"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 遊戲資訊 -->
        <div class="game-info game-panel text-center mt-4 px-4 py-3">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)]">
            第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
          </div>
        <div class="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
            <div>
              <span class="text-[var(--color-text-muted)]">序列長度：</span>
              <span class="font-bold text-[var(--color-score)]">{{ currentLength }}</span>
            </div>
            <div>
              <span class="text-[var(--color-text-muted)]">連續正確：</span>
              <span class="font-bold text-[var(--color-combo)]">{{ streak }}</span>
            </div>
          </div>
        </div>

      <!-- 顯示區域 -->
        <div class="display-area game-panel mt-6 sm:mt-8 px-4 py-4">
        <!-- 聆聽階段 -->
        <div
          v-if="gamePhase === 'listening'"
          class="listening-phase text-center"
        >
          <div class="text-base sm:text-lg font-medium mb-3 sm:mb-4">
            🎵 仔細聆聽...
          </div>
          <div class="sound-indicator flex justify-center gap-2 sm:gap-3 flex-wrap">
            <div
              v-for="(sound, index) in sequence"
              :key="index"
              class="sound-dot w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 flex items-center justify-center text-lg sm:text-2xl min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px]"
              :class="{
                'bg-[var(--color-score)] scale-125 shadow-lg shadow-[var(--color-score)]/40': currentPlayingIndex === index,
                'bg-[var(--color-bg-muted)]': currentPlayingIndex !== index,
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
            <div class="text-xs sm:text-sm text-[var(--color-text-muted)] text-center mb-3 sm:mb-4">
              按順序點擊聲音
            </div>

          <!-- 輸入進度 -->
          <div class="input-progress flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 min-h-12 sm:min-h-14 flex-wrap">
            <div
              v-for="(sound, index) in userInput"
              :key="index"
              class="sound-icon w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-2xl bg-[var(--color-primary-bg)] rounded-full min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px]"
            >
              {{ sound.emoji }}
            </div>
            <div
              v-for="i in (currentLength - userInput.length)"
              :key="'placeholder-' + i"
              class="sound-placeholder w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-full min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px]"
            >
              ?
            </div>
          </div>

          <!-- 重播按鈕 -->
          <div class="text-center mb-3 sm:mb-4">
            <button
              class="replay-btn min-h-[48px] px-4 py-2 rounded-lg bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-soft)] transition-colors text-base sm:text-lg font-medium"
              @click="replaySequence"
            >
              🔁 重播聲音
            </button>
          </div>

          <!-- 聲音選擇區 -->
          <div class="sound-grid grid gap-2 sm:gap-3 max-w-sm sm:max-w-lg mx-auto" :class="soundGridClasses">
            <button
              v-for="sound in soundPool"
              :key="sound.id"
              class="sound-btn p-3 sm:p-4 rounded-xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-primary-bg)] transition-all transform hover:scale-105 active:scale-95 min-h-[60px] sm:min-h-[70px] md:min-h-[80px]"
              @click="handleSoundClick(sound)"
            >
              <div class="text-2xl sm:text-3xl">{{ sound.emoji }}</div>
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
            <div class="text-sm text-[var(--color-text-muted)] mb-2">正確順序</div>
            <div class="correct-sequence flex justify-center gap-2 mb-4 flex-wrap">
              <div
                v-for="(sound, index) in sequence"
                :key="index"
                class="w-12 h-12 flex items-center justify-center text-2xl bg-[var(--color-success-bg)] rounded-full"
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
                  'bg-[var(--color-success-bg)]': sound.id === sequence[index]?.id,
                  'bg-[var(--color-danger-bg)]': sound.id !== sequence[index]?.id,
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
  box-shadow: var(--shadow-score-dot);
}

.sound-dot.bg-\[var\(--color-score\)\] {
  box-shadow: var(--shadow-score-ring);
}
</style>
