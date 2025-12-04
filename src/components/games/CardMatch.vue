<script setup lang="ts">
/**
 * 卡片配對遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import {
  generateCards,
  checkMatch,
  summarizeResult,
  CARD_MATCH_CONFIGS,
  type Card,
  type CardMatchConfig
} from '@/games/logic/cardMatch'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameResultScreen from './ui/GameResultScreen.vue'
import GameStatusBar from './ui/GameStatusBar.vue'
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
}>()

// ===== 遊戲配置 =====
const config = computed<CardMatchConfig>(() => CARD_MATCH_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  progress,
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
  totalRounds: config.value.pairs,
  timeLimit: config.value.timeLimit,
})

function startGame() {
  startGameState()
  emit('game:start')
}

function finishGame() {
  finishGameState()
}

// ===== 計時器（正計時模式） =====
const {
  time: elapsedTime,
  start: startTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'stopwatch',
  initialTime: 0,
})

// ===== 倒數計時器（有時間限制時） =====
const {
  time: countdownTime,
  isWarning: timerWarning,
  start: startCountdown,
  stop: stopCountdown,
  reset: resetCountdown,
} = useGameTimer({
  mode: 'countdown',
  initialTime: config.value.timeLimit || 120,
  warningTime: 15,
  onTimeUp: () => handleTimeUp(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, playFlip, playMatch, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const cards = ref<Card[]>([])
const flippedIndices = ref<number[]>([])
const matchedPairs = ref(0)
const moves = ref(0)
const isChecking = ref(false)
const isPreviewing = ref(false)

const displayTime = computed(() => 
  config.value.timeLimit > 0 ? countdownTime.value : elapsedTime.value
)

const totalPairs = computed(() => config.value.pairs)

const gridCols = computed(() => config.value.gridCols)

// ===== 回饋映射 =====
const feedbackData = computed(() => {
  if (!feedback.value) return undefined
  return {
    type: feedback.value.type,
    show: showFeedback.value,
    message: feedback.value.message,
  }
})

// ===== 遊戲說明 =====
const gameInstructions = [
  '遊戲開始會短暫顯示所有卡片',
  '記住每張卡片的位置',
  '翻開兩張相同的卡片即可配對',
  '用最少的步數完成所有配對',
]

// ===== 遊戲方法 =====
function handleStart() {
  // 生成卡片
  cards.value = generateCards(config.value)
  flippedIndices.value = []
  matchedPairs.value = 0
  moves.value = 0
  isChecking.value = false
  
  // 開始遊戲
  startGame()
  
  // 預覽階段
  isPreviewing.value = true
  cards.value = cards.value.map(c => ({ ...c, isFlipped: true }))
  
  setTimeout(() => {
    // 隱藏所有卡片
    cards.value = cards.value.map(c => ({ ...c, isFlipped: false }))
    isPreviewing.value = false
    
    // 開始計時
    if (config.value.timeLimit > 0) {
      resetCountdown(config.value.timeLimit)
      startCountdown()
    } else {
      resetTimer()
      startTimer()
    }
  }, config.value.previewTime)
}

function handleCardClick(index: number) {
  if (!isPlaying.value || isPreviewing.value || isChecking.value) return
  
  const card = cards.value[index]
  if (!card || card.isFlipped || card.isMatched) return
  if (flippedIndices.value.length >= 2) return
  
  // 翻開卡片
  playFlip()
  cards.value[index] = { ...card, isFlipped: true }
  flippedIndices.value.push(index)
  
  // 檢查配對
  if (flippedIndices.value.length === 2) {
    moves.value++
    isChecking.value = true
    
    const idx1 = flippedIndices.value[0]!
    const idx2 = flippedIndices.value[1]!
    const card1 = cards.value[idx1]!
    const card2 = cards.value[idx2]!
    
    if (checkMatch(card1, card2)) {
      // 配對成功
      setTimeout(() => {
        playMatch()
        cards.value[idx1] = { ...card1, isMatched: true }
        cards.value[idx2] = { ...card2, isMatched: true }
        matchedPairs.value++
        
        const matchScore = 10
        addScore(matchScore)
        setFeedback('correct', '配對成功！')
        
        setTimeout(() => {
          clearFeedback()
          flippedIndices.value = []
          isChecking.value = false
          
          // 檢查是否完成
          if (matchedPairs.value >= totalPairs.value) {
            handleGameEnd()
          }
        }, 300)
      }, 300)
    } else {
      // 配對失敗
      setTimeout(() => {
        playWrong()
        setFeedback('wrong')
        
        setTimeout(() => {
          cards.value[idx1] = { ...card1, isFlipped: false }
          cards.value[idx2] = { ...card2, isFlipped: false }
          clearFeedback()
          flippedIndices.value = []
          isChecking.value = false
        }, 500)
      }, 500)
    }
  }
}

function handleTimeUp() {
  handleGameEnd()
}

function handleGameEnd() {
  stopTimer()
  stopCountdown()
  playEnd()
  
  const duration = config.value.timeLimit > 0
    ? config.value.timeLimit - countdownTime.value
    : elapsedTime.value
  
  const result = summarizeResult(
    matchedPairs.value,
    totalPairs.value,
    moves.value,
    duration
  )
  
  finishGame()
  emit('game:end', result)
}

function handleRestart() {
  stopTimer()
  stopCountdown()
  resetGame()
  handleStart()
}

function handleQuit() {
  stopTimer()
  stopCountdown()
  resetGame()
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    stopCountdown()
    resetGame()
  }
})
</script>

<template>
  <div class="card-match-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="翻牌配對"
      icon="🃏"
      :rules="gameInstructions"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 狀態列 -->
      <GameStatusBar
        :time="displayTime"
        :score="score"
        :progress="Math.round((matchedPairs / totalPairs) * 100)"
        :is-warning="timerWarning"
        show-timer
        show-score
        show-progress
      />

      <!-- 遊戲資訊 -->
      <div class="game-info flex justify-center gap-6 mt-4 text-sm">
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">配對：</span>
          <span class="font-bold">{{ matchedPairs }} / {{ totalPairs }}</span>
        </div>
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">步數：</span>
          <span class="font-bold">{{ moves }}</span>
        </div>
      </div>

      <!-- 預覽提示 -->
      <div 
        v-if="isPreviewing" 
        class="preview-hint text-center mt-4 text-lg font-medium text-blue-500"
      >
        記住卡片位置...
      </div>

      <!-- 卡片網格 -->
      <div 
        class="card-grid mt-6 grid gap-2 md:gap-3"
        :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }"
      >
        <button
          v-for="(card, index) in cards"
          :key="card.id"
          class="card-cell aspect-square rounded-lg transition-all duration-300 transform"
          :class="{
            'bg-blue-500 scale-100': !card.isFlipped && !card.isMatched,
            'bg-white dark:bg-gray-700 scale-105 rotate-y-180': card.isFlipped && !card.isMatched,
            'bg-green-500 scale-95 opacity-70': card.isMatched,
            'cursor-pointer hover:scale-105': !card.isFlipped && !card.isMatched && !isChecking && !isPreviewing,
            'cursor-default': card.isFlipped || card.isMatched || isChecking || isPreviewing,
          }"
          :disabled="card.isFlipped || card.isMatched || isChecking || isPreviewing"
          @click="handleCardClick(index)"
        >
          <span 
            class="text-3xl md:text-4xl transition-opacity duration-200"
            :class="{ 'opacity-0': !card.isFlipped && !card.isMatched, 'opacity-100': card.isFlipped || card.isMatched }"
          >
            {{ card.emoji }}
          </span>
        </button>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
      />
    </template>

    <!-- 結果畫面 -->
    <GameResultScreen
      v-else-if="phase === 'finished' || phase === 'result'"
      :score="score"
      :max-score="totalPairs * 10"
      :accuracy="matchedPairs / totalPairs"
      :duration="config.timeLimit > 0 ? config.timeLimit - countdownTime : elapsedTime"
      :stats="[
        { label: '配對', value: `${matchedPairs}/${totalPairs}`, icon: '🎴' },
        { label: '步數', value: moves, icon: '👆' },
        { label: '效率', value: `${Math.round((totalPairs * 2 / Math.max(moves, 1)) * 100)}%`, icon: '⚡' },
      ]"
      @restart="handleRestart"
      @quit="handleQuit"
    />
  </div>
</template>

<style scoped>
.card-cell {
  perspective: 1000px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.card-cell span {
  transform: rotateY(180deg);
}
</style>
