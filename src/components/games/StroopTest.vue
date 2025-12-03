<template>
  <div class="game-area">
    <!-- 遊戲說明 -->
    <div v-if="!isPlaying && !isFinished" class="text-center mb-6">
      <p class="text-lg text-[var(--color-text-secondary)]">
        {{ gameModeDescription }}
      </p>
      <p class="text-sm text-[var(--color-text-muted)]">
        例如：<span class="text-red-500 font-bold" style="border: 3px solid #3b82f6; padding: 2px 8px; border-radius: 4px;">藍色</span> 
        → {{ props.difficulty === 'easy' ? '答案是「紅色」（文字顏色）' : props.difficulty === 'medium' ? '答案是「藍色」（文字意思）' : '注意題目提示！' }}
      </p>
      <div class="mt-4 p-3 bg-[var(--color-primary-bg)] rounded-lg">
        <p class="text-sm text-[var(--color-primary)]">
          <strong>🎯 難度說明：</strong>
          {{ difficultyModeExplanation }}
        </p>
      </div>
    </div>

    <!-- 遊戲狀態 -->
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">第</span>
        <span class="font-bold text-blue-600 dark:text-blue-400">{{ currentRound }}/{{ totalRounds }}</span>
        <span class="text-[var(--color-text-muted)]">題</span>
      </div>
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">正確：</span>
        <span class="font-bold text-green-500 dark:text-green-400">{{ correctCount }}</span>
      </div>
      <div class="text-lg">
        <span class="text-[var(--color-text-muted)]">剩餘：</span>
        <span class="font-bold text-[var(--color-text)]">{{ remainingTime }}秒</span>
      </div>
    </div>

    <!-- Stroop 測試區 -->
    <div v-if="isPlaying" class="stroop-area">
      <!-- 題目提示（混合模式時顯示） -->
      <div class="question-prompt mb-4">
        <span class="prompt-icon">{{ currentQuestionType === 'ink' ? '🎨' : '📝' }}</span>
        <span class="prompt-text">
          {{ currentQuestionType === 'ink' ? '請選擇文字的【顏色】' : '請選擇文字的【意思】' }}
        </span>
      </div>

      <!-- 顯示文字（含外框） -->
      <div class="stroop-word mb-8" :style="{ borderColor: borderColor }">
        <span 
          class="text-5xl md:text-6xl font-bold"
          :style="{ color: currentColor }"
        >
          {{ currentWord }}
        </span>
      </div>

      <!-- 選項按鈕 -->
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          v-for="option in options"
          :key="option.name"
          class="btn btn-lg py-5 text-lg font-bold transition-all"
          :class="getButtonClass(option)"
          :disabled="showResult"
          @click="selectAnswer(option.name)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- 結果提示 -->
      <transition name="fade">
        <div v-if="showResult" class="mt-6 text-center">
          <span class="text-5xl">{{ isCorrect ? '✅' : '❌' }}</span>
          <p v-if="!isCorrect" class="text-sm text-[var(--color-text-muted)] mt-2">
            正確答案：{{ getCorrectAnswerLabel() }}
          </p>
        </div>
      </transition>
    </div>

    <!-- 開始按鈕 -->
    <div class="mt-6 text-center">
      <button
        v-if="!isPlaying && !isFinished"
        @click="startGame"
        class="btn btn-primary btn-xl"
      >
        開始遊戲 🎨
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { Difficulty, GameResult } from '@/types/game'

// Props
const props = defineProps<{
  difficulty: Difficulty
  settings: Record<string, number | string | boolean>
}>()

// Emits
const emit = defineEmits<{
  'score-change': [score: number]
  'game-end': [result: GameResult]
}>()

// 遊戲模式類型
type QuestionType = 'ink' | 'meaning'

// 顏色定義
interface ColorOption {
  name: string
  label: string
  value: string
}

const colors: ColorOption[] = [
  { name: 'red', label: '紅色', value: '#ef4444' },
  { name: 'blue', label: '藍色', value: '#3b82f6' },
  { name: 'green', label: '綠色', value: '#22c55e' },
  { name: 'yellow', label: '黃色', value: '#eab308' },
]

