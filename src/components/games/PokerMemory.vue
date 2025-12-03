<script setup lang="ts">
/**
 * 撲克記憶 (PokerMemory) - 撲克牌翻牌配對遊戲
 * 訓練：短期記憶、視覺空間記憶、注意力
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Difficulty } from '@/types/game'

// 簡化的遊戲結果介面（用於組件內部）
interface SimpleGameResult {
  score: number
  maxScore: number
  accuracy: number
  timeSpent: number
  details: Record<string, unknown>
}

const props = defineProps<{
  difficulty: Difficulty
}>()

const emit = defineEmits<{
  (e: 'complete', result: SimpleGameResult): void
  (e: 'scoreUpdate', score: number): void
}>()

// 遊戲設定
const GAME_CONFIG = {
  easy: {
    pairs: 6,
    gridCols: 4,
    timeLimit: 120,
    peekTime: 3000,
    points: 20,
  },
  medium: {
    pairs: 8,
    gridCols: 4,
    timeLimit: 120,
    peekTime: 2000,
    points: 25,
  },
  hard: {
    pairs: 12,
    gridCols: 6,
    timeLimit: 120,
    peekTime: 1500,
    points: 30,
  },
}

// 撲克牌花色和數字
const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_COLORS: Record<string, string> = {
  '♠': '#1a1a1a',
  '♥': '#ef4444',
  '♦': '#ef4444',
  '♣': '#1a1a1a',
}
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

interface Card {
  id: number
  suit: string
  rank: string
  isFlipped: boolean
  isMatched: boolean
}

// 遊戲狀態
const config = computed(() => GAME_CONFIG[props.difficulty])
const gameState = ref<'ready' | 'peek' | 'playing' | 'finished'>('ready')
const cards = ref<Card[]>([])
const flippedCards = ref<Card[]>([])
const matchedPairs = ref(0)
const moves = ref(0)
const score = ref(0)
const timeLeft = ref(0)
const startTime = ref(0)
const peekCountdown = ref(0)

let timer: ReturnType<typeof setInterval> | null = null
let peekTimer: ReturnType<typeof setInterval> | null = null

// 進度
const progress = computed(() => 
  (matchedPairs.value / config.value.pairs) * 100
)

// 產生卡片
function generateCards() {
  const totalCards = config.value.pairs * 2
  const cardPairs: { suit: string; rank: string }[] = []
  
  // 隨機選擇花色和數字組合
  const usedCombos = new Set<string>()
  while (cardPairs.length < config.value.pairs) {
    const suitIndex = Math.floor(Math.random() * SUITS.length)
    const rankIndex = Math.floor(Math.random() * RANKS.length)
    const suit = SUITS[suitIndex] ?? '♠'
    const rank = RANKS[rankIndex] ?? 'A'
    const combo = `${suit}${rank}`
    
    if (!usedCombos.has(combo)) {
      usedCombos.add(combo)
      cardPairs.push({ suit, rank })
    }
  }
  
  // 建立成對卡片
  const newCards: Card[] = []
  cardPairs.forEach((card, index) => {
    newCards.push({
      id: index * 2,
      suit: card.suit,
      rank: card.rank,
      isFlipped: false,
      isMatched: false,
    })
    newCards.push({
      id: index * 2 + 1,
      suit: card.suit,
      rank: card.rank,
      isFlipped: false,
      isMatched: false,
    })
  })
  
  // 洗牌
  for (let i = newCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = newCards[i]
    if (newCards[j] !== undefined && temp !== undefined) {
      newCards[i] = newCards[j]!
      newCards[j] = temp
    }
  }
  
  cards.value = newCards
}

// 開始遊戲
function startGame() {
  generateCards()
  matchedPairs.value = 0
  moves.value = 0
  score.value = 0
  timeLeft.value = config.value.timeLimit
  startTime.value = Date.now()
  
  // 偷看階段
  gameState.value = 'peek'
  peekCountdown.value = Math.ceil(config.value.peekTime / 1000)
  
  // 翻開所有卡片
  cards.value.forEach(card => card.isFlipped = true)
  
  // 倒數計時
  peekTimer = setInterval(() => {
    peekCountdown.value--
    if (peekCountdown.value <= 0) {
      clearInterval(peekTimer!)
      peekTimer = null
      startPlaying()
    }
  }, 1000)
}

// 開始正式遊戲
function startPlaying() {
  // 蓋上所有卡片
  cards.value.forEach(card => card.isFlipped = false)
  gameState.value = 'playing'
  
  // 遊戲計時器
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

// 翻牌
function flipCard(card: Card) {
  if (
    gameState.value !== 'playing' ||
    card.isFlipped ||
    card.isMatched ||
    flippedCards.value.length >= 2
  ) {
    return
  }
  
  card.isFlipped = true
  flippedCards.value.push(card)
  
  if (flippedCards.value.length === 2) {
    moves.value++
    checkMatch()
  }
}

// 檢查配對
function checkMatch() {
  const card1 = flippedCards.value[0]
  const card2 = flippedCards.value[1]
  
  if (!card1 || !card2) return
  
  if (card1.suit === card2.suit && card1.rank === card2.rank) {
    // 配對成功
    card1.isMatched = true
    card2.isMatched = true
    matchedPairs.value++
    
    // 計分：配對成功 + 剩餘時間獎勵
    const timeBonus = Math.floor(timeLeft.value / 10)
    const moveBonus = Math.max(0, 10 - Math.floor(moves.value / config.value.pairs))
    const pairScore = config.value.points + timeBonus + moveBonus
    score.value += pairScore
    emit('scoreUpdate', score.value)
    
    flippedCards.value = []
    
    // 檢查是否完成
    if (matchedPairs.value === config.value.pairs) {
      setTimeout(endGame, 500)
    }
  } else {
    // 配對失敗，延遲翻回
    setTimeout(() => {
      card1.isFlipped = false
      card2.isFlipped = false
      flippedCards.value = []
    }, 800)
  }
}

// 結束遊戲
function endGame() {
  gameState.value = 'finished'
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  
  const timeSpent = config.value.timeLimit - timeLeft.value
  const accuracy = matchedPairs.value / moves.value || 0
  const completed = matchedPairs.value === config.value.pairs
  
  // 完成獎勵
  if (completed) {
    const completionBonus = Math.floor(timeLeft.value * 2)
    score.value += completionBonus
    emit('scoreUpdate', score.value)
  }
  
  const result: SimpleGameResult = {
    score: score.value,
    maxScore: config.value.pairs * (config.value.points + 20),
    accuracy,
    timeSpent,
    details: {
      pairs: config.value.pairs,
      matchedPairs: matchedPairs.value,
      moves: moves.value,
      completed,
      timeLeft: timeLeft.value,
    },
  }
  
  emit('complete', result)
}

// 格式化時間
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 清理
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (peekTimer) clearInterval(peekTimer)
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (gameState.value === 'ready') {
    generateCards()
  }
})

onMounted(() => {
  generateCards()
})
</script>

<template>
  <div class="poker-memory">
    <!-- 準備畫面 -->
    <div v-if="gameState === 'ready'" class="ready-screen">
      <div class="game-icon">🃏</div>
      <h2>撲克記憶</h2>
      <p class="description">
        找出相同的撲克牌配對，訓練視覺空間記憶！
      </p>
      <div class="rules">
        <h3>遊戲規則</h3>
        <ul>
          <li>開始會短暫顯示所有牌面</li>
          <li>記住位置後找出配對</li>
          <li>共 {{ config.pairs }} 對牌</li>
          <li>時間限制 {{ formatTime(config.timeLimit) }}</li>
        </ul>
      </div>
      <button class="start-btn" @click="startGame">
        開始遊戲
      </button>
    </div>

    <!-- 偷看階段 -->
    <div v-else-if="gameState === 'peek'" class="peek-screen">
      <div class="peek-message">
        <div class="peek-icon">👀</div>
        <div class="peek-text">記住這些牌的位置！</div>
        <div class="peek-countdown">{{ peekCountdown }}</div>
      </div>
      
      <div 
        class="card-grid"
        :style="{ gridTemplateColumns: `repeat(${config.gridCols}, 1fr)` }"
      >
        <div
          v-for="card in cards"
          :key="card.id"
          class="card flipped"
        >
          <div class="card-inner">
            <div class="card-back">🂠</div>
            <div class="card-front" :style="{ color: SUIT_COLORS[card.suit] }">
              <span class="card-rank">{{ card.rank }}</span>
              <span class="card-suit">{{ card.suit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 遊戲進行中 -->
    <template v-else-if="gameState === 'playing'">
      <!-- 狀態列 -->
      <div class="status-bar">
        <div class="stat">
          <span class="label">時間</span>
          <span class="value" :class="{ warning: timeLeft <= 10 }">
            {{ formatTime(timeLeft) }}
          </span>
        </div>
        <div class="stat">
          <span class="label">配對</span>
          <span class="value">{{ matchedPairs }} / {{ config.pairs }}</span>
        </div>
        <div class="stat">
          <span class="label">步數</span>
          <span class="value">{{ moves }}</span>
        </div>
        <div class="stat">
          <span class="label">分數</span>
          <span class="value">{{ score }}</span>
        </div>
      </div>

      <!-- 進度條 -->
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>

      <!-- 卡片區域 -->
      <div 
        class="card-grid"
        :style="{ gridTemplateColumns: `repeat(${config.gridCols}, 1fr)` }"
      >
        <div
          v-for="card in cards"
          :key="card.id"
          class="card"
          :class="{ 
            flipped: card.isFlipped, 
            matched: card.isMatched 
          }"
          @click="flipCard(card)"
        >
          <div class="card-inner">
            <div class="card-back">🂠</div>
            <div class="card-front" :style="{ color: SUIT_COLORS[card.suit] }">
              <span class="card-rank">{{ card.rank }}</span>
              <span class="card-suit">{{ card.suit }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 結束畫面 -->
    <div v-else class="finished-screen">
      <div class="result-icon">
        {{ matchedPairs === config.pairs ? '🎊' : '⏰' }}
      </div>
      <h2>{{ matchedPairs === config.pairs ? '恭喜完成！' : '時間到！' }}</h2>
      <div class="final-score">{{ score }} 分</div>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">配對成功</span>
          <span class="stat-value">{{ matchedPairs }} / {{ config.pairs }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">翻牌次數</span>
          <span class="stat-value">{{ moves }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">用時</span>
          <span class="stat-value">{{ formatTime(config.timeLimit - timeLeft) }}</span>
        </div>
        <div class="stat-item" v-if="matchedPairs === config.pairs">
          <span class="stat-label">效率</span>
          <span class="stat-value">
            {{ Math.round((matchedPairs / moves) * 100) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.poker-memory {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  min-height: 400px;
}

/* 準備畫面 */
.ready-screen {
  text-align: center;
  max-width: 400px;
}

