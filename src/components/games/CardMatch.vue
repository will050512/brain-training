<script setup lang="ts">
/**
 * 卡片配對遊戲（重構版 v2）
 * 
 * 三層分離架構：
 * - UI 層：本元件，負責渲染與使用者互動
 * - 邏輯層：@/games/logic/cardMatch.ts，純函數處理遊戲邏輯
 * - 音效/狀態層：@/games/core/useGame.ts，統一管理狀態與音效
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useGame } from '@/games/core/useGame'
import type { DifficultyConfig } from '@/games/core/gameTypes'
import {
  generateCards,
  checkMatch,
  summarizeResult,
  showAllCards,
  hideUnmatchedCards,
  CARD_MATCH_CONFIGS,
  type Card,
  type CardMatchConfig
} from '@/games/logic/cardMatch'
import type { GameDifficulty } from '@/stores/settingsStore'

// UI 元件
import GameReadyScreen from './ui/GameReadyScreen.vue'
import GameStatusBar from './ui/GameStatusBar.vue'
import GameFeedback from './ui/GameFeedback.vue'

// ===== Props & Emits =====
const props = withDefaults(defineProps<{
  difficulty?: GameDifficulty
  settings?: Record<string, unknown>
}>(), {
  difficulty: 'easy'
})

const emit = defineEmits<{
  'game:start': []
  'game:end': [result: ReturnType<typeof summarizeResult>]
  'score:update': [score: number]
  'state:change': [phase: string]
}>()

// ===== 難度配置轉換 =====
interface CardMatchDifficultyConfig extends DifficultyConfig {
  pairs: number
  previewTime: number
  gridCols: number
}

const difficultyConfigs = {
  easy: {
    timeLimit: CARD_MATCH_CONFIGS.easy.timeLimit || 120,
    totalRounds: CARD_MATCH_CONFIGS.easy.pairs,
    baseScore: 10,
    pairs: CARD_MATCH_CONFIGS.easy.pairs,
    previewTime: CARD_MATCH_CONFIGS.easy.previewTime,
    gridCols: CARD_MATCH_CONFIGS.easy.gridCols,
  },
  medium: {
    timeLimit: CARD_MATCH_CONFIGS.medium.timeLimit,
    totalRounds: CARD_MATCH_CONFIGS.medium.pairs,
    baseScore: 15,
    pairs: CARD_MATCH_CONFIGS.medium.pairs,
    previewTime: CARD_MATCH_CONFIGS.medium.previewTime,
    gridCols: CARD_MATCH_CONFIGS.medium.gridCols,
  },
  hard: {
    timeLimit: CARD_MATCH_CONFIGS.hard.timeLimit,
    totalRounds: CARD_MATCH_CONFIGS.hard.pairs,
    baseScore: 20,
    pairs: CARD_MATCH_CONFIGS.hard.pairs,
    previewTime: CARD_MATCH_CONFIGS.hard.previewTime,
    gridCols: CARD_MATCH_CONFIGS.hard.gridCols,
  },
} satisfies Record<GameDifficulty, CardMatchDifficultyConfig>

// ===== 使用統一遊戲 Composable =====
const game = useGame<CardMatchDifficultyConfig>({
  gameId: 'card-match',
  difficultyConfigs,
  timerMode: 'stopwatch', // 正計時，除非有時間限制
  audioFolder: 'card-match',
  preloadAudio: true,
  onPhaseChange: (phase) => {
    emit('state:change', phase)
  },
  onGameEnd: (result) => {
    // 轉換為 CardMatch 專用結果格式
    const cardResult = summarizeResult(
      matchedPairs.value,
      totalPairs.value,
      moves.value,
      result.duration
    )
    emit('game:end', cardResult)
  },
})

// ===== 遊戲專屬狀態 =====
const cards = ref<Card[]>([])
const flippedIndices = ref<number[]>([])
const matchedPairs = ref(0)
const moves = ref(0)
const isChecking = ref(false)
const isPreviewing = ref(false)

// ===== 計算屬性 =====
const config = computed(() => game.currentConfig.value)
const totalPairs = computed(() => config.value.pairs)
const gridCols = computed(() => config.value.gridCols)
const phase = computed(() => game.state.phase.value)
const score = computed(() => game.state.score.value)
const isPlaying = computed(() => game.state.isPlaying.value)

const displayTime = computed(() => {
  if (config.value.timeLimit > 0) {
    return game.timer.time.value
  }
  return game.timer.time.value
})

const timerWarning = computed(() => 
  config.value.timeLimit > 0 && game.timer.isWarning.value
)

const feedbackData = computed(() => {
  const fb = game.state.feedback.value
  if (!fb) return undefined
  return {
    type: fb.type,
    show: game.state.showFeedback.value,
    message: fb.message,
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

/** 開始遊戲 */
function handleStart() {
  // 初始化遊戲狀態
  flippedIndices.value = []
  matchedPairs.value = 0
  moves.value = 0
  isChecking.value = false
  
  // 載入難度並設置
  game.setDifficulty(props.difficulty)
  
  // 生成卡片
  const currentConfig = CARD_MATCH_CONFIGS[props.difficulty]
  cards.value = generateCards(currentConfig)
  
  // 開始遊戲狀態
  game.state.startGame()
  emit('game:start')
  
  // 預覽階段 - 顯示所有卡片
  isPreviewing.value = true
  cards.value = showAllCards(cards.value)
  
  // 預覽結束後隱藏卡片並開始計時
  setTimeout(() => {
    cards.value = hideUnmatchedCards(cards.value)
    isPreviewing.value = false
    
    // 根據是否有時間限制選擇計時模式
    if (currentConfig.timeLimit > 0) {
      game.timer.reset(currentConfig.timeLimit)
    } else {
      game.timer.reset(0)
    }
    game.timer.start()
  }, currentConfig.previewTime)
}

