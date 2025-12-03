<script setup lang="ts">
/**
 * 加減乘除 (MathCalc) - 數學計算遊戲
 * 訓練：邏輯推理、注意力、處理速度
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 簡化的遊戲結果類型
interface SimpleGameResult {
  score: number
  maxScore: number
  accuracy: number
  duration: number
  details?: Record<string, unknown>
}

type GameDifficulty = 'easy' | 'medium' | 'hard'

const props = defineProps<{
  difficulty: GameDifficulty
}>()

const emit = defineEmits<{
  (e: 'complete', result: SimpleGameResult): void
  (e: 'scoreUpdate', score: number): void
}>()

// 遊戲設定
const GAME_CONFIG = {
  easy: {
    timeLimit: 90,
    questionsCount: 10,
    operations: ['+', '-'] as const,
    maxNumber: 20,
    points: 10,
  },
  medium: {
    timeLimit: 90,
    questionsCount: 15,
    operations: ['+', '-', '×'] as const,
    maxNumber: 50,
    points: 15,
  },
  hard: {
    timeLimit: 90,
    questionsCount: 20,
    operations: ['+', '-', '×', '÷'] as const,
    maxNumber: 100,
    points: 20,
  },
}

type Operation = '+' | '-' | '×' | '÷'

interface Question {
  num1: number
  num2: number
  operation: Operation
  answer: number
  options: number[]
}

// 遊戲狀態
const config = computed(() => GAME_CONFIG[props.difficulty])
const gameState = ref<'ready' | 'playing' | 'finished'>('ready')
const timeLeft = ref(0)
const currentQuestionIndex = ref(0)
const score = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)
const questions = ref<Question[]>([])
const selectedAnswer = ref<number | null>(null)
const showFeedback = ref(false)
const isCorrect = ref(false)
const startTime = ref(0)
const responseTimes = ref<number[]>([])

let timer: ReturnType<typeof setInterval> | null = null
let questionTimer: number = 0

// 目前題目
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

// 進度百分比
const progress = computed(() => 
  ((currentQuestionIndex.value) / config.value.questionsCount) * 100
)

// 產生題目
function generateQuestions() {
  const ops = config.value.operations
  const maxNum = config.value.maxNumber
  const count = config.value.questionsCount
  const newQuestions: Question[] = []

  for (let i = 0; i < count; i++) {
    const operation = ops[Math.floor(Math.random() * ops.length)]
    let num1 = 0
    let num2 = 0
    let answer = 0

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * maxNum) + 1
        num2 = Math.floor(Math.random() * maxNum) + 1
        answer = num1 + num2
        break
      case '-':
        num1 = Math.floor(Math.random() * maxNum) + 1
        num2 = Math.floor(Math.random() * num1) + 1 // 確保結果為正
        answer = num1 - num2
        break
      case '×':
        num1 = Math.floor(Math.random() * 12) + 1 // 限制乘法範圍
        num2 = Math.floor(Math.random() * 12) + 1
        answer = num1 * num2
        break
      case '÷':
      default:
        num2 = Math.floor(Math.random() * 12) + 1
        answer = Math.floor(Math.random() * 12) + 1
        num1 = num2 * answer // 確保整除
        break
    }

    // 產生選項（包含正確答案）
    const options = generateOptions(answer)

    newQuestions.push({ num1, num2, operation: operation as Operation, answer, options })
  }

  questions.value = newQuestions
}

// 產生選項
function generateOptions(correctAnswer: number): number[] {
  const options = new Set<number>([correctAnswer])
  
  while (options.size < 4) {
    // 產生干擾選項（接近正確答案）
    const offset = Math.floor(Math.random() * 10) - 5
    const wrong = correctAnswer + offset
    if (wrong !== correctAnswer && wrong > 0) {
      options.add(wrong)
    }
    // 也加入一些隨機數
    if (options.size < 4) {
      options.add(Math.floor(Math.random() * (correctAnswer * 2)) + 1)
    }
  }

  // 打亂順序
  return Array.from(options).sort(() => Math.random() - 0.5)
}

// 開始遊戲
function startGame() {
  gameState.value = 'playing'
  timeLeft.value = config.value.timeLimit
  currentQuestionIndex.value = 0
  score.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  responseTimes.value = []
  startTime.value = Date.now()
  
  generateQuestions()
  questionTimer = Date.now()

  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

// 選擇答案
function selectAnswer(answer: number) {
  if (showFeedback.value || gameState.value !== 'playing') return
  if (!currentQuestion.value) return

  selectedAnswer.value = answer
  const responseTime = Date.now() - questionTimer
  responseTimes.value.push(responseTime)

  isCorrect.value = answer === currentQuestion.value.answer
  showFeedback.value = true

  if (isCorrect.value) {
    correctCount.value++
    // 根據回答速度加分
    const timeBonus = Math.max(0, Math.floor((5000 - responseTime) / 500))
    const questionScore = config.value.points + timeBonus
    score.value += questionScore
    emit('scoreUpdate', score.value)
  } else {
    wrongCount.value++
  }

  // 延遲後進入下一題
  setTimeout(() => {
    showFeedback.value = false
    selectedAnswer.value = null
    
    if (currentQuestionIndex.value < config.value.questionsCount - 1) {
      currentQuestionIndex.value++
      questionTimer = Date.now()
    } else {
      endGame()
    }
  }, 1000)
}

// 結束遊戲
function endGame() {
  gameState.value = 'finished'
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  const avgResponseTime = responseTimes.value.length > 0
    ? responseTimes.value.reduce((a, b) => a + b, 0) / responseTimes.value.length
    : 0

  const accuracy = correctCount.value / (correctCount.value + wrongCount.value) || 0

  const result: SimpleGameResult = {
    score: score.value,
    maxScore: config.value.questionsCount * (config.value.points + 10),
    accuracy,
    duration: config.value.timeLimit - timeLeft.value,
    details: {
      totalQuestions: config.value.questionsCount,
      answered: correctCount.value + wrongCount.value,
      correct: correctCount.value,
      wrong: wrongCount.value,
      avgResponseTime: Math.round(avgResponseTime),
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
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (gameState.value === 'ready') {
    generateQuestions()
  }
})

onMounted(() => {
  generateQuestions()
})
</script>

<template>
  <div class="math-calc">
    <!-- 準備畫面 -->
    <div v-if="gameState === 'ready'" class="ready-screen">
      <div class="game-icon">🧮</div>
      <h2>加減乘除</h2>
      <p class="description">
        快速計算數學題目，訓練邏輯推理和處理速度！
      </p>
      <div class="rules">
        <h3>遊戲規則</h3>
        <ul>
          <li>共 {{ config.questionsCount }} 道數學題</li>
          <li>時間限制 {{ formatTime(config.timeLimit) }}</li>
          <li>運算符號：{{ config.operations.join('、') }}</li>
          <li>答對越快，分數越高</li>
        </ul>
      </div>
      <button class="start-btn" @click="startGame">
        開始遊戲
      </button>
    </div>

    <!-- 遊戲畫面 -->
    <div v-else-if="gameState === 'playing'" class="game-screen">
      <!-- 狀態列 -->
      <div class="status-bar">
        <div class="stat">
          <span class="label">時間</span>
          <span class="value" :class="{ warning: timeLeft <= 10 }">
            {{ formatTime(timeLeft) }}
          </span>
        </div>
        <div class="stat">
          <span class="label">題目</span>
          <span class="value">{{ currentQuestionIndex + 1 }} / {{ config.questionsCount }}</span>
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

      <!-- 題目區 -->
      <div class="question-area" v-if="currentQuestion">
        <div class="question" :class="{ shake: showFeedback && !isCorrect }">
          <span class="number">{{ currentQuestion.num1 }}</span>
          <span class="operation">{{ currentQuestion.operation }}</span>
          <span class="number">{{ currentQuestion.num2 }}</span>
          <span class="equals">=</span>
          <span class="answer-placeholder">?</span>
        </div>

        <!-- 選項 -->
        <div class="options">
          <button
            v-for="option in currentQuestion.options"
            :key="option"
            class="option-btn"
            :class="{
              selected: selectedAnswer === option,
              correct: showFeedback && option === currentQuestion.answer,
              wrong: showFeedback && selectedAnswer === option && !isCorrect,
            }"
            :disabled="showFeedback"
            @click="selectAnswer(option)"
          >
            {{ option }}
          </button>
        </div>

        <!-- 回饋 -->
        <div v-if="showFeedback" class="feedback" :class="{ correct: isCorrect, wrong: !isCorrect }">
          {{ isCorrect ? '✓ 正確！' : `✗ 答案是 ${currentQuestion.answer}` }}
        </div>
      </div>

      <!-- 正確/錯誤計數 -->
      <div class="score-display">
        <span class="correct-count">✓ {{ correctCount }}</span>
        <span class="wrong-count">✗ {{ wrongCount }}</span>
      </div>
    </div>

    <!-- 結束畫面 -->
    <div v-else class="finished-screen">
      <div class="result-icon">{{ correctCount >= config.questionsCount * 0.7 ? '🎉' : '💪' }}</div>
      <h2>遊戲結束</h2>
      <div class="final-score">{{ score }} 分</div>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">正確率</span>
          <span class="stat-value">{{ Math.round((correctCount / (correctCount + wrongCount || 1)) * 100) }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">答對</span>
          <span class="stat-value correct">{{ correctCount }} 題</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">答錯</span>
          <span class="stat-value wrong">{{ wrongCount }} 題</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.math-calc {
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
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.description {
  color: var(--color-text);
  margin-bottom: 1.5rem;
}

.rules {
  background: var(--color-background-soft);
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
  color: var(--color-text);
}

.rules li {
  margin: 0.25rem 0;
}

.start-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
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
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 遊戲畫面 */
.game-screen {
  width: 100%;
  max-width: 500px;
}

.status-bar {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.stat .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-heading);
}

.stat .value.warning {
  color: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-bar {
  height: 8px;
  background: var(--color-background-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

.question-area {
  text-align: center;
}

.question {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--color-background-soft);
  border-radius: 16px;
}

.question.shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.number {
  color: var(--color-heading);
}

.operation {
  color: #3b82f6;
}

.equals {
  color: var(--color-text-light);
}

.answer-placeholder {
  color: #8b5cf6;
  min-width: 60px;
  text-align: center;
}

.options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-btn {
  padding: 1.25rem;
  font-size: 1.5rem;
  font-weight: bold;
  background: white;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.option-btn.selected {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.option-btn.correct {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.option-btn.wrong {
  border-color: #ef4444;
  background: #ef4444;
  color: white;
}

.feedback {
  font-size: 1.25rem;
  font-weight: bold;
  padding: 0.75rem;
  border-radius: 8px;
}

.feedback.correct {
  color: #22c55e;
  background: #f0fdf4;
}

.feedback.wrong {
  color: #ef4444;
  background: #fef2f2;
}

.score-display {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
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
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.final-score {
  font-size: 3rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 1.5rem;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: var(--color-text-light);
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
