<script setup lang="ts">
/**
 * 瞬間記憶 (InstantMemory) - 數字序列記憶遊戲
 * 訓練：短期記憶、注意力、工作記憶
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
    startLength: 3,
    maxLength: 6,
    showTime: 2000,
    rounds: 8,
    points: 15,
  },
  medium: {
    startLength: 4,
    maxLength: 8,
    showTime: 1500,
    rounds: 10,
    points: 20,
  },
  hard: {
    startLength: 5,
    maxLength: 10,
    showTime: 1000,
    rounds: 12,
    points: 25,
  },
}

// 遊戲狀態
const config = computed(() => GAME_CONFIG[props.difficulty])
const gameState = ref<'ready' | 'showing' | 'input' | 'feedback' | 'finished'>('ready')
const currentRound = ref(0)
const currentLength = ref(0)
const score = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)
const currentSequence = ref<number[]>([])
const userInput = ref<number[]>([])
const showingIndex = ref(-1)
const isCorrect = ref(false)
const maxReached = ref(0)
const startTime = ref(0)

let showTimer: ReturnType<typeof setTimeout> | null = null

// 進度
const progress = computed(() => 
  (currentRound.value / config.value.rounds) * 100
)

// 產生數字序列
function generateSequence(length: number): number[] {
  const sequence: number[] = []
  for (let i = 0; i < length; i++) {
    sequence.push(Math.floor(Math.random() * 10))
  }
  return sequence
}

// 開始遊戲
function startGame() {
  gameState.value = 'showing'
  currentRound.value = 0
  currentLength.value = config.value.startLength
  score.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  maxReached.value = 0
  startTime.value = Date.now()
  
  startRound()
}

// 開始新回合
function startRound() {
  currentRound.value++
  currentSequence.value = generateSequence(currentLength.value)
  userInput.value = []
  showingIndex.value = -1
  gameState.value = 'showing'
  
  // 依序顯示數字
  showSequence()
}

// 顯示序列
function showSequence() {
  let index = 0
  const showNext = () => {
    if (index < currentSequence.value.length) {
      showingIndex.value = index
      index++
      showTimer = setTimeout(showNext, config.value.showTime / currentSequence.value.length + 200)
    } else {
      // 顯示完畢，進入輸入階段
      setTimeout(() => {
        showingIndex.value = -1
        gameState.value = 'input'
      }, 300)
    }
  }
  
  setTimeout(showNext, 500) // 延遲開始顯示
}

// 輸入數字
function inputNumber(num: number) {
  if (gameState.value !== 'input') return
  
  userInput.value.push(num)
  
  // 檢查是否輸入完成
  if (userInput.value.length === currentSequence.value.length) {
    checkAnswer()
  }
}

// 刪除最後輸入
function deleteLastInput() {
  if (userInput.value.length > 0) {
    userInput.value.pop()
  }
}

// 檢查答案
function checkAnswer() {
  gameState.value = 'feedback'
  
  const correct = userInput.value.every(
    (num, index) => num === currentSequence.value[index]
  )
  
  isCorrect.value = correct
  
  if (correct) {
    correctCount.value++
    // 基礎分數 + 長度加成
    const lengthBonus = (currentLength.value - config.value.startLength) * 5
    const roundScore = config.value.points + lengthBonus
    score.value += roundScore
    emit('scoreUpdate', score.value)
    
    // 更新最大長度記錄
    if (currentLength.value > maxReached.value) {
      maxReached.value = currentLength.value
    }
    
    // 增加長度（不超過最大值）
    if (currentLength.value < config.value.maxLength) {
      currentLength.value++
    }
  } else {
    wrongCount.value++
    // 錯誤時減少長度（不低於起始值）
    if (currentLength.value > config.value.startLength) {
      currentLength.value--
    }
  }
  
  // 延遲後進入下一回合或結束
  setTimeout(() => {
    if (currentRound.value < config.value.rounds) {
      startRound()
    } else {
      endGame()
    }
  }, 1500)
}

// 結束遊戲
function endGame() {
  gameState.value = 'finished'
  
  const accuracy = correctCount.value / (correctCount.value + wrongCount.value) || 0
  const timeSpent = Math.round((Date.now() - startTime.value) / 1000)
  
  const result: SimpleGameResult = {
    score: score.value,
    maxScore: config.value.rounds * (config.value.points + (config.value.maxLength - config.value.startLength) * 5),
    accuracy,
    timeSpent,
    details: {
      rounds: config.value.rounds,
      correct: correctCount.value,
      wrong: wrongCount.value,
      maxSequenceLength: maxReached.value,
    },
  }
  
  emit('complete', result)
}

// 清理
onUnmounted(() => {
  if (showTimer) clearTimeout(showTimer)
})
</script>

<template>
  <div class="instant-memory">
    <!-- 準備畫面 -->
    <div v-if="gameState === 'ready'" class="ready-screen">
      <div class="game-icon">🧠</div>
      <h2>瞬間記憶</h2>
      <p class="description">
        記住閃現的數字序列，訓練短期記憶力！
      </p>
      <div class="rules">
        <h3>遊戲規則</h3>
        <ul>
          <li>觀察螢幕上閃現的數字</li>
          <li>按順序輸入記住的數字</li>
          <li>答對會增加數字長度</li>
          <li>共 {{ config.rounds }} 回合</li>
        </ul>
      </div>
      <button class="start-btn" @click="startGame">
        開始遊戲
      </button>
    </div>

    <!-- 遊戲進行中 -->
    <template v-else-if="gameState !== 'finished'">
      <!-- 狀態列 -->
      <div class="status-bar">
        <div class="stat">
          <span class="label">回合</span>
          <span class="value">{{ currentRound }} / {{ config.rounds }}</span>
        </div>
        <div class="stat">
          <span class="label">長度</span>
          <span class="value highlight">{{ currentLength }}</span>
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

      <!-- 顯示區域 -->
      <div class="display-area">
        <!-- 顯示數字階段 -->
        <div v-if="gameState === 'showing'" class="showing-phase">
          <div class="instruction">記住這些數字</div>
          <div class="sequence-display">
            <div
              v-for="(num, index) in currentSequence"
              :key="index"
              class="number-cell"
              :class="{ active: showingIndex === index, past: showingIndex > index }"
            >
              {{ showingIndex >= index ? num : '' }}
            </div>
          </div>
          <div class="dots">
            <span
              v-for="(_, index) in currentSequence"
              :key="index"
              class="dot"
              :class="{ active: showingIndex === index, done: showingIndex > index }"
            ></span>
          </div>
        </div>

        <!-- 輸入階段 -->
        <div v-else-if="gameState === 'input'" class="input-phase">
          <div class="instruction">請輸入數字</div>
          <div class="input-display">
            <div
              v-for="(_, index) in currentSequence"
              :key="index"
              class="input-cell"
              :class="{ filled: userInput[index] !== undefined }"
            >
              {{ userInput[index] ?? '' }}
            </div>
          </div>
          
          <!-- 數字鍵盤 -->
          <div class="numpad">
            <button
              v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
              :key="num"
              class="num-btn"
              @click="inputNumber(num)"
            >
              {{ num }}
            </button>
            <button class="num-btn delete" @click="deleteLastInput">
              ⌫
            </button>
          </div>
        </div>

        <!-- 回饋階段 -->
        <div v-else-if="gameState === 'feedback'" class="feedback-phase">
          <div class="feedback-icon">{{ isCorrect ? '✓' : '✗' }}</div>
          <div class="feedback-text" :class="{ correct: isCorrect, wrong: !isCorrect }">
            {{ isCorrect ? '正確！' : '錯誤' }}
          </div>
          <div class="answer-comparison">
            <div class="comparison-row">
              <span class="comparison-label">正確答案：</span>
              <span class="comparison-value">{{ currentSequence.join(' ') }}</span>
            </div>
            <div class="comparison-row">
              <span class="comparison-label">您的答案：</span>
              <span class="comparison-value" :class="{ wrong: !isCorrect }">
                {{ userInput.join(' ') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 統計 -->
      <div class="score-display">
        <span class="correct-count">✓ {{ correctCount }}</span>
        <span class="wrong-count">✗ {{ wrongCount }}</span>
      </div>
    </template>

    <!-- 結束畫面 -->
    <div v-else class="finished-screen">
      <div class="result-icon">{{ maxReached >= config.maxLength ? '🏆' : '🎯' }}</div>
      <h2>遊戲結束</h2>
      <div class="final-score">{{ score }} 分</div>
      <div class="stats">
        <div class="stat-item highlight">
          <span class="stat-label">最長記憶</span>
          <span class="stat-value">{{ maxReached }} 位數</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">正確率</span>
          <span class="stat-value">{{ Math.round((correctCount / (correctCount + wrongCount || 1)) * 100) }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">答對</span>
          <span class="stat-value correct">{{ correctCount }} 回合</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">答錯</span>
          <span class="stat-value wrong">{{ wrongCount }} 回合</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instant-memory {
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
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* 狀態列 */
.status-bar {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 400px;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.stat .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
}