/** 處理卡片點擊 */
function handleCardClick(index: number) {
  if (!isPlaying.value || isPreviewing.value || isChecking.value) return
  
  const card = cards.value[index]
  if (!card || card.isFlipped || card.isMatched) return
  if (flippedIndices.value.length >= 2) return
  
  // 翻開卡片（UI 更新 + 音效）
  game.audio.playFlip()
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
    
    // 呼叫邏輯層檢查配對
    if (checkMatch(card1, card2)) {
      handleMatchSuccess(idx1, idx2, card1, card2)
    } else {
      handleMatchFailure(idx1, idx2, card1, card2)
    }
  }
}

/** 配對成功處理 */
function handleMatchSuccess(idx1: number, idx2: number, card1: Card, card2: Card) {
  setTimeout(() => {
    // 播放配對成功音效
    game.audio.playMatch()
    
    // 更新卡片狀態
    cards.value[idx1] = { ...card1, isMatched: true }
    cards.value[idx2] = { ...card2, isMatched: true }
    matchedPairs.value++
    
    // 計算並添加分數
    const matchScore = config.value.baseScore
    game.state.addScore(matchScore)
    emit('score:update', game.state.score.value)
    
    // 顯示回饋
    game.showFeedback('correct', '配對成功！', matchScore)
    
    setTimeout(() => {
      game.hideFeedback()
      flippedIndices.value = []
      isChecking.value = false
      
      // 檢查是否完成
      if (matchedPairs.value >= totalPairs.value) {
        handleGameComplete()
      }
    }, 300)
  }, 300)
}

/** 配對失敗處理 */
function handleMatchFailure(idx1: number, idx2: number, card1: Card, card2: Card) {
  setTimeout(() => {
    // 播放錯誤音效
    game.audio.playWrong()
    game.showFeedback('wrong', '再試一次')
    
    setTimeout(() => {
      // 翻回卡片
      cards.value[idx1] = { ...card1, isFlipped: false }
      cards.value[idx2] = { ...card2, isFlipped: false }
      game.hideFeedback()
      flippedIndices.value = []
      isChecking.value = false
    }, 500)
  }, 500)
}

/** 遊戲完成處理 */
function handleGameComplete() {
  game.timer.stop()
  game.audio.playEnd()
  
  const duration = game.timer.getElapsedTime()
  
  // 計算最終結果
  const result = summarizeResult(
    matchedPairs.value,
    totalPairs.value,
    moves.value,
    duration
  )
  
  // 儲存難度設定
  game.saveDifficulty()
  
  // 結束遊戲
  game.state.finishGame()
  emit('game:end', result)
}

/** 時間到處理 */
function handleTimeUp() {
  handleGameComplete()
}

// ===== 生命週期 =====
onMounted(() => {
  // 載入儲存的難度設定
  game.loadDifficulty()
})

// 監聽 props.difficulty 變化
watch(() => props.difficulty, (newDifficulty) => {
  if (phase.value !== 'ready') {
    game.timer.stop()
    game.state.resetGame()
  }
  game.setDifficulty(newDifficulty)
})

// 監聯計時器時間到
watch(() => game.timer.isTimeUp.value, (isUp) => {
  if (isUp && isPlaying.value) {
    handleTimeUp()
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
