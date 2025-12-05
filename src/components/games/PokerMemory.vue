<script setup lang="ts">
/**
 * 撲克記憶遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useGameTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import {
  generateCards,
  flipAllCards,
  coverAllCards,
  flipCard,
  coverCards,
  checkMatch,
  markAsMatched,
  getFlippedCards,
  isGameComplete,
  getMatchedCount,
  calculatePairScore,
  calculateCompletionBonus,
  calculateGrade,
  summarizeResult,
  DIFFICULTY_CONFIGS,
  SUIT_COLORS,
  type PokerCard,
  type PokerMemoryConfig,
  type Suit,
} from '@/games/logic/pokerMemory'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
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
const config = computed<PokerMemoryConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
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

// ===== 倒數計時器 =====
const {
  time: timeLeft,
  isWarning: timerWarning,
  start: startTimer,
  stop: stopTimer,
  reset: resetTimer,
} = useGameTimer({
  mode: 'countdown',
  initialTime: config.value.timeLimit,
  warningTime: 15,
  onTimeUp: () => handleTimeUp(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, playFlip, playMatch, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const cards = ref<PokerCard[]>([])
const moves = ref(0)
const isPreviewing = ref(false)
const isChecking = ref(false)
const selectedCards = ref<number[]>([])

// ===== 計算屬性 =====
const gridCols = computed(() => config.value.gridCols)
const matchedPairs = computed(() => getMatchedCount(cards.value))

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
  '開始會短暫顯示所有牌面',
  '記住每張撲克牌的位置',
  '翻開兩張相同花色和數字的牌即配對成功',
  '在時間內完成所有配對',
]

// ===== 工具函數 =====
function getSuitColor(suit: string): string {
  return SUIT_COLORS[suit as Suit] || '#333'
}

// ===== 遊戲方法 =====
function handleStart() {
  // 生成卡片
  cards.value = generateCards(config.value)
  moves.value = 0
  selectedCards.value = []
  isChecking.value = false
  
  // 開始遊戲
  startGame()
  resetTimer(config.value.timeLimit)
  
  // 預覽階段
  isPreviewing.value = true
  cards.value = flipAllCards(cards.value)
  
  setTimeout(() => {
    // 蓋上所有卡片
    cards.value = coverAllCards(cards.value)
    isPreviewing.value = false
    
    // 開始計時
    startTimer()
  }, config.value.peekTime)
}

function handleCardClick(cardId: number) {
  if (!isPlaying.value || isPreviewing.value || isChecking.value) return
  
  const card = cards.value.find(c => c.id === cardId)
  if (!card || card.isFlipped || card.isMatched) return
  if (selectedCards.value.length >= 2) return
  
  // 翻開卡片
  playFlip()
  cards.value = flipCard(cards.value, cardId)
  selectedCards.value = [...selectedCards.value, cardId]
  
  // 檢查是否翻開兩張
  if (selectedCards.value.length === 2) {
    moves.value++
    isChecking.value = true
    
    const card1 = cards.value.find(c => c.id === selectedCards.value[0])
    const card2 = cards.value.find(c => c.id === selectedCards.value[1])
    
    if (card1 && card2 && checkMatch(card1, card2)) {
      // 配對成功
      setTimeout(() => {
        playMatch()
        cards.value = markAsMatched(cards.value, selectedCards.value)
        
        const pairScore = calculatePairScore(config.value, timeLeft.value, moves.value)
        addScore(pairScore)
        setFeedback('correct', `配對成功！+${pairScore}`, pairScore)
        
        setTimeout(() => {
          clearFeedback()
          selectedCards.value = []
          isChecking.value = false
          
          // 檢查是否完成
          if (isGameComplete(cards.value)) {
            handleGameEnd(true)
          }
        }, 300)
      }, 300)
    } else {
      // 配對失敗
      setTimeout(() => {
        playWrong()
        setFeedback('wrong')
        
        setTimeout(() => {
          cards.value = coverCards(cards.value, selectedCards.value)
          clearFeedback()
          selectedCards.value = []
          isChecking.value = false
        }, 500)
      }, 500)
    }
  }
}

function handleTimeUp() {
  handleGameEnd(false)
}

function handleGameEnd(completed: boolean) {
  stopTimer()
  playEnd()
  
  // 完成獎勵
  if (completed) {
    const bonus = calculateCompletionBonus(timeLeft.value)
    addScore(bonus)
  }
  
  const result = summarizeResult(
    score.value,
    matchedPairs.value,
    moves.value,
    timeLeft.value,
    config.value
  )
  
  finishGame()
  emit('game:end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopTimer()
    resetGame()
  }
})
</script>

<template>
  <div class="poker-memory-game w-full max-w-3xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="撲克記憶"
      icon="🃏"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 狀態列 -->
      <GameStatusBar
        :time="timeLeft"
        :score="score"
        :progress="Math.round((matchedPairs / config.pairs) * 100)"
        :is-warning="timerWarning"
        show-timer
        show-score
        show-progress
      />

      <!-- 遊戲資訊 -->
      <div class="game-info flex justify-center gap-6 mt-4 text-sm">
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">配對：</span>
          <span class="font-bold">{{ matchedPairs }} / {{ config.pairs }}</span>
        </div>
        <div class="stat">
          <span class="text-gray-500 dark:text-gray-400">翻牌：</span>
          <span class="font-bold">{{ moves }}</span>
        </div>
      </div>

      <!-- 預覽提示 -->
      <div 
        v-if="isPreviewing" 
        class="preview-hint text-center mt-4 text-lg font-medium text-blue-500"
      >
        記住牌面位置...
      </div>

      <!-- 卡片網格 -->
      <div 
        class="card-grid mt-6 grid gap-2 md:gap-3 mx-auto"
        :style="{ 
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          maxWidth: `${gridCols * 80}px`
        }"
      >
        <div
          v-for="card in cards"
          :key="card.id"
          class="poker-card aspect-[2/3] rounded-lg cursor-pointer transition-all duration-300 transform perspective-1000"
          :class="{
            'is-flipped': card.isFlipped,
            'is-matched': card.isMatched,
            'hover:scale-105': !card.isFlipped && !card.isMatched && !isChecking && !isPreviewing,
          }"
          @click="handleCardClick(card.id)"
        >
          <!-- 卡片內容 -->
          <div class="card-inner relative w-full h-full">
            <!-- 卡片背面 -->
            <div 
              class="card-back absolute inset-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800"
              :class="{ 'hidden': card.isFlipped }"
            >
              <div class="pattern text-4xl opacity-50">🂠</div>
            </div>
            
            <!-- 卡片正面 -->
            <div 
              class="card-front absolute inset-0 rounded-lg flex flex-col items-center justify-center bg-white dark:bg-gray-100 border-2"
              :class="{ 
                'hidden': !card.isFlipped,
                'border-green-500': card.isMatched,
                'border-gray-300': !card.isMatched,
              }"
            >
              <div 
                class="rank text-2xl md:text-3xl font-bold"
                :style="{ color: getSuitColor(card.suit) }"
              >
                {{ card.rank }}
              </div>
              <div 
                class="suit text-3xl md:text-4xl"
                :style="{ color: getSuitColor(card.suit) }"
              >
                {{ card.suit }}
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
.poker-card {
  min-height: 90px;
}

.perspective-1000 {
  perspective: 1000px;
}

.card-inner {
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.is-flipped .card-inner {
  transform: rotateY(180deg);
}

.card-back,
.card-front {
  backface-visibility: hidden;
}

.card-front {
  transform: rotateY(180deg);
}

.is-matched {
  opacity: 0.7;
  transform: scale(0.95);
}
</style>