.stat .value.highlight {
  color: #8b5cf6;
}

.progress-bar {
  width: 100%;
  max-width: 400px;
  height: 8px;
  background: var(--color-bg-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  transition: width 0.3s ease;
}

/* 顯示區域 */
.display-area {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.instruction {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

/* 顯示階段 */
.sequence-display {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.number-cell {
  width: 50px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  background: var(--color-bg-soft);
  border-radius: 8px;
  transition: all 0.3s;
}

.number-cell.active {
  background: #8b5cf6;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.number-cell.past {
  background: #e9d5ff;
  color: #7c3aed;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 0.3s;
}

.dot.active {
  background: #8b5cf6;
  transform: scale(1.3);
}

.dot.done {
  background: #a855f7;
}

/* 輸入階段 */
.input-display {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.input-cell {
  width: 50px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  background: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.input-cell.filled {
  border-style: solid;
  border-color: #8b5cf6;
  background: #faf5ff;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  max-width: 300px;
  margin: 0 auto;
}

.num-btn {
  padding: 1rem;
  font-size: 1.5rem;
  font-weight: bold;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.num-btn:hover {
  border-color: #8b5cf6;
  background: #faf5ff;
}

.num-btn:active {
  transform: scale(0.95);
}

.num-btn.delete {
  background: #fef2f2;
  border-color: #fecaca;
  color: #ef4444;
}

/* 回饋階段 */
.feedback-phase {
  text-align: center;
}

.feedback-icon {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.feedback-text {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.feedback-text.correct {
  color: #22c55e;
}

.feedback-text.wrong {
  color: #ef4444;
}

.answer-comparison {
  background: var(--color-bg-soft);
  padding: 1rem;
  border-radius: 12px;
}

.comparison-row {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
}

.comparison-label {
  color: var(--color-text-muted);
}

.comparison-value {
  font-weight: bold;
  font-family: monospace;
  font-size: 1.25rem;
}

.comparison-value.wrong {
  color: #ef4444;
}

/* 分數顯示 */
.score-display {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  font-size: 1.25rem;
  font-weight: bold;
}

.correct-count {
  color: #22c55e;
}

.wrong-count {
  color: #ef4444;
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
  color: #8b5cf6;
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

.stat-item.highlight {
  background: #faf5ff;
  margin: -0.5rem -0.5rem 0.5rem -0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: bold;
}

.stat-value.correct {
  color: #22c55e;
}

.stat-value.wrong {
  color: #ef4444;
}
</style>