// 難度設定（根據難度自動決定遊戲模式）
const difficultyConfig = computed(() => {
  const defaults = {
    // easy: 固定詢問「墨水顏色」
    easy: { rounds: 10, timePerRound: 8, congruentChance: 0.5, mode: 'ink' as const },
    // medium: 固定詢問「文字意思」（反直覺挑戰）
    medium: { rounds: 15, timePerRound: 6, congruentChance: 0.3, mode: 'meaning' as const },
    // hard: 隨機切換詢問類型（mixed 模式）
    hard: { rounds: 20, timePerRound: 4, congruentChance: 0.2, mode: 'mixed' as const },
  }
  return {
    ...defaults[props.difficulty],
    ...props.settings,
  } as typeof defaults.easy
})

// 遊戲模式說明
const gameModeDescription = computed(() => {
  switch (props.difficulty) {
    case 'easy':
      return '快速選出文字的「顏色」，而非文字本身的意思！'
    case 'medium':
      return '快速選出文字的「意思」，忽略它的顯示顏色！'
    case 'hard':
      return '根據提示選出文字的「顏色」或「意思」，注意切換！'
    default:
      return ''
  }
})

// 難度模式解釋
const difficultyModeExplanation = computed(() => {
  switch (props.difficulty) {
    case 'easy':
      return '簡單模式 - 只需判斷文字的顏色（墨水顏色）'
    case 'medium':
      return '中等模式 - 只需判斷文字代表的意思'
    case 'hard':
      return '困難模式 - 隨機切換判斷顏色或意思，需快速反應！'
    default:
      return ''
  }
})

// 遊戲狀態
const isPlaying = ref(false)
const isFinished = ref(false)
const currentRound = ref(0)
const totalRounds = computed(() => difficultyConfig.value.rounds)
const correctCount = ref(0)
const remainingTime = ref(0)

const currentWord = ref('')        // 文字內容（如「紅色」）
const currentColor = ref('')       // 墨水顏色（如 #3b82f6 藍色）
const borderColor = ref('')        // 外框顏色（增加干擾）
const currentWordName = ref('')    // 文字代表的顏色名稱（如 'red'）
const currentInkName = ref('')     // 墨水顏色名稱（如 'blue'）
const currentQuestionType = ref<QuestionType>('ink')  // 當前詢問類型
const correctAnswer = ref('')
const selectedAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(false)

const options = ref<ColorOption[]>([])
const reactionTimes = ref<number[]>([])
let roundStartTime = 0

// 計時器
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 生成題目
function generateRound(): void {
  const config = difficultyConfig.value
  
  // 決定本題的詢問類型
  if (config.mode === 'mixed') {
    currentQuestionType.value = Math.random() < 0.5 ? 'ink' : 'meaning'
  } else {
    currentQuestionType.value = config.mode === 'meaning' ? 'meaning' : 'ink'
  }
  
  // 決定是否一致（文字和顏色相同）
  const isCongruent = Math.random() < config.congruentChance

  // 隨機選擇顏色
  const shuffledColors = [...colors].sort(() => Math.random() - 0.5)
  const wordColor = shuffledColors[0]  // 文字內容代表的顏色
  const inkColor = isCongruent ? wordColor : shuffledColors[1]  // 墨水顏色
  
  // 選擇外框顏色（增加干擾，選擇第三個不同的顏色）
  const borderOptions = shuffledColors.filter(c => c !== wordColor && c !== inkColor)
  const borderColorOption = borderOptions[0] || shuffledColors[2]

  if (!wordColor || !inkColor) return

  currentWord.value = wordColor.label
  currentWordName.value = wordColor.name
  currentColor.value = inkColor.value
  currentInkName.value = inkColor.name
  borderColor.value = borderColorOption?.value || 'transparent'
  
  // 根據詢問類型決定正確答案
  if (currentQuestionType.value === 'ink') {
    // 問墨水顏色
    correctAnswer.value = inkColor.name
  } else {
    // 問文字意思
    correctAnswer.value = wordColor.name
  }

  // 生成選項（打亂順序）
  options.value = [...colors].sort(() => Math.random() - 0.5)

  selectedAnswer.value = ''
  showResult.value = false
  remainingTime.value = config.timePerRound
  roundStartTime = Date.now()
}

