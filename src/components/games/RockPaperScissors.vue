<script setup lang="ts">
/**
 * 猜拳遊戲 (RockPaperScissors) - 反應與認知訓練
 * 訓練：反應速度、認知彈性、決策能力
 * 
 * 遊戲模式：
 * - 正常模式：選擇能贏過電腦的手勢
 * - 反向模式：選擇會輸給電腦的手勢
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
    rounds: 10,
    timePerRound: 5,
    reverseChance: 0,
    points: 10,
  },
  medium: {
    rounds: 15,
    timePerRound: 4,
    reverseChance: 0.3,
    points: 15,
  },
  hard: {
    rounds: 20,
    timePerRound: 3,
    reverseChance: 0.5,
    points: 20,
  },
}

type Gesture = 'rock' | 'paper' | 'scissors'

interface Round {
  computerGesture: Gesture
  playerGesture: Gesture | null
  isReverse: boolean
  result: 'win' | 'lose' | 'tie' | 'timeout' | null
  responseTime: number
}

// 手勢資訊
const GESTURES: Record<Gesture, { emoji: string; name: string; beats: Gesture }> = {
  rock: { emoji: '✊', name: '石頭', beats: 'scissors' },
  paper: { emoji: '✋', name: '布', beats: 'rock' },
  scissors: { emoji: '✌️', name: '剪刀', beats: 'paper' },
}

// 遊戲狀態
const config = computed(() => GAME_CONFIG[props.difficulty])
const gameState = ref<'ready' | 'countdown' | 'playing' | 'result' | 'finished'>('ready')
const currentRound = ref(0)
const score = ref(0)
const rounds = ref<Round[]>([])
const timeLeft = ref(0)
const countdown = ref(3)
const computerGesture = ref<Gesture>('rock')
const playerGesture = ref<Gesture | null>(null)
const isReverseMode = ref(false)
const currentResult = ref<'win' | 'lose' | 'tie' | 'timeout' | null>(null)
const roundStartTime = ref(0)

let timer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 統計
const wins = computed(() => rounds.value.filter(r => r.result === 'win').length)
const losses = computed(() => rounds.value.filter(r => r.result === 'lose' || r.result === 'timeout').length)
const ties = computed(() => rounds.value.filter(r => r.result === 'tie').length)

// 進度
const progress = computed(() => 
  (currentRound.value / config.value.rounds) * 100
)

// 取得隨機手勢
function getRandomGesture(): Gesture {
  const gestures: Gesture[] = ['rock', 'paper', 'scissors']
  const index = Math.floor(Math.random() * gestures.length)
  return gestures[index] ?? 'rock'
}

// 判斷結果
function getResult(player: Gesture, computer: Gesture, isReverse: boolean): 'win' | 'lose' | 'tie' {
  if (player === computer) return 'tie'
  
  const normalWin = GESTURES[player].beats === computer
  
  // 反向模式：需要輸才算贏
  if (isReverse) {
    return normalWin ? 'lose' : 'win'
  }
  
  return normalWin ? 'win' : 'lose'
}

// 開始遊戲
function startGame() {
  currentRound.value = 0
  score.value = 0
  rounds.value = []
  
  startCountdown()
}

// 倒數開始
function startCountdown() {
  gameState.value = 'countdown'
  countdown.value = 3
  
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      startRound()
    }
  }, 1000)
}

// 開始新回合
function startRound() {
  currentRound.value++
  computerGesture.value = getRandomGesture()
  playerGesture.value = null
  currentResult.value = null
  timeLeft.value = config.value.timePerRound
  roundStartTime.value = Date.now()
  
  // 決定是否為反向模式
  isReverseMode.value = Math.random() < config.value.reverseChance
  
  gameState.value = 'playing'
  
  timer = setInterval(() => {
    timeLeft.value -= 0.1
    if (timeLeft.value <= 0) {
      handleTimeout()
    }
  }, 100)
}

// 選擇手勢
function selectGesture(gesture: Gesture) {
  if (gameState.value !== 'playing') return
  
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  
  const responseTime = Date.now() - roundStartTime.value
  playerGesture.value = gesture
  currentResult.value = getResult(gesture, computerGesture.value, isReverseMode.value)
  
  // 記錄回合
  rounds.value.push({
    computerGesture: computerGesture.value,
    playerGesture: gesture,
    isReverse: isReverseMode.value,
    result: currentResult.value,
    responseTime,
  })
  
  // 計分
  if (currentResult.value === 'win') {
    const timeBonus = Math.floor((config.value.timePerRound * 1000 - responseTime) / 200)
    const roundScore = config.value.points + Math.max(0, timeBonus)
    score.value += roundScore
    emit('scoreUpdate', score.value)
  } else if (currentResult.value === 'tie') {
    // 平手得部分分數
    score.value += Math.floor(config.value.points / 2)
    emit('scoreUpdate', score.value)
  }
  
  showResult()
}

// 超時處理
function handleTimeout() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  
  currentResult.value = 'timeout'
  
  rounds.value.push({
    computerGesture: computerGesture.value,
    playerGesture: null,
    isReverse: isReverseMode.value,
    result: 'timeout',
    responseTime: config.value.timePerRound * 1000,
  })
  
  showResult()
}

// 顯示結果
function showResult() {
  gameState.value = 'result'
  
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
  
  const validRounds = rounds.value.filter(r => r.result !== 'timeout')
  const avgResponseTime = validRounds.length > 0
    ? validRounds.reduce((sum, r) => sum + r.responseTime, 0) / validRounds.length
    : 0
  
  const result: SimpleGameResult = {
    score: score.value,
    maxScore: config.value.rounds * (config.value.points + 15),
    accuracy: wins.value / config.value.rounds,
    timeSpent: Math.round(avgResponseTime / 1000 * 100) / 100,
    details: {
      rounds: config.value.rounds,
      wins: wins.value,
      losses: losses.value,
      ties: ties.value,
      avgResponseTime: Math.round(avgResponseTime),
      reverseRounds: rounds.value.filter(r => r.isReverse).length,
    },
  }
  
  emit('complete', result)
}

// 取得結果文字
function getResultText(): string {
  switch (currentResult.value) {
    case 'win': return isReverseMode.value ? '正確！成功輸了！' : '你贏了！'
    case 'lose': return isReverseMode.value ? '錯誤！你贏了！' : '你輸了！'
    case 'tie': return '平手！'
    case 'timeout': return '時間到！'
    default: return ''
  }
}

// 取得結果顏色
function getResultColor(): string {
  switch (currentResult.value) {
    case 'win': return '#22c55e'
    case 'lose': 
    case 'timeout': return '#ef4444'
    case 'tie': return '#f59e0b'
    default: return ''
  }
}

// 清理
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="rock-paper-scissors">
    <!-- 準備畫面 -->
    <div v-if="gameState === 'ready'" class="ready-screen">
      <div class="game-icon">
        <span>✊</span><span>✋</span><span>✌️</span>
      </div>
      <h2>猜拳遊戲</h2>
      <p class="description">
        快速反應選擇正確的手勢，訓練認知彈性！
      </p>
      <div class="rules">
        <h3>遊戲規則</h3>
        <ul>
          <li>電腦出拳後快速選擇你的手勢</li>
          <li>正常模式：選擇能<strong>贏過</strong>電腦的手勢</li>
          <li v-if="config.reverseChance > 0">
            反向模式：選擇會<strong>輸給</strong>電腦的手勢
          </li>
          <li>共 {{ config.rounds }} 回合</li>
          <li>每回合 {{ config.timePerRound }} 秒</li>
        </ul>
      </div>
      <button class="start-btn" @click="startGame">
        開始遊戲
      </button>
    </div>

    <!-- 倒數畫面 -->
    <div v-else-if="gameState === 'countdown'" class="countdown-screen">
      <div class="countdown-number">{{ countdown }}</div>
      <div class="countdown-text">準備！</div>
    </div>

    <!-- 遊戲進行中 / 結果顯示 -->
    <template v-else-if="gameState === 'playing' || gameState === 'result'">
      <!-- 狀態列 -->
      <div class="status-bar">
        <div class="stat">
          <span class="label">回合</span>
          <span class="value">{{ currentRound }} / {{ config.rounds }}</span>
        </div>
        <div class="stat">
          <span class="label">勝</span>
          <span class="value win">{{ wins }}</span>
        </div>
        <div class="stat">
          <span class="label">負</span>
          <span class="value lose">{{ losses }}</span>
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

      <!-- 模式提示 -->
      <div class="mode-indicator" :class="{ reverse: isReverseMode }">
        {{ isReverseMode ? '🔄 反向模式：選擇會輸的！' : '✓ 正常模式：選擇能贏的！' }}
      </div>

      <!-- 遊戲區域 -->
      <div class="game-area">
        <!-- 電腦手勢 -->
        <div class="computer-section">
          <div class="label">電腦出：</div>
          <div class="gesture-display computer">
            {{ GESTURES[computerGesture].emoji }}
          </div>
          <div class="gesture-name">{{ GESTURES[computerGesture].name }}</div>
        </div>

        <!-- VS 分隔 -->
        <div class="vs">VS</div>

        <!-- 玩家區域 -->
        <div class="player-section">
          <div class="label">你的選擇：</div>
          
          <!-- 顯示結果 -->
          <template v-if="gameState === 'result'">
            <div 
              class="gesture-display player"
              :style="{ borderColor: getResultColor() }"
            >
              {{ playerGesture ? GESTURES[playerGesture].emoji : '⏰' }}
            </div>
            <div class="result-text" :style="{ color: getResultColor() }">
              {{ getResultText() }}
            </div>
          </template>
          
          <!-- 選擇按鈕 -->
          <template v-else>
            <div class="gesture-buttons">
              <button
                v-for="(info, gesture) in GESTURES"
                :key="gesture"
                class="gesture-btn"
                @click="selectGesture(gesture as Gesture)"
              >
                <span class="emoji">{{ info.emoji }}</span>
                <span class="name">{{ info.name }}</span>
              </button>
            </div>
            
            <!-- 計時條 -->
            <div class="timer-bar">
              <div 
                class="timer-fill"
                :style="{ width: `${(timeLeft / config.timePerRound) * 100}%` }"
                :class="{ warning: timeLeft <= 1 }"
              ></div>
            </div>
            <div class="timer-text">{{ timeLeft.toFixed(1) }}s</div>
          </template>
        </div>
      </div>
    </template>

    <!-- 結束畫面 -->
    <div v-else class="finished-screen">
      <div class="result-icon">
        {{ wins >= config.rounds * 0.7 ? '🏆' : wins >= config.rounds * 0.5 ? '👍' : '💪' }}
      </div>
      <h2>遊戲結束</h2>
      <div class="final-score">{{ score }} 分</div>
      <div class="stats">
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-label">勝利</span>
            <span class="stat-value win">{{ wins }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">失敗</span>
            <span class="stat-value lose">{{ losses }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平手</span>
            <span class="stat-value tie">{{ ties }}</span>
          </div>
        </div>
        <div class="stat-item full">
          <span class="stat-label">勝率</span>
          <span class="stat-value">{{ Math.round((wins / config.rounds) * 100) }}%</span>
        </div>
        <div class="stat-item full" v-if="rounds.some(r => r.isReverse)">
          <span class="stat-label">反向模式回合</span>
          <span class="stat-value">{{ rounds.filter(r => r.isReverse).length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rock-paper-scissors {
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
  font-size: 3rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
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
  background: linear-gradient(135deg, #10b981, #059669);
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
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* 倒數畫面 */
.countdown-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.countdown-number {
  font-size: 6rem;
  font-weight: bold;
  color: #10b981;
  animation: countdown-pulse 1s infinite;
}

