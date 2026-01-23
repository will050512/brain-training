<script setup lang="ts">
/**
 * 天平秤重遊戲（重構版）
 * 使用新的遊戲核心架構
 */
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useGameState } from '@/games/core/useGameState'
import { useRoundTimer } from '@/games/core/useGameTimer'
import { useGameAudio } from '@/games/core/useGameAudio'
import { useThrottledEmit } from '@/composables/useThrottledEmit'
import { useResponsive } from '@/composables/useResponsive'
import { adjustSettingsForSubDifficulty } from '@/services/adaptiveDifficultyService'
import type { GameStatusUpdate } from '@/types'
import type { SubDifficulty } from '@/types/game'
import {
  generateRound,
  validateAnswer,
  calculateArmRotation,
  summarizeResult,
  calculateGrade,
  DIFFICULTY_CONFIGS,
  WEIGHT_ITEMS,
  type RoundData,
  type BalanceScaleConfig,
} from '@/games/logic/balanceScale'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameFeedback from './ui/GameFeedback.vue'

import scaleImg from '@/assets/images/balance-scale/scale.svg'
import weight1Img from '@/assets/images/balance-scale/weight-1.svg'
import weight2Img from '@/assets/images/balance-scale/weight-2.svg'
import weight3Img from '@/assets/images/balance-scale/weight-3.svg'
import weight4Img from '@/assets/images/balance-scale/weight-4.svg'
import weight5Img from '@/assets/images/balance-scale/weight-5.svg'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: 'easy' | 'medium' | 'hard'
  subDifficulty?: SubDifficulty
  autoStart?: boolean
}>(), {
  difficulty: 'easy',
  subDifficulty: 2,
  autoStart: false,
})

const emit = defineEmits<{
  'game-start': []
  'game-end': [result: any]
  'score-change': [score: number]
  'state:change': [phase: string]
  'status-update': [status: GameStatusUpdate]
}>()

// 節流 emit 狀態更新
const { throttledEmit, cleanup: cleanupThrottle } = useThrottledEmit(
  (event, data) => emit('status-update', data),
  100
)
const { isSmallLandscape } = useResponsive()

const weightImages: Record<number, string> = {
  1: weight1Img,
  2: weight2Img,
  3: weight3Img,
  4: weight4Img,
  5: weight5Img,
}

function getWeightImage(weight: number): string | null {
  return weightImages[weight] ?? null
}

// ===== 遊戲配置 =====
const baseConfig = computed<BalanceScaleConfig>(() => DIFFICULTY_CONFIGS[props.difficulty])
const config = computed<BalanceScaleConfig>(() => {
  return adjustSettingsForSubDifficulty(
    baseConfig.value,
    props.subDifficulty ?? 2
  )
})

// ===== 遊戲狀態 =====
const {
  phase,
  score,
  currentRound,
  totalRounds,
  correctCount,
  wrongCount,
  progress,
  feedback,
  showFeedback,
  isPlaying,
  startGame: startGameState,
  finishGame: finishGameState,
  nextRound,
  recordAnswer,
  setFeedback,
  clearFeedback,
  resetGame,
  getCurrentReactionTime,
} = useGameState({
  totalRounds: config.value.rounds,
})

function startGame() {
  startGameState()
  emit('game-start')
}

function finishGame() {
  finishGameState()
}

// ===== 回合計時器 =====
const {
  roundTime,
  formattedRoundTime,
  startRound,
  stopRound,
  resetRound,
} = useRoundTimer({
  timePerRound: config.value.timePerRound,
  onRoundTimeUp: () => handleRoundTimeout(),
})

// ===== 音效 =====
const { playCorrect, playWrong, playEnd, preloadDefaultSounds } = useGameAudio()

// ===== 遊戲資料 =====
const currentRoundData = ref<RoundData | null>(null)
const selectedSide = ref<'left' | 'right' | null>(null)
const showResult = ref(false)
const isCorrect = ref(false)
const reactionTimes = ref<number[]>([])
const isAnswering = ref(false)

// ===== 計算屬性 =====
const armRotation = computed(() => {
  if (!currentRoundData.value) return 0
  return calculateArmRotation(
    currentRoundData.value.leftWeight,
    currentRoundData.value.rightWeight,
    config.value.showTilt,
    config.value.tiltStrength,
    config.value.maxTilt
  )
})

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
  '觀察天平兩側的物品',
  '判斷哪一側比較重',
  '點擊你認為較重的那一側',
  '注意物品的數量與重量標示',
]

// ===== 遊戲方法 =====
function handleStart() {
  reactionTimes.value = []
  isAnswering.value = false
  
  startGame()
  generateNextRound()
}

function generateNextRound() {
  currentRoundData.value = generateRound(config.value)
  selectedSide.value = null
  showResult.value = false
  isCorrect.value = false
  startRound()
}

