<script setup lang="ts">
/**
 * 節奏模仿遊戲
 * 訓練維度：協調力 + 反應力
 * 玩法：觀察節奏模式後，在正確的時機點擊來模仿
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
    avgTimingError: number
  }): void
  (e: 'progress', progress: number): void
}>()

// 節拍類型
interface Beat {
  time: number  // 相對時間（毫秒）
  hit: boolean  // 是否已正確擊中
}

// 遊戲配置
const gameConfig = computed(() => {
  const configs = {
    easy: {
      startBeats: 3,
      maxBeats: 6,
      tempo: 800,      // 基本節拍間隔
      tolerance: 300,  // 時間容錯
      totalRounds: 8
    },
    medium: {
      startBeats: 4,
      maxBeats: 8,
      tempo: 600,
      tolerance: 200,
      totalRounds: 10
    },
    hard: {
      startBeats: 5,
      maxBeats: 10,
      tempo: 450,
      tolerance: 150,
      totalRounds: 12
    }
  }

  const base = configs[props.difficulty]
  
  // 根據子難度微調
  const subAdjust = props.subDifficulty - 2
  
  return {
    ...base,
    tempo: base.tempo - subAdjust * 50,
    tolerance: base.tolerance - subAdjust * 30,
    maxBeats: base.maxBeats + subAdjust
  }
})

// 遊戲狀態
type GamePhase = 'ready' | 'demo' | 'countdown' | 'play' | 'result' | 'gameover'

const phase = ref<GamePhase>('ready')
const currentRound = ref(0)
const pattern = ref<Beat[]>([])
const patternIndex = ref(-1)
const userHits = ref<number[]>([])
const countdown = ref(3)
const score = ref(0)
const correctRounds = ref(0)
const beatCount = ref(3)
const maxLevelReached = ref(3)
const timingErrors = ref<number[]>([])
const playStartTime = ref(0)
const lastTapFeedback = ref<'perfect' | 'good' | 'miss' | null>(null)

// Web Audio API
let audioContext: AudioContext | null = null

// 計時器
let demoTimer: ReturnType<typeof setTimeout> | null = null
let playTimer: ReturnType<typeof setInterval> | null = null

// 初始化 Audio
function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

// 播放節拍音效
function playBeatSound(type: 'beat' | 'hit' | 'miss' = 'beat'): void {
  if (!audioContext) initAudio()
  if (!audioContext) return

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  switch (type) {
    case 'beat':
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      break
    case 'hit':
      oscillator.type = 'triangle'
      oscillator.frequency.value = 660
      break
    case 'miss':
      oscillator.type = 'sawtooth'
      oscillator.frequency.value = 220
      break
  }
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.1)
}

// 產生節奏模式
function generatePattern(beats: number): Beat[] {
  const result: Beat[] = []
  const { tempo } = gameConfig.value
  
  // 基本節拍 + 一些變化
  for (let i = 0; i < beats; i++) {
    // 隨機添加一些節奏變化
    let interval = tempo
    
    // 30% 機率產生半拍
    if (i > 0 && Math.random() < 0.3) {
      interval = tempo * 0.5
    }
    // 20% 機率產生 1.5 拍
    else if (i > 0 && Math.random() < 0.2) {
      interval = tempo * 1.5
    }
    
    const lastBeat = result[result.length - 1]
    const lastTime = lastBeat ? lastBeat.time : 0
    result.push({
      time: lastTime + (i === 0 ? 0 : interval),
      hit: false
    })
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
  beatCount.value = gameConfig.value.startBeats
  maxLevelReached.value = gameConfig.value.startBeats
  timingErrors.value = []
  
  setTimeout(() => startRound(), 1000)
}

// 開始新一輪
function startRound(): void {
  currentRound.value++
  
  if (currentRound.value > gameConfig.value.totalRounds) {
    endGame()
    return
  }

  // 產生新模式
  pattern.value = generatePattern(beatCount.value)
  userHits.value = []
  patternIndex.value = -1
  lastTapFeedback.value = null
  
  emit('progress', ((currentRound.value - 1) / gameConfig.value.totalRounds) * 100)
  
  // 開始示範
  phase.value = 'demo'
  playDemo()
}

// 播放示範
function playDemo(): void {
  let currentIndex = 0
  
  function playNextBeat(): void {
    if (currentIndex >= pattern.value.length) {
      // 示範結束，開始倒數
      setTimeout(() => startCountdown(), 500)
      return
    }
    
    patternIndex.value = currentIndex
    playBeatSound('beat')
    
    const currentBeat = pattern.value[currentIndex]
    const nextBeat = pattern.value[currentIndex + 1]
    const nextDelay = currentIndex < pattern.value.length - 1 && nextBeat && currentBeat
      ? nextBeat.time - currentBeat.time
      : 0
    
    currentIndex++
    
    if (nextDelay > 0) {
      demoTimer = setTimeout(playNextBeat, nextDelay)
    } else {
      playNextBeat()
    }
  }
  
  playNextBeat()
}

// 開始倒數
function startCountdown(): void {
  phase.value = 'countdown'
  countdown.value = 3
  patternIndex.value = -1
  
  const countdownInterval = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval)
      startPlay()
    }
  }, 800)
}

// 開始玩家輸入
function startPlay(): void {
  phase.value = 'play'
  playStartTime.value = Date.now()
  
  // 設定結束時間（最後一拍時間 + 容錯時間 + 緩衝）
  const lastBeat = pattern.value[pattern.value.length - 1]
  const totalDuration = (lastBeat?.time ?? 0) + gameConfig.value.tolerance + 500
  
  playTimer = setTimeout(() => {
    checkResult()
  }, totalDuration)
}

// 玩家點擊
function handleTap(): void {
  if (phase.value !== 'play') return
  
  const tapTime = Date.now() - playStartTime.value
  userHits.value.push(tapTime)
  
  // 找到最近的預期拍子
  let nearestBeat: Beat | null = null
  let nearestDist = Infinity
  
  for (const beat of pattern.value) {
    if (!beat.hit) {
      const dist = Math.abs(tapTime - beat.time)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestBeat = beat
      }
    }
  }
  
  // 判斷是否命中
  if (nearestBeat && nearestDist <= gameConfig.value.tolerance) {
    nearestBeat.hit = true
    timingErrors.value.push(nearestDist)
    
    if (nearestDist <= gameConfig.value.tolerance * 0.3) {
      lastTapFeedback.value = 'perfect'
      playBeatSound('hit')
    } else {
      lastTapFeedback.value = 'good'
      playBeatSound('hit')
    }
    
    // 短暫顯示反饋後清除
    setTimeout(() => {
      lastTapFeedback.value = null
    }, 300)
    
    // 檢查是否全部完成
    if (pattern.value.every(b => b.hit)) {
      if (playTimer) {
        clearTimeout(playTimer)
        playTimer = null
      }
      setTimeout(() => checkResult(), 500)
    }
  } else {
    lastTapFeedback.value = 'miss'
    playBeatSound('miss')
    
    setTimeout(() => {
      lastTapFeedback.value = null
    }, 300)
  }
}

// 檢查結果
function checkResult(): void {
  phase.value = 'result'
  
  const hitCount = pattern.value.filter(b => b.hit).length
  const hitRate = hitCount / pattern.value.length
  
  // 80% 以上算通過
  const passed = hitRate >= 0.8
  
  if (passed) {
    correctRounds.value++
    
    // 計算分數
    const baseScore = beatCount.value * 20
    const accuracyBonus = Math.round(hitRate * 50)
    score.value += baseScore + accuracyBonus
    
    // 增加節拍數
    if (beatCount.value < gameConfig.value.maxBeats && hitRate >= 0.9) {
      beatCount.value++
      if (beatCount.value > maxLevelReached.value) {
        maxLevelReached.value = beatCount.value
      }
    }
  } else {
    // 降低節拍數
    if (beatCount.value > gameConfig.value.startBeats) {
      beatCount.value--
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
  
  const avgTimingError = timingErrors.value.length > 0
    ? timingErrors.value.reduce((a, b) => a + b, 0) / timingErrors.value.length
    : 0
  
  emit('complete', {
    score: score.value,
    accuracy: Math.round(accuracy),
    maxLevel: maxLevelReached.value,
    totalRounds: currentRound.value - 1,
    correctRounds: correctRounds.value,
    avgTimingError: Math.round(avgTimingError)
  })
}

// 清理
function cleanup(): void {
  if (demoTimer) {
    clearTimeout(demoTimer)
    demoTimer = null
  }
  if (playTimer) {
    clearTimeout(playTimer)
    playTimer = null
  }
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

// 計算進度
const hitProgress = computed(() => {
  if (pattern.value.length === 0) return 0
  return (pattern.value.filter(b => b.hit).length / pattern.value.length) * 100
})
</script>

<template>
  <div class="rhythm-mimic p-4">
    <!-- 遊戲資訊 -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex gap-4">
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">回合</span>
          <span class="font-bold ml-1">{{ currentRound }}/{{ gameConfig.totalRounds }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">分數</span>
          <span class="font-bold ml-1 text-blue-600 dark:text-blue-400">{{ score }}</span>
        </div>
        <div class="text-sm">
          <span class="text-[var(--color-text-muted)]">正確</span>
          <span class="font-bold ml-1 text-green-600 dark:text-green-400">{{ correctRounds }}</span>
        </div>
      </div>
      <div class="text-sm text-[var(--color-text-muted)]">
        節拍數: {{ beatCount }}
      </div>
    </div>

    <!-- 遊戲區域 -->
    <div class="game-area min-h-[400px] flex flex-col items-center justify-center">
      <!-- 準備階段 -->
      <div v-if="phase === 'ready'" class="text-center">
        <div class="text-6xl mb-4">🎶</div>
        <p class="text-xl text-[var(--color-text-secondary)]">準備開始...</p>
        <p class="text-sm text-[var(--color-text-muted)] mt-2">觀察節奏後跟著敲擊！</p>
      </div>

      <!-- 示範階段 -->
      <div v-if="phase === 'demo'" class="text-center">
        <p class="text-lg text-[var(--color-text-muted)] mb-4">觀察節奏...</p>
        
        <!-- 節拍顯示 -->
        <div class="flex justify-center gap-3 mb-6">
          <div 
            v-for="(beat, index) in pattern" 
            :key="index"
            class="w-10 h-10 rounded-full transition-all duration-100"
            :class="index === patternIndex 
              ? 'bg-blue-500 scale-125 shadow-lg' 
              : 'bg-gray-200 dark:bg-gray-600'"
          ></div>
        </div>
        
        <!-- 動畫鼓 -->
        <div 
          class="drum text-8xl transition-transform duration-100"
          :class="patternIndex >= 0 ? 'scale-110' : ''"
        >
          🥁
        </div>
      </div>

      <!-- 倒數階段 -->
      <div v-if="phase === 'countdown'" class="text-center">
        <p class="text-lg text-[var(--color-text-muted)] mb-4">準備...</p>
        <div class="text-8xl font-bold text-blue-500 animate-pulse">
          {{ countdown }}
        </div>
      </div>

      <!-- 玩家輸入階段 -->
      <div v-if="phase === 'play'" class="text-center w-full">
        <p class="text-lg text-[var(--color-text-muted)] mb-4">現在輪到你！</p>
        
        <!-- 進度條 -->
        <div class="w-full max-w-xs mx-auto h-3 bg-[var(--color-bg-soft)] rounded-full mb-6">
          <div 
            class="h-full bg-green-500 rounded-full transition-all duration-300"
            :style="{ width: hitProgress + '%' }"
          ></div>
        </div>
        
        <!-- 節拍狀態 -->
        <div class="flex justify-center gap-3 mb-8">
          <div 
            v-for="(beat, index) in pattern" 
            :key="index"
            class="w-8 h-8 rounded-full transition-all"
            :class="beat.hit ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
          ></div>
        </div>
        
        <!-- 敲擊區域 -->
        <button
          @click="handleTap"
          class="tap-area w-48 h-48 rounded-full mx-auto flex items-center justify-center
                 bg-gradient-to-br from-blue-400 to-blue-600 text-white
                 shadow-xl active:scale-95 transition-transform cursor-pointer"
          :class="[
            lastTapFeedback === 'perfect' ? 'ring-4 ring-yellow-400' : '',
            lastTapFeedback === 'good' ? 'ring-4 ring-green-400' : '',
            lastTapFeedback === 'miss' ? 'ring-4 ring-red-400' : ''
          ]"
        >
          <span class="text-6xl">👆</span>
        </button>
        
        <!-- 反饋提示 -->
        <div class="h-8 mt-4">
          <p v-if="lastTapFeedback === 'perfect'" class="text-yellow-500 font-bold animate-bounce">
            完美！
          </p>
          <p v-else-if="lastTapFeedback === 'good'" class="text-green-500 font-bold">
            不錯！
          </p>
          <p v-else-if="lastTapFeedback === 'miss'" class="text-red-500 font-bold">
            錯過了
          </p>
        </div>
      </div>

      <!-- 結果階段 -->
      <div v-if="phase === 'result'" class="text-center">
        <div class="text-8xl mb-4">
          {{ pattern.filter(b => b.hit).length >= pattern.length * 0.8 ? '✅' : '❌' }}
        </div>
        <p class="text-2xl font-bold mb-2" 
           :class="pattern.filter(b => b.hit).length >= pattern.length * 0.8 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
          {{ pattern.filter(b => b.hit).length >= pattern.length * 0.8 ? '通過！' : '再加油！' }}
        </p>
        <p class="text-[var(--color-text-muted)]">
          命中 {{ pattern.filter(b => b.hit).length }}/{{ pattern.length }} 拍
        </p>
      </div>

      <!-- 遊戲結束 -->
      <div v-if="phase === 'gameover'" class="text-center">
        <div class="text-6xl mb-4">🎉</div>
        <p class="text-2xl font-bold text-[var(--color-text)] mb-4">遊戲結束！</p>
        <div class="bg-[var(--color-bg-soft)] rounded-xl p-6 max-w-sm mx-auto">
          <div class="grid grid-cols-2 gap-4 text-left">
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">最終分數</p>
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ score }}</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">通過率</p>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                {{ Math.round((correctRounds / (currentRound - 1)) * 100) }}%
              </p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">最高等級</p>
              <p class="text-xl font-bold">{{ maxLevelReached }} 拍</p>
            </div>
            <div>
              <p class="text-sm text-[var(--color-text-muted)]">平均誤差</p>
              <p class="text-xl font-bold">
                {{ timingErrors.length > 0 
                   ? Math.round(timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length) 
                   : 0 }}ms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rhythm-mimic {
  max-width: 500px;
  margin: 0 auto;
}

.tap-area {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tap-area:active {
  transform: scale(0.95);
}

.drum {
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