.game-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.ready-screen h2 {
  font-size: 1.75rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.rules {
  background: var(--color-bg-soft);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.rules h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.rules ul {
  list-style: disc;
  padding-left: 1.5rem;
  color: var(--color-text-secondary);
}

.rules li {
  margin: 0.25rem 0;
}

.start-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  padding: 1rem 3rem;
  font-size: 1.25rem;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* 偷看階段 */
.peek-screen {
  text-align: center;
  width: 100%;
}

.peek-message {
  margin-bottom: 1.5rem;
}

.peek-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.peek-text {
  font-size: 1.25rem;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.peek-countdown {
  font-size: 3rem;
  font-weight: bold;
  color: #f59e0b;
  animation: pulse-countdown 1s infinite;
}

@keyframes pulse-countdown {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 狀態列 */
.status-bar {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat .value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text);
}

.stat .value.warning {
  color: #ef4444;
  animation: pulse 1s infinite;
}

.progress-bar {
  width: 100%;
  max-width: 500px;
  height: 8px;
  background: var(--color-bg-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  transition: width 0.3s ease;
}

/* 卡片網格 */
.card-grid {
  display: grid;
  gap: 0.5rem;
  width: 100%;
  max-width: 500px;
  perspective: 1000px;
}

.card {
  aspect-ratio: 2.5/3.5;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.4s;
}

.card.flipped {
  transform: rotateY(180deg);
}

.card.matched {
  opacity: 0.6;
  cursor: default;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.card-back {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  font-size: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.card-front {
  background: var(--color-surface);
  transform: rotateY(180deg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
}

.card-rank {
  font-size: 1.5rem;
}

.card-suit {
  font-size: 1.75rem;
}

/* 結束畫面 */
.finished-screen {
  text-align: center;
}

.result-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.finished-screen h2 {
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.final-score {
  font-size: 3rem;
  font-weight: bold;
  color: #f59e0b;
  margin-bottom: 1.5rem;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-bg-soft);
  padding: 1.5rem;
  border-radius: 12px;
  min-width: 250px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: bold;
}

/* 響應式調整 */
@media (max-width: 480px) {
  .card-rank {
    font-size: 1.25rem;
  }
  
  .card-suit {
    font-size: 1.5rem;
  }
  
  .card-back {
    font-size: 1.5rem;
  }
}
</style>