@keyframes countdown-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.countdown-text {
  font-size: 1.5rem;
  color: var(--color-text);
}

/* 狀態列 */
.status-bar {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 450px;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.stat .value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-heading);
}

.stat .value.win {
  color: #22c55e;
}

.stat .value.lose {
  color: #ef4444;
}

.progress-bar {
  width: 100%;
  max-width: 450px;
  height: 8px;
  background: var(--color-background-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.3s ease;
}

/* 模式提示 */
.mode-indicator {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: bold;
  margin-bottom: 1.5rem;
  background: #d1fae5;
  color: #059669;
}

.mode-indicator.reverse {
  background: #fee2e2;
  color: #dc2626;
  animation: shake-gentle 0.5s ease-in-out;
}

@keyframes shake-gentle {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 遊戲區域 */
.game-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  max-width: 450px;
}

.computer-section,
.player-section {
  text-align: center;
  flex: 1;
}

.computer-section .label,
.player-section .label {
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin-bottom: 0.5rem;
}

.gesture-display {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  margin: 0 auto 0.5rem;
}

.gesture-display.computer {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.gesture-display.player {
  background: white;
  border: 4px solid #22c55e;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gesture-name {
  font-weight: bold;
  color: var(--color-heading);
}

.vs {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text-light);
}

/* 手勢按鈕 */
.gesture-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.gesture-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.gesture-btn:hover {
  border-color: #10b981;
  background: #ecfdf5;
  transform: translateY(-2px);
}

.gesture-btn:active {
  transform: scale(0.95);
}

.gesture-btn .emoji {
  font-size: 2rem;
}

.gesture-btn .name {
  font-size: 0.75rem;
  color: var(--color-text);
  margin-top: 0.25rem;
}

/* 計時條 */
.timer-bar {
  height: 8px;
  background: var(--color-background-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.timer-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.1s linear;
}

.timer-fill.warning {
  background: #ef4444;
}

.timer-text {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.result-text {
  font-size: 1.25rem;
  font-weight: bold;
  margin-top: 0.5rem;
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
  color: #10b981;
  margin-bottom: 1.5rem;
}

.stats {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 12px;
  min-width: 280px;
}

.stat-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.stat-item {
  text-align: center;
}

.stat-item.full {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-light);
  display: block;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.stat-item.full .stat-value {
  font-size: 1rem;
}

.stat-value.win {
  color: #22c55e;
}

.stat-value.lose {
  color: #ef4444;
}

.stat-value.tie {
  color: #f59e0b;
}

/* 響應式 */
@media (max-width: 480px) {
  .game-area {
    flex-direction: column;
    gap: 1rem;
  }
  
  .vs {
    transform: rotate(90deg);
  }
  
  .gesture-display {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
  }
}
</style>