// 取得正確答案的標籤
function getCorrectAnswerLabel(): string {
  const correctOption = colors.find(c => c.name === correctAnswer.value)
  return correctOption?.label || ''
}

// 獲取按鈕樣式
function getButtonClass(option: ColorOption): string {
  if (!showResult.value) {
    return 'bg-[var(--game-button-bg)] hover:bg-[var(--game-button-hover)] text-[var(--color-text)]'
  }
  
  if (option.name === correctAnswer.value) {
    return 'bg-green-500 dark:bg-green-600 text-white'
  }
  
  if (option.name === selectedAnswer.value && !isCorrect.value) {
    return 'bg-red-500 dark:bg-red-600 text-white'
  }
  
  return 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
}

// 選擇答案
function selectAnswer(answer: string): void {
  if (!isPlaying.value || showResult.value) return

  selectedAnswer.value = answer
  showResult.value = true

  const reactionTime = Date.now() - roundStartTime
  reactionTimes.value.push(reactionTime)

  isCorrect.value = answer === correctAnswer.value

  if (isCorrect.value) {
    correctCount.value++
    emit('score-change', correctCount.value)
  }

  // 清除倒數
  if (countdownTimer) clearInterval(countdownTimer)

  // 下一題
  setTimeout(() => {
    if (currentRound.value < totalRounds.value) {
      nextRound()
    } else {
      endGame()
    }
  }, 1000)
}

// 開始遊戲
function startGame(): void {
  isPlaying.value = true
  isFinished.value = false
  currentRound.value = 0
  correctCount.value = 0
  reactionTimes.value = []
  
  nextRound()
}

// 下一題
function nextRound(): void {
  currentRound.value++
  generateRound()

  // 開始倒數
  countdownTimer = setInterval(() => {
    remainingTime.value--
    if (remainingTime.value <= 0) {
      // 時間到
      showResult.value = true
      isCorrect.value = false
      if (countdownTimer) clearInterval(countdownTimer)
      
      setTimeout(() => {
        if (currentRound.value < totalRounds.value) {
          nextRound()
        } else {
          endGame()
        }
      }, 800)
    }
  }, 1000)
}

// 結束遊戲
function endGame(): void {
  isPlaying.value = false
  isFinished.value = true

  if (countdownTimer) clearInterval(countdownTimer)

  const accuracy = totalRounds.value > 0 ? correctCount.value / totalRounds.value : 0
  const avgReactionTime = reactionTimes.value.length > 0
    ? Math.round(reactionTimes.value.reduce((a, b) => a + b, 0) / reactionTimes.value.length)
    : 0

  // 計算分數
  const accuracyScore = accuracy * 75
  const speedBonus = avgReactionTime > 0 && avgReactionTime < 2000
    ? Math.min(25, (2000 - avgReactionTime) / 80)
    : 0
  
  const finalScore = Math.round(Math.min(100, accuracyScore + speedBonus))

  const result: GameResult = {
    gameId: 'stroop-test',
    difficulty: props.difficulty,
    score: finalScore,
    maxScore: 100,
    correctCount: correctCount.value,
    totalCount: totalRounds.value,
    accuracy,
    avgReactionTime,
    duration: totalRounds.value * difficultyConfig.value.timePerRound,
    timestamp: new Date(),
  }

  emit('game-end', result)
}

// 清理
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.stroop-area {
  text-align: center;
  padding: 1.5rem;
}

.question-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary-bg), rgba(99, 102, 241, 0.1));
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  animation: pulse-border 1.5s ease-in-out infinite;
}

.prompt-icon {
  font-size: 1.5rem;
}

.prompt-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

:where(.dark, .dark *) .prompt-text {
  color: var(--color-primary-light);
}

@keyframes pulse-border {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
  }
}

.stroop-word {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 1.5rem 2rem;
  border: 4px solid transparent;
  transition: border-color 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 手機優化 */
@media (max-width: 640px) {
  .stroop-area {
    padding: 1rem;
  }

  .question-prompt {
    padding: 0.5rem 1rem;
  }

  .prompt-text {
    font-size: 1rem;
  }

  .stroop-word {
    min-height: 80px;
    padding: 1rem;
  }
}
</style>
