<script setup lang="ts">
/**
 * 手勢記憶遊戲
 * 訓練維度：記憶力 + 協調力
 * 玩法：觀察一系列手勢動作後按順序重現
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
    maxStreak: number
    totalRounds: number
    correctRounds: number
    avgResponseTime: number
  }): void
  (e: 'progress', progress: number): void
}>()

// 手勢類型
interface Gesture {
  id: string
  name: string
  icon: string
  description: string
}

// 可用手勢
const GESTURES: Gesture[] = [
  { id: 'wave', name: '揮手', icon: '👋', description: '揮手打招呼' },
  { id: 'thumbsUp', name: '讚', icon: '👍', description: '豎起大拇指' },
  { id: 'thumbsDown', name: '倒讚', icon: '👎', description: '大拇指向下' },
  { id: 'peace', name: '勝利', icon: '✌️', description: '比出勝利手勢' },
  { id: 'ok', name: 'OK', icon: '👌', description: '比出 OK 手勢' },
  { id: 'fist', name: '拳頭', icon: '✊', description: '握緊拳頭' },
  { id: 'point', name: '指', icon: '👆', description: '伸出食指' },
  { id: 'clap', name: '拍手', icon: '👏', description: '拍手鼓掌' },
  { id: 'pray', name: '合掌', icon: '🙏', description: '雙手合十' },
  { id: 'muscle', name: '肌肉', icon: '💪', description: '展示肌肉' },
  { id: 'wave_bye', name: '再見', icon: '🖐️', description: '張開手掌揮手' },
  { id: 'call', name: '打電話', icon: '🤙', description: '打電話手勢' }
]

// 遊戲狀態
type GamePhase = 'ready' | 'showing' | 'input' | 'result' | 'gameover'

// 遊戲參數
const gameConfig = computed(() => {
  const configs = {
    easy: {
      startLength: 2,
      maxLength: 4,
      showTime: 1500,
      gesturePool: 6,
      totalRounds: 8
    },
    medium: {
      startLength: 3,
      maxLength: 6,
      showTime: 1200,
      gesturePool: 8,
      totalRounds: 10
    },
    hard: {
      startLength: 4,
      maxLength: 8,
      showTime: 900,
      gesturePool: 12,
      totalRounds: 12
    }
  }

  const base = configs[props.difficulty]
  
  // 根據子難度微調
  const subAdjust = (props.subDifficulty - 2) * 0.1
  
  return {
    ...base,
    showTime: Math.round(base.showTime * (1 - subAdjust * 0.5)),
    maxLength: base.maxLength + (props.subDifficulty - 2)
  }
})

// 遊戲狀態
const phase = ref<GamePhase>('ready')
const currentRound = ref(0)
const sequence = ref<Gesture[]>([])
const currentShowIndex = ref(-1)
const userInput = ref<Gesture[]>([])
const isCorrect = ref<boolean | null>(null)
const score = ref(0)
const streak = ref(0)
const maxStreak = ref(0)
const correctRounds = ref(0)
const sequenceLength = ref(2)
const responseTimes = ref<number[]>([])
const inputStartTime = ref(0)

// 可用手勢池
const gesturePool = computed(() => 
  GESTURES.slice(0, gameConfig.value.gesturePool)
)

// 計時器
let showTimer: ReturnType<typeof setTimeout> | null = null

// 產生隨機序列
function generateSequence(length: number): Gesture[] {
  const result: Gesture[] = []
  const pool = [...gesturePool.value]
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length)
    const gesture = pool[randomIndex]
    if (gesture) {
      result.push(gesture)
    }
  }
  
  return result
}

// 開始遊戲
function startGame(): void {
  phase.value = 'ready'
  currentRound.value = 0
  score.value = 0
  streak.value = 0
  maxStreak.value = 0
  correctRounds.value = 0
  sequenceLength.value = gameConfig.value.startLength
  responseTimes.value = []
  
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
  currentShowIndex.value = -1
  
  phase.value = 'showing'
  
  // 開始顯示序列
  showNextGesture()
  
  emit('progress', (currentRound.value / gameConfig.value.totalRounds) * 100)
}

// 顯示下一個手勢
function showNextGesture(): void {
  currentShowIndex.value++
  
  if (currentShowIndex.value >= sequence.value.length) {
    // 序列顯示完成，進入輸入階段
    setTimeout(() => {
      phase.value = 'input'
      inputStartTime.value = Date.now()
    }, 500)
    return
  }
  
  // 繼續顯示下一個
  showTimer = setTimeout(() => {
    showNextGesture()
  }, gameConfig.value.showTime)
}

// 使用者選擇手勢
function selectGesture(gesture: Gesture): void {
  if (phase.value !== 'input') return
  
  userInput.value.push(gesture)
  
  // 記錄反應時間（第一個手勢）
  if (userInput.value.length === 1) {
    responseTimes.value.push(Date.now() - inputStartTime.value)
  }
  
  // 檢查是否輸入完成
  if (userInput.value.length >= sequence.value.length) {
    checkAnswer()
  }
}

// 檢查答案
function checkAnswer(): void {
  phase.value = 'result'
  
  // 比對序列
  const correct = userInput.value.every((gesture, index) => 
    gesture.id === sequence.value[index]?.id
  )
  
  isCorrect.value = correct
  
  if (correct) {
    correctRounds.value++
    streak.value++
    if (streak.value > maxStreak.value) {
      maxStreak.value = streak.value
    }
    
    // 計算分數（考慮序列長度和連續正確）
    const baseScore = sequenceLength.value * 10
    const streakBonus = Math.min(streak.value - 1, 5) * 5
    score.value += baseScore + streakBonus
    
    // 增加序列長度
    if (sequenceLength.value < gameConfig.value.maxLength && streak.value >= 2) {
      sequenceLength.value++
    }
  } else {
    streak.value = 0
    
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
  
  const avgTime = responseTimes.value.length > 0
    ? responseTimes.value.reduce((a, b) => a + b, 0) / responseTimes.value.length
    : 0
  
  emit('complete', {
    score: score.value,
    accuracy: Math.round(accuracy),
    maxStreak: maxStreak.value,
    totalRounds: currentRound.value - 1,
    correctRounds: correctRounds.value,
    avgResponseTime: Math.round(avgTime)
  })
}

// 清理
function cleanup(): void {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
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
  <div class="gesture-memory p-4">
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
          <span class="text-[var(--color-text-muted)]">連續</span>
          <span class="font-bold ml-1 text-green-600">{{ streak }}</span>
        </div>
      </div>
      <div class="text-sm text-[var(--color-text-muted)]">
        序列長度: {{ sequenceLength }}
      </div>
    </div>

    <!-- 遊戲區域 -->
    <div class="game-area min-h-[400px] flex flex-col items-center justify-center">
      <!-- 準備階段 -->
      <div v-if="phase === 'ready'" class="text-center">
        <div class="text-6xl mb-4">🎯</div>
        <p class="text-xl text-[var(--color-text-secondary)]">準備開始...</p>
        <p class="text-sm text-[var(--color-text-muted)] mt-2">記住手勢的順序！</p>
      </div>

      <!-- 顯示序列階段 -->
      <div v-if="phase === 'showing'" class="text-center">
        <p class="text-lg text-[var(--color-text-muted)] mb-4">請記住順序</p>
        <div class="gesture-display text-9xl mb-4 animate-pulse">
          {{ sequence[currentShowIndex]?.icon || '' }}
        </div>
        <p class="text-xl text-[var(--color-text)]">
          {{ sequence[currentShowIndex]?.name || '' }}
        </p>
        <div class="flex justify-center gap-2 mt-6">
          <div 
            v-for="(_, index) in sequence" 
            :key="index"
            class="w-3 h-3 rounded-full transition-colors"
            :class="index <= currentShowIndex ? 'bg-blue-500' : 'bg-gray-300'"
          ></div>
        </div>
      </div>

      <!-- 輸入階段 -->
      <div v-if="phase === 'input'" class="w-full">
        <p class="text-lg text-center text-[var(--color-text-secondary)] mb-4">
          請按順序選擇手勢 ({{ userInput.length }}/{{ sequence.length }})
        </p>
        
        <!-- 已輸入的手勢 -->
        <div class="flex justify-center gap-2 mb-6 min-h-[60px]">
          <div 
            v-for="(gesture, index) in userInput" 
            :key="index"
            class="text-4xl bg-[var(--color-bg-soft)] rounded-xl p-2"
          >
            {{ gesture.icon }}
          </div>
          <div 
            v-for="i in (sequence.length - userInput.length)" 
            :key="'empty-' + i"
            class="w-14 h-14 border-2 border-dashed border-gray-300 rounded-xl"
          ></div>
        </div>

        <!-- 手勢選擇區 -->
        <div class="grid grid-cols-4 gap-3 max-w-md mx-auto">
          <button
            v-for="gesture in gesturePool"
            :key="gesture.id"
            @click="selectGesture(gesture)"
            class="gesture-btn aspect-square text-4xl bg-[var(--color-surface)] rounded-xl shadow-md
                   hover:shadow-lg hover:scale-105 active:scale-95 transition-all
                   border-2 border-transparent hover:border-blue-300"
          >
            {{ gesture.icon }}
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
            <span v-for="(gesture, index) in sequence" :key="index" class="text-3xl">
              {{ gesture.icon }}
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
              <p class="text-sm text-[var(--color-text-muted)]">最長連續</p>
              <p class="text-xl font-bold">{{ maxStreak }}</p>
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
.gesture-memory {
  max-width: 600px;
  margin: 0 auto;
}

.gesture-display {
  line-height: 1;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.gesture-btn {
  font-size: 2rem;
}

@media (max-width: 400px) {
  .gesture-btn {
    font-size: 1.5rem;
  }
}
</style>
