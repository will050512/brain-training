<script setup lang="ts">
/**
 * 遊戲容器元件
 * 全螢幕遊戲體驗，整合狀態列、回饋層、響應式設計
 */
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useResponsive } from '@/composables/useResponsive'
import GameStatusBar from '@/components/games/ui/GameStatusBar.vue'
import GameFeedback from '@/components/games/ui/GameFeedback.vue'
import GameReadyScreen from '@/components/games/ui/GameReadyScreen.vue'
import GameResultScreen from '@/components/games/ui/GameResultScreen.vue'
import type { GamePhase, FeedbackType } from '@/games/core/gameTypes'

interface Props {
  /** 遊戲名稱 */
  gameName: string
  /** 遊戲圖示 */
  gameIcon?: string
  /** 遊戲說明 */
  gameDescription?: string
  /** 遊戲規則 */
  gameRules?: string[]
  /** 難度 */
  difficulty?: 'easy' | 'normal' | 'hard'
  /** 當前階段 */
  phase?: GamePhase
  /** 剩餘時間（秒） */
  timeLeft?: number
  /** 當前回合 */
  currentRound?: number
  /** 總回合數 */
  totalRounds?: number
  /** 當前分數 */
  score?: number
  /** 正確數 */
  correctCount?: number
  /** 錯誤數 */
  wrongCount?: number
  /** 連擊數 */
  combo?: number
  /** 是否顯示狀態列 */
  showStatusBar?: boolean
  /** 是否啟用暫停 */
  enablePause?: boolean
  /** 返回路徑 */
  backPath?: string
  /** 最終結果 */
  result?: {
    score: number
    grade?: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
    correctCount?: number
    wrongCount?: number
    totalCount?: number
    timeSpent?: number
    maxCombo?: number
    isNewHighScore?: boolean
    highScore?: number
  }
  /** 回饋設定 */
  feedback?: {
    type: FeedbackType
    show: boolean
    message?: string
    score?: number
    combo?: number
    correctAnswer?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  phase: 'ready',
  showStatusBar: true,
  enablePause: true,
  backPath: '/games',
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'quit'): void
  (e: 'replay'): void
  (e: 'back'): void
  (e: 'feedbackHidden'): void
}>()

const router = useRouter()
const { isMobile, isSmallLandscape } = useResponsive()

// 暫停狀態
const isPaused = ref(false)

// 是否為沉浸模式（隱藏狀態列）
const isImmersive = ref(false)

// 時間警告
const isTimeWarning = computed(() => (props.timeLeft ?? 999) <= 10)

// 處理返回
const handleBack = (): void => {
  if (props.phase === 'playing') {
    isPaused.value = true
    emit('pause')
  } else {
    emit('back')
    router.push(props.backPath)
  }
}

// 處理暫停
const handlePause = (): void => {
  isPaused.value = true
  emit('pause')
}

// 處理繼續
const handleResume = (): void => {
  isPaused.value = false
  emit('resume')
}

// 處理退出
const handleQuit = (): void => {
  isPaused.value = false
  emit('quit')
  router.push(props.backPath)
}

// 處理開始
const handleStart = (): void => {
  emit('start')
}

// 處理重玩
const handleReplay = (): void => {
  emit('replay')
}

// 處理返回列表
const handleBackToList = (): void => {
  emit('back')
  router.push(props.backPath)
}

