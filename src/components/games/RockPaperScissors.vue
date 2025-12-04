<script setup lang="ts">
/**
 * 猜拳遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useRoundTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import {
  createRound,
  processChoice,
  processTimeout,
  getWinningGesture,
  calculateRoundScore,
  calculateGrade,
  summarizeResult,
  getResultText,
  getResultColor,
  DIFFICULTY_CONFIGS,
  GESTURES,
  GESTURE_LIST,
  type Gesture,
  type RoundData,
  type RockPaperScissorsConfig,
} from '@/games/logic/rockPaperScissors'

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
const config = computed<RockPaperScissorsConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
  progress,
  feedback,
  showFeedback,
  isPlaying,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  setFeedback,
  clearFeedback,
  resetGame,
  addScore,
} = useGameState({
  totalRounds: config.value.rounds,
})

function startGame() {
  startGameState()
  emit('game:start')
}

function finishGame() {
  finishGameState()
}

// ===== 回合計時器 =====
const {
  roundTime,
  startRound,
  stopRound,
} = useRoundTimer({
  timePerRound: config.value.timePerRound,
  onRoundTimeUp: () => handleRoundTimeout(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const currentRoundBase = ref<ReturnType<typeof createRound> | null>(null)
const currentRoundResult = ref<RoundData | null>(null)
const allRounds = ref<RoundData[]>([])
const showResult = ref(false)
let roundStartTime = 0

// ===== 計算屬性 =====
const computerGesture = computed(() => currentRoundBase.value?.computerGesture)
const isReverse = computed(() => currentRoundBase.value?.isReverse || false)

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
const gameInstructions = computed(() => [
  '電腦出拳後快速選擇你的手勢',
  config.value.reverseChance > 0 ? '注意：可能會出現反向模式' : '選擇能贏過電腦的手勢',
  '反向模式：選擇會輸給電腦的手勢',
  '反應越快，分數越高',
])

// ===== 遊戲方法 =====
function handleStart() {
  allRounds.value = []
  
  startGame()
  startNewRound()
}

function startNewRound() {
  currentRoundBase.value = createRound(config.value.reverseChance)
  currentRoundResult.value = null
  showResult.value = false
  roundStartTime = Date.now()
  startRound()
}

function handleSelectGesture(gesture: Gesture) {
  if (!isPlaying.value || showResult.value || !currentRoundBase.value) return
  
  stopRound()
  
  const responseTime = Date.now() - roundStartTime
  const roundData = processChoice(currentRoundBase.value, gesture, responseTime)
  currentRoundResult.value = roundData
  allRounds.value.push(roundData)
  showResult.value = true
  
  // 計算分數
  const earnedScore = calculateRoundScore(config.value, roundData.result!, responseTime)
  
  if (roundData.result === 'win') {
    playCorrect()
    addScore(earnedScore)
    setFeedback('correct', getResultText(roundData.result!, isReverse.value), earnedScore)
  } else if (roundData.result === 'tie') {
    addScore(earnedScore)
    setFeedback('correct', getResultText(roundData.result!, isReverse.value), earnedScore)
  } else {
    playWrong()
    const correctGesture = getWinningGesture(currentRoundBase.value.computerGesture, isReverse.value)
    setFeedback('wrong', `${getResultText(roundData.result!, isReverse.value)} 應選：${GESTURES[correctGesture].emoji}`)
  }
  
  // 延遲後進入下一回合
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      startNewRound()
    } else {
      handleGameEnd()
    }
  }, 1200)
}

function handleRoundTimeout() {
  if (!currentRoundBase.value) return
  
  const roundData = processTimeout(currentRoundBase.value, config.value.timePerRound * 1000)
  currentRoundResult.value = roundData
  allRounds.value.push(roundData)
  showResult.value = true
  
  playWrong()
  setFeedback('wrong', '時間到！')
  
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      startNewRound()
    } else {
      handleGameEnd()
    }
  }, 1000)
}

function handleGameEnd() {
  stopRound()
  playEnd()
  
  const result = summarizeResult(score.value, allRounds.value, config.value)
  
  finishGame()
  emit('game:end', result)
}

function handleRestart() {
  stopRound()
  resetGame()
  handleStart()
}

function handleQuit() {
  stopRound()
  resetGame()
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽難度變化
watch(() => props.difficulty, () => {
  if (phase.value !== 'ready') {
    stopRound()
    resetGame()
  }
})
</script>

<template>
  <div class="rock-paper-scissors-game w-full max-w-2xl mx-auto p-4">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="猜拳遊戲"
      icon="✊"
      :rules="gameInstructions"
      :difficulty="difficulty === 'medium' ? 'normal' : difficulty"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">
      <!-- 狀態列 -->
      <GameStatusBar
        :time="roundTime"
        :score="score"
        :progress="progress"
        :is-warning="roundTime <= 2"
        show-timer
        show-score
        show-progress
      />

      <!-- 題目資訊 -->
      <div class="round-info text-center mt-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          第 {{ currentRound + 1 }} / {{ totalRounds }} 回合
        </div>
        
        <!-- 模式提示 -->
        <div 
          v-if="isReverse"
          class="mode-hint mt-2 inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium"
        >
          ⚠️ 反向模式：選擇會輸的！
        </div>
        <div 
          v-else
          class="mode-hint mt-2 inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
        >
          正常模式：選擇會贏的！
        </div>
      </div>

      <!-- 電腦出拳 -->
      <div class="computer-gesture mt-8 text-center">
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">電腦出：</div>
        <div class="gesture-display text-8xl">
          {{ computerGesture ? GESTURES[computerGesture].emoji : '❓' }}
        </div>
        <div class="gesture-name text-lg font-medium mt-2">
          {{ computerGesture ? GESTURES[computerGesture].name : '' }}
        </div>
      </div>

      <!-- 結果顯示 -->
      <div 
        v-if="showResult && currentRoundResult"
        class="result-display mt-6 text-center"
      >
        <div class="player-choice text-4xl mb-2">
          你選：{{ currentRoundResult.playerGesture ? GESTURES[currentRoundResult.playerGesture].emoji : '❌' }}
        </div>
        <div 
          class="result-text text-xl font-bold"
          :style="{ color: getResultColor(currentRoundResult.result!) }"
        >
          {{ getResultText(currentRoundResult.result!, isReverse) }}
        </div>
      </div>

      <!-- 選擇按鈕 -->
      <div 
        v-if="!showResult"
        class="gesture-buttons mt-8 flex justify-center gap-4"
      >
        <button
          v-for="gesture in GESTURE_LIST"
          :key="gesture"
          class="gesture-btn w-24 h-24 md:w-28 md:h-28 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white transition-all transform hover:scale-110 active:scale-95"
          @click="handleSelectGesture(gesture)"
        >
          <div class="text-5xl md:text-6xl">{{ GESTURES[gesture].emoji }}</div>
          <div class="text-xs mt-1">{{ GESTURES[gesture].name }}</div>
        </button>
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

    <!-- 結果畫面 -->
    <GameResultScreen
      v-else-if="phase === 'finished' || phase === 'result'"
      :score="score"
      :grade="calculateGrade(allRounds.filter(r => r.result === 'win').length, config.rounds) as 'S' | 'A' | 'B' | 'C' | 'D' | 'F'"
      :custom-stats="[
        { label: '勝利', value: allRounds.filter(r => r.result === 'win').length, icon: '🏆' },
        { label: '失敗', value: allRounds.filter(r => r.result === 'lose' || r.result === 'timeout').length, icon: '💔' },
        { label: '平手', value: allRounds.filter(r => r.result === 'tie').length, icon: '🤝' },
      ]"
      @replay="handleRestart"
      @back="handleQuit"
    />
  </div>
</template>

<style scoped>
.gesture-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gesture-btn:active {
  transform: scale(0.9);
}
</style>