function handleSelectSide(side: 'left' | 'right') {
  if (!isPlaying.value || showResult.value || isAnswering.value) return
  if (!currentRoundData.value) return
  
  isAnswering.value = true
  stopRound()
  
  selectedSide.value = side
  showResult.value = true
  
  const reactionTime = getCurrentReactionTime()
  reactionTimes.value.push(reactionTime)
  
  isCorrect.value = validateAnswer(side, currentRoundData.value)
  
  // 記錄答案
  const earnedScore = isCorrect.value ? 10 : 0
  recordAnswer(isCorrect.value, side, currentRoundData.value.correctAnswer, earnedScore)
  
  // 顯示回饋
  if (isCorrect.value) {
    playCorrect()
    setFeedback('correct', '正確！')
  } else {
    playWrong()
    const correctLabel = currentRoundData.value.correctAnswer === 'left' ? '左邊' : '右邊'
    setFeedback('wrong', `答案是${correctLabel}`)
  }
  
  // 延遲後進入下一題或結束
  setTimeout(() => {
    clearFeedback()
    isAnswering.value = false
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNextRound()
    } else {
      handleGameEnd()
    }
  }, 1200)
}

function handleRoundTimeout() {
  if (!currentRoundData.value) return
  
  // 超時視為答錯
  showResult.value = true
  isCorrect.value = false
  
  recordAnswer(false, null, currentRoundData.value.correctAnswer, 0)
  
  playWrong()
  const correctLabel = currentRoundData.value.correctAnswer === 'left' ? '左邊' : '右邊'
  setFeedback('wrong', `時間到！答案是${correctLabel}`)
  
  setTimeout(() => {
    clearFeedback()
    
    if (currentRound.value < totalRounds - 1) {
      nextRound()
      generateNextRound()
    } else {
      handleGameEnd()
    }
  }, 1000)
}

function handleGameEnd() {
  stopRound()
  playEnd()
  
  const result = summarizeResult(
    correctCount.value,
    correctCount.value + wrongCount.value,
    reactionTimes.value,
    config.value
  )
  
  finishGame()
  emit('game-end', result)
}

// ===== 生命週期 =====
onMounted(() => {
  preloadDefaultSounds()
})

// 監聽狀態變化，節流 emit 給父層
watchEffect(() => {
  if (phase.value === 'playing') {
    throttledEmit({
      timeLeft: roundTime.value,
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currentRound: currentRound.value,
      totalRounds: totalRounds,
      showTimer: true,
      showScore: true,
      showCounts: true,
      showProgress: true
    })
  }
})

onUnmounted(() => {
  cleanupThrottle()
})

// 監聽難度變化
watch(() => [props.difficulty, props.subDifficulty] as const, () => {
  if (phase.value !== 'ready') {
    stopRound()
    resetGame()
  }
})
</script>