// 鍵盤事件
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && props.phase === 'playing' && props.enablePause) {
    if (isPaused.value) {
      handleResume()
    } else {
      handlePause()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Provide 給子元件
provide('gameContainer', {
  isMobile,
  isImmersive,
  isPaused,
})
</script>

<template>
  <div 
    class="game-container-wrapper"
    :class="{ 
      'is-mobile': isMobile,
      'is-landscape': isSmallLandscape(),
      'is-immersive': isImmersive
    }"
  >
    <!-- 遊戲頭部 -->
    <header class="game-header" v-if="phase !== 'ready' && !isImmersive">
      <button 
        type="button" 
        class="header-btn back-btn"
        @click="handleBack"
      >
        ←
      </button>
      
      <div class="header-title">
        <span v-if="gameIcon" class="title-icon">{{ gameIcon }}</span>
        <span class="title-text">{{ gameName }}</span>
      </div>
      
      <button 
        v-if="phase === 'playing' && enablePause"
        type="button" 
        class="header-btn pause-btn"
        @click="handlePause"
      >
        ⏸️
      </button>
      <div v-else class="header-btn-placeholder" />
    </header>

    <!-- 狀態列 -->
    <GameStatusBar
      v-if="showStatusBar && phase === 'playing' && !isImmersive"
      :time-left="timeLeft"
      :current-round="currentRound"
      :total-rounds="totalRounds"
      :score="score"
      :correct-count="correctCount"
      :wrong-count="wrongCount"
      :combo="combo"
      :time-warning="isTimeWarning"
      :compact="isSmallLandscape()"
      class="game-status"
    />

    <!-- 遊戲主區域 -->
    <main class="game-main">
      <!-- 準備畫面 -->
      <GameReadyScreen
        v-if="phase === 'ready'"
        :title="gameName"
        :icon="gameIcon"
        :description="gameDescription"
        :rules="gameRules"
        :difficulty="difficulty"
        @start="handleStart"
      />

      <!-- 遊戲內容 -->
      <div v-else-if="phase === 'playing' || phase === 'paused'" class="game-content">
        <slot />
      </div>

      <!-- 結果畫面 -->
      <GameResultScreen
        v-else-if="phase === 'finished' && result"
        :score="result.score"
        :grade="result.grade"
        :high-score="result.highScore"
        :is-new-high-score="result.isNewHighScore"
        :correct-count="result.correctCount"
        :wrong-count="result.wrongCount"
        :total-count="result.totalCount"
        :time-spent="result.timeSpent"
        :max-combo="result.maxCombo"
        @replay="handleReplay"
        @back="handleBackToList"
      />

      <!-- 預設 slot 作為備用 -->
      <slot v-else name="custom" />
    </main>

    <!-- 回饋層 -->
    <GameFeedback
      v-if="feedback"
      :type="feedback.type"
      :show="feedback.show"
      :message="feedback.message"
      :score="feedback.score"
      :combo="feedback.combo"
      :correct-answer="feedback.correctAnswer"
      @hidden="emit('feedbackHidden')"
    />

    <!-- 暫停遮罩 -->
    <Transition name="fade">
      <div v-if="isPaused" class="pause-overlay">
        <div class="pause-modal">
          <div class="pause-icon">⏸️</div>
          <h2 class="pause-title">遊戲暫停</h2>
          <div class="pause-actions">
            <button 
              type="button" 
              class="btn btn-primary btn-lg"
              @click="handleResume"
            >
              繼續遊戲
            </button>
            <button 
              type="button" 
              class="btn btn-danger btn-lg"
              @click="handleQuit"
            >
              結束遊戲
            </button>
          </div>
          <p class="pause-hint">按 ESC 鍵繼續</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-container-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
  /* 確保在所有裝置上都填滿視窗 */
  width: 100vw;
  width: 100dvw;
}

/* 遊戲頭部 */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 10;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--color-bg-soft);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.header-btn:hover {
  background: var(--color-bg-muted);
}

.header-btn-placeholder {
  width: 44px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.title-icon {
  font-size: 1.5rem;
}

.title-text {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

/* 狀態列 */
.game-status {
  flex-shrink: 0;
}

/* 遊戲主區域 */
.game-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  overflow: auto;
}

/* 暫停遮罩 */
.pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.pause-modal {
  background: var(--color-surface);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-xl);
  text-align: center;
  max-width: 320px;
  width: 90%;
  box-shadow: var(--shadow-xl);
}

.pause-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.pause-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--spacing-lg);
}

.pause-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.pause-hint {
  margin-top: var(--spacing-md);
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* 沉浸模式 */
.is-immersive .game-header,
.is-immersive .game-status {
  display: none;
}

.is-immersive .game-main {
  height: 100vh;
}

/* 橫向小螢幕優化 */
.is-landscape .game-header {
  padding: var(--spacing-xs) var(--spacing-md);
}

.is-landscape .game-content {
  padding: var(--spacing-sm);
}

/* 動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 桌面版優化 */
@media (min-width: 768px) {
  .game-container-wrapper {
    max-width: 100%;
  }
  
  .game-content {
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .game-content {
    max-width: 900px;
    padding: var(--spacing-lg);
  }
}
</style>
