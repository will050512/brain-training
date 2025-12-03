<script setup lang="ts">
/**
 * 聽覺記憶遊戲
 * 訓練維度：記憶力 + 注意力
 * 玩法：聽取一系列聲音後，按順序選擇對應的圖案
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Difficulty, SubDifficulty } from '@/types/game'

// Props
interface Props {
  difficulty?: Difficulty
  subDifficulty?: SubDifficulty
}

const props = withDefaults(defineProps<Props>(), {
  difficulty: 'medium',
  subDifficulty: 2
})

// Emits
const emit = defineEmits<{
  (e: 'complete', result: {
    score: number
    accuracy: number
    maxLevel: number
    totalRounds: number
    correctRounds: number
  }): void
  (e: 'progress', progress: number): void
}>()

// 聲音類型
interface SoundItem {
  id: string
  name: string
  icon: string
  frequency: number  // 用於產生音調
  color: string
}

// 可用聲音
const SOUNDS: SoundItem[] = [
  { id: 'do', name: 'Do', icon: '🔴', frequency: 261.63, color: '#ef4444' },
  { id: 're', name: 'Re', icon: '🟠', frequency: 293.66, color: '#f97316' },
  { id: 'mi', name: 'Mi', icon: '🟡', frequency: 329.63, color: '#eab308' },
  { id: 'fa', name: 'Fa', icon: '🟢', frequency: 349.23, color: '#22c55e' },
  { id: 'sol', name: 'Sol', icon: '🔵', frequency: 392.00, color: '#3b82f6' },
  { id: 'la', name: 'La', icon: '🟣', frequency: 440.00, color: '#a855f7' },
  { id: 'si', name: 'Si', icon: '⚪', frequency: 493.88, color: '#6b7280' },
  { id: 'do2', name: 'Do\'', icon: '💗', frequency: 523.25, color: '#ec4899' }
]

// 遊戲配置
const gameConfig = computed(() => {
  const configs = {
    easy: {
      startLength: 2,
      maxLength: 5,
      soundPool: 4,
      totalRounds: 8,
      playbackSpeed: 800
    },
    medium: {
      startLength: 3,
      maxLength: 7,
      soundPool: 6,
      totalRounds: 10,
      playbackSpeed: 600
    },
    hard: {
      startLength: 4,
      maxLength: 9,
      soundPool: 8,
      totalRounds: 12,
      playbackSpeed: 500
    }
  }

  const base = configs[props.difficulty]
  
  // 根據子難度微調
  const subAdjust = props.subDifficulty - 2
  
  return {
    ...base,
    maxLength: base.maxLength + subAdjust,
    playbackSpeed: base.playbackSpeed - subAdjust * 50
  }
})

// 遊戲狀態
type GamePhase = 'ready' | 'playing' | 'input' | 'result' | 'gameover'

const phase = ref<GamePhase>('ready')
const currentRound = ref(0)
const sequence = ref<SoundItem[]>([])
const playingIndex = ref(-1)
const userInput = ref<SoundItem[]>([])
const isCorrect = ref<boolean | null>(null)
const score = ref(0)
const correctRounds = ref(0)
const sequenceLength = ref(2)
const maxLevelReached = ref(2)

// 可用聲音池
const soundPool = computed(() => 
  SOUNDS.slice(0, gameConfig.value.soundPool)
)

// Web Audio API
let audioContext: AudioContext | null = null

// 初始化 Audio Context
function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// 播放音調
function playTone(frequency: number, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    if (!audioContext) {
      initAudio()
    }
    
    if (!audioContext) {
      resolve()
      return
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    
    // 淡入淡出效果
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
    
    setTimeout(resolve, duration)
  })
}

// 產生隨機序列
function generateSequence(length: number): SoundItem[] {
  const result: SoundItem[] = []
  const pool = [...soundPool.value]
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length)
    const sound = pool[randomIndex]
    if (sound) {
      result.push(sound)
    }
  }
  
  return result
}

// 開始遊戲
function startGame(): void {
  initAudio()
  phase.value = 'ready'
  currentRound.value = 0
  score.value = 0
  correctRounds.value = 0
  sequenceLength.value = gameConfig.value.startLength
  maxLevelReached.value = gameConfig.value.startLength
  
  setTimeout(() => startRound(), 1000)
}

// 開始新一輪
function startRound(): void {
  currentRound.value++
  
  if (currentRound.value > gameConfig.value.totalRounds) {
    endGame()
    return
  }

  // 產生新序列
  sequence.value = generateSequence(sequenceLength.value)
  userInput.value = []
  isCorrect.value = null
  playingIndex.value = -1
  
  phase.value = 'playing'
  
  emit('progress', ((currentRound.value - 1) / gameConfig.value.totalRounds) * 100)
  
  // 開始播放序列
  playSequence()
}

// 播放序列
async function playSequence(): Promise<void> {
  for (let i = 0; i < sequence.value.length; i++) {
    if (phase.value !== 'playing') break
    
    playingIndex.value = i
    const currentSound = sequence.value[i]
    if (currentSound) {
      await playTone(currentSound.frequency, gameConfig.value.playbackSpeed * 0.8)
    }
    await new Promise(resolve => setTimeout(resolve, gameConfig.value.playbackSpeed * 0.3))
  }
  
  playingIndex.value = -1
  
  if (phase.value === 'playing') {
    phase.value = 'input'
  }
}

// 重新播放
function replaySequence(): void {
  if (phase.value !== 'input') return
  
  phase.value = 'playing'
  userInput.value = []
  playSequence()
}

// 使用者選擇聲音
async function selectSound(sound: SoundItem): Promise<void> {
  if (phase.value !== 'input') return
  
  // 播放選擇的音調
  playTone(sound.frequency, 200)
  
  userInput.value.push(sound)
  
  // 檢查是否輸入完成
  if (userInput.value.length >= sequence.value.length) {
    checkAnswer()
  }
}

// 檢查答案
function checkAnswer(): void {
  phase.value = 'result'
  
  // 比對序列
  const correct = userInput.value.every((sound, index) => 
    sound.id === sequence.value[index]?.id
  )
  
  isCorrect.value = correct
  
  if (correct) {
    correctRounds.value++
    
    // 計算分數
    const baseScore = sequenceLength.value * 15
    score.value += baseScore
    
    // 增加序列長度
    if (sequenceLength.value < gameConfig.value.maxLength) {
      sequenceLength.value++
      if (sequenceLength.value > maxLevelReached.value) {
        maxLevelReached.value = sequenceLength.value
      }
    }
  } else {
    // 降低序列長度
    if (sequenceLength.value > gameConfig.value.startLength) {
      sequenceLength.value--
    }
  }
  
  // 延遲後進入下一輪
  setTimeout(() => {
    startRound()
  }, 2000)
}

// 結束遊戲
function endGame(): void {
  phase.value = 'gameover'
  
  const accuracy = currentRound.value > 1 
    ? (correctRounds.value / (currentRound.value - 1)) * 100 
    : 0
  
  emit('complete', {
    score: score.value,
    accuracy: Math.round(accuracy),
    maxLevel: maxLevelReached.value,
    totalRounds: currentRound.value - 1,
    correctRounds: correctRounds.value
  })
}

// 清理
function cleanup(): void {
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
}

// 生命週期
onMounted(() => {
  startGame()
})

onUnmounted(() => {
  cleanup()
})

// 監聽難度變化
watch([() => props.difficulty, () => props.subDifficulty], () => {
  cleanup()
  startGame()
})
</script>

<template>
  <div class="audio-memory p-4">
    <!-- 遊戲資訊 -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex gap-4">
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">回合</span>
          <span class="font-bold ml-1">{{ currentRound }}/{{ gameConfig.totalRounds }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">分數</span>
          <span class="font-bold ml-1 text-blue-600">{{ score }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">正確</span>
          <span class="font-bold ml-1 text-green-600">{{ correctRounds }}</span>
        </div>
      </div>
      <div class="text-sm text-[var(--color-text-muted)]">
        音符數: {{ sequenceLength }}
      </div>
    </div>

    <!-- 遊戲區域 -->
    <div class="game-area min-h-[400px] flex flex-col items-center justify-center">
      <!-- 準備階段 -->
      <div v-if="phase === 'ready'" class="text-center">
        <div class="text-6xl mb-4">🎵</div>
        <p class="text-xl text-[var(--color-text-secondary)]">準備開始...</p>
        <p class="text-sm text-[var(--color-text-muted)] mt-2">仔細聽聲音的順序！</p>
      </div>

      <!-- 播放階段 -->
      <div v-if="phase === 'playing'" class="text-center">
        <p class="text-lg text-[var(--color-text-muted)] mb-6">請仔細聆聽...</p>
        
        <!-- 播放進度指示 -->
        <div class="flex justify-center items-center gap-2 mb-8">
          <div 
            v-for="(_, index) in sequence" 
            :key="index"
            class="w-4 h-4 rounded-full transition-all duration-200"
            :class="index === playingIndex 
              ? 'bg-blue-500 scale-150 animate-pulse' 
              : index < playingIndex 
                ? 'bg-gray-400' 
                : 'bg-gray-200'"
          ></div>
        </div>
        
        <!-- 當前播放的音符 -->
        <div v-if="playingIndex >= 0" class="text-8xl animate-bounce">
          {{ sequence[playingIndex]?.icon }}
        </div>
      </div>

      <!-- 輸入階段 -->
      <div v-if="phase === 'input'" class="w-full">
        <p class="text-lg text-center text-[var(--color-text-secondary)] mb-4">
          請按順序選擇音符 ({{ userInput.length }}/{{ sequence.length }})
        </p>
        
        <!-- 重新播放按鈕 -->
        <div class="text-center mb-4">
          <button 
            @click="replaySequence"
            class="text-sm text-blue-500 hover:text-blue-600 underline"
          >
            🔊 重新播放
          </button>
        </div>
        
        <!-- 已輸入的音符 -->
        <div class="flex justify-center gap-2 mb-6 min-h-[50px]">
          <div 
            v-for="(sound, index) in userInput" 
            :key="index"
            class="text-3xl"
          >
            {{ sound.icon }}
          </div>
          <div 
            v-for="i in (sequence.length - userInput.length)" 
            :key="'empty-' + i"
            class="w-10 h-10 border-2 border-dashed border-gray-300 rounded-full"
          ></div>
        </div>

        <!-- 音符選擇區 -->
        <div class="grid grid-cols-4 gap-3 max-w-sm mx-auto">
          <button
            v-for="sound in soundPool"
            :key="sound.id"
            @click="selectSound(sound)"
            class="sound-btn aspect-square text-3xl rounded-xl shadow-md
                   hover:shadow-lg hover:scale-105 active:scale-95 transition-all
                   flex flex-col items-center justify-center gap-1"
            :style="{ backgroundColor: sound.color + '20', borderColor: sound.color }"
            style="border-width: 2px"
          >
            {{ sound.icon }}
            <span class="text-xs text-[var(--color-text-secondary)]">{{ sound.name }}</span>
          </button>
        </div>
      </div>

      <!-- 結果階段 -->
      <div v-if="phase === 'result'" class="text-center">
        <div class="text-8xl mb-4">
          {{ isCorrect ? '✅' : '❌' }}
        </div>
        <p class="text-2xl font-bold mb-4" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
          {{ isCorrect ? '正確！' : '錯誤' }}
        </p>
        
        <!-- 顯示正確答案 -->
        <div v-if="!isCorrect" class="mt-4">
          <p class="text-sm text-[var(--color-text-muted)] mb-2">正確順序：</p>
          <div class="flex justify-center gap-2">
            <span v-for="(sound, index) in sequence" :key="index" class="text-3xl">
              {{ sound.icon }}
            </span>
          </div>
        </div>
      </div>

      <!-- 遊戲結束 -->
      <div v-if="phase === 'gameover'" class="text-center">
        <div class="text-6xl mb-4">🎉</div>
        <p class="text-2xl font-bold text-[var(--color-text)] mb-4">遊戲結束！</p>
        <div class="bg-[var(--color-bg-soft)] rounded-xl p-6 max-w-sm mx-auto">
          <div class="grid grid-cols-2 gap-4 text-left">
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">最終分數</p>
              <p class="text-2xl font-bold text-blue-600">{{ score }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">正確率</p>
              <p class="text-2xl font-bold text-green-600">
                {{ Math.round((correctRounds / (currentRound - 1)) * 100) }}%
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">最高等級</p>
              <p class="text-xl font-bold">{{ maxLevelReached }} 音符</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">完成回合</p>
              <p class="text-xl font-bold">{{ correctRounds }}/{{ currentRound - 1 }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-memory {
  max-width: 500px;
  margin: 0 auto;
}

.sound-btn {
  min-height: 70px;
}
</style>