<template>
  <div class="balance-scale-game game-root w-full max-w-2xl mx-auto p-4" :class="{ 'is-landscape': isSmallLandscape() }">
    <!-- 準備畫面 -->
    <GameReadyScreen
      v-if="phase === 'ready'"
      title="天平比重"
      icon="⚖️"
      :difficulty="difficulty"
      :auto-start="props.autoStart"
      @start="handleStart"
    />

    <!-- 遊戲進行中 -->
    <template v-else-if="phase === 'playing' || phase === 'paused'">

      <!-- 題目資訊 -->
        <div class="question-info game-panel text-center mt-4 px-4 py-3">
          <div class="text-xs sm:text-sm text-[var(--color-text-muted)]">
            第 {{ currentRound + 1 }} / {{ totalRounds }} 題
          </div>
        <div class="text-base sm:text-lg font-medium mt-2">
          哪一邊比較重？
        </div>
      </div>

      <!-- 天平 -->
        <div class="scale-container game-panel relative mt-4 sm:mt-6 px-4 py-4" v-if="currentRoundData">
        <img class="scale-bg" :src="scaleImg" alt="" aria-hidden="true" />
        <!-- 天平支架 -->
        <div class="scale-stand">
          <div class="stand-base"></div>
          <div class="stand-pole"></div>
          <div class="stand-top"></div>
        </div>

        <!-- 天平臂 -->
        <div
          class="scale-arm"
          :style="{ transform: `rotate(${armRotation}deg)` }"
        >
          <!-- 左盤 -->
          <div
            class="scale-pan left transition-all min-h-[120px] sm:min-h-[140px]"
            :class="{
              'cursor-pointer hover:ring-4 hover:ring-blue-300': isPlaying && !showResult,
              'pointer-events-none': showResult || !isPlaying,
              'ring-4 ring-green-400': showResult && currentRoundData.leftWeight > currentRoundData.rightWeight,
              'ring-4 ring-red-400': showResult && currentRoundData.leftWeight < currentRoundData.rightWeight && selectedSide === 'left'
            }"
            :aria-disabled="showResult || !isPlaying"
            @click="handleSelectSide('left')"
          >
            <div class="pan-items">
              <span
                v-for="(item, i) in currentRoundData.leftItems"
                :key="i"
                class="text-2xl sm:text-3xl md:text-4xl"
              >
                <span v-if="getWeightImage(item.weight)" class="weight-item">
                  <img
                    class="weight-img"
                    :src="getWeightImage(item.weight)!"
                    alt=""
                    aria-hidden="true"
                  />
                  <span class="weight-label">{{ item.weight }}</span>
                </span>
                <span v-else class="weight-fallback">{{ item.emoji }} {{ item.weight }}</span>
              </span>
            </div>
            <div class="pan-base"></div>
          </div>

          <!-- 右盤 -->
          <div
            class="scale-pan right transition-all min-h-[120px] sm:min-h-[140px]"
            :class="{
              'cursor-pointer hover:ring-4 hover:ring-blue-300': isPlaying && !showResult,
              'pointer-events-none': showResult || !isPlaying,
              'ring-4 ring-green-400': showResult && currentRoundData.rightWeight > currentRoundData.leftWeight,
              'ring-4 ring-red-400': showResult && currentRoundData.rightWeight < currentRoundData.leftWeight && selectedSide === 'right'
            }"
            :aria-disabled="showResult || !isPlaying"
            @click="handleSelectSide('right')"
          >
            <div class="pan-items">
              <span
                v-for="(item, i) in currentRoundData.rightItems"
                :key="i"
                class="text-2xl sm:text-3xl md:text-4xl"
              >
                <span v-if="getWeightImage(item.weight)" class="weight-item">
                  <img
                    class="weight-img"
                    :src="getWeightImage(item.weight)!"
                    alt=""
                    aria-hidden="true"
                  />
                  <span class="weight-label">{{ item.weight }}</span>
                </span>
                <span v-else class="weight-fallback">{{ item.emoji }} {{ item.weight }}</span>
              </span>
            </div>
            <div class="pan-base"></div>
          </div>
        </div>

        <!-- 結果提示 -->
        <Transition name="fade">
          <div
            v-if="showResult"
            class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl z-10"
          >
            {{ isCorrect ? '✅' : '❌' }}
          </div>
        </Transition>
      </div>

      <!-- 重量提示（簡單模式） -->
      <div
        v-if="config.showWeightHint && currentRoundData"
          class="weight-hint text-center mt-4 text-xs sm:text-sm text-[var(--color-text-muted)] px-4"
        >
        <div class="flex flex-wrap justify-center gap-2 sm:gap-4">
          <span>左邊: {{ currentRoundData.leftWeight }} 重量單位</span>
          <span class="hidden sm:inline">|</span>
          <span>右邊: {{ currentRoundData.rightWeight }} 重量單位</span>
        </div>
      </div>

      <!-- 回饋動畫 -->
      <GameFeedback
        v-if="feedbackData"
        :type="feedbackData.type"
        :show="feedbackData.show"
        :message="feedbackData.message"
      />
    </template>
  </div>
</template>

<style scoped>
.scale-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
}

.scale-bg {
  position: absolute;
  bottom: 0;
  width: min(420px, 100%);
  opacity: 0.15;
  pointer-events: none;
}

.scale-stand {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.stand-base {
  width: 120px;
  height: 20px;
  background: linear-gradient(to bottom, #8B4513, #654321);
  border-radius: 4px;
  margin: 0 auto;
}

.stand-pole {
  width: 16px;
  height: 120px;
  background: linear-gradient(to right, #8B4513, #A0522D, #8B4513);
  margin: 0 auto;
  border-radius: 2px;
}

.stand-top {
  width: 30px;
  height: 30px;
  background: #FFD700;
  border-radius: 50%;
  margin: -15px auto 0;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.scale-arm {
  position: relative;
  width: min(400px, 100%);
  height: 12px;
  background: linear-gradient(to bottom, var(--color-accent-warm), #B8860B);
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.5s ease;
  z-index: 2;
}

.scale-pan {
  position: absolute;
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.scale-pan.left {
  left: 0;
}

.scale-pan.right {
  right: 0;
}

.pan-items {
  min-height: 80px;
  padding: 12px;
  background: var(--color-surface);
  border: 2px solid var(--color-border-light);
  border-radius: 50%;
  width: 120px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-shadow: var(--shadow-sm);
}

.weight-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.weight-img {
  width: 36px;
  height: 36px;
}

.weight-label {
  position: absolute;
  bottom: -4px;
  right: -2px;
  min-width: 18px;
  padding: 0 4px;
  background: var(--color-text);
  color: var(--color-text-inverse);
  font-size: 10px;
  line-height: 16px;
  border-radius: 999px;
}

.weight-fallback {
  font-size: 1.1rem;
}

.is-landscape .scale-container {
  min-height: 240px;
}

.pan-base {
  width: 4px;
  height: 40px;
  background: #888;
  margin-top: -5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .scale-arm {
    width: min(300px, 100%);
  }
  
  .scale-pan {
    width: 100px;
  }
  
  .pan-items {
    width: 90px;
    min-height: 60px;
  }
  
}
</style>
