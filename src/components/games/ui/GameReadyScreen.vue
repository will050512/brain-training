<script setup lang="ts">
/**
 * 遊戲準備畫面元件
 * 顯示遊戲開始前的說明與倒數
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  /** 遊戲名稱 */
  title: string
  /** 遊戲說明（目前多數遊戲由外層頁面統一顯示） */
  description?: string
  /** 遊戲規則列表（目前多數遊戲由外層頁面統一顯示） */
  rules?: string[]
  /** 遊戲圖示 */
  icon?: string
  /** 難度 */
  difficulty?: 'easy' | 'medium' | 'hard' | 'normal'
  /** 難度顯示文字 */
  difficultyLabel?: string
  /** 是否顯示倒數 */
  showCountdown?: boolean
  /** 倒數秒數 */
  countdownFrom?: number
  /** 自動開始倒數 */
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCountdown: true,
  countdownFrom: 3,
  autoStart: false,
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'countdown', value: number): void
}>()

const isCountingDown = ref(false)
const countdown = ref(props.countdownFrom)
let countdownTimer: ReturnType<typeof setInterval> | null = null
const gameInfoRef = ref<HTMLElement | null>(null)
const gameInfoBodyRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)
let layoutObserver: ResizeObserver | null = null

// 難度顯示
const difficultyDisplay: Record<string, { label: string; class: string }> = {
  easy: { label: '簡單', class: 'difficulty-easy' },
  medium: { label: '中等', class: 'difficulty-medium' },
  normal: { label: '中等', class: 'difficulty-medium' }, // legacy alias
  hard: { label: '困難', class: 'difficulty-hard' },
}

const startCountdown = () => {
  if (isCountingDown.value) return
  
  isCountingDown.value = true
  countdown.value = props.countdownFrom
  
  countdownTimer = setInterval(() => {
    countdown.value--
    emit('countdown', countdown.value)
    
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      emit('start')
    }
  }, 1000)
}

const handleStart = () => {
  if (props.showCountdown) {
    startCountdown()
  } else {
    emit('start')
  }
}

// 自動開始
watch(() => props.autoStart, (val) => {
  if (val) {
    handleStart()
  }
}, { immediate: true })

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (layoutObserver) {
    layoutObserver.disconnect()
    layoutObserver = null
  }
})

const updateActionsHeight = (): void => {
  const root = gameInfoRef.value
  const body = gameInfoBodyRef.value
  const actions = actionsRef.value
  if (!root || !actions) return
  const height = actions.offsetHeight
  const needsPadding = root.scrollHeight > root.clientHeight + 1
  root.style.setProperty('--actual-sticky-height', `${height}px`)
  if (body) {
    body.style.paddingBottom = needsPadding
      ? `calc(${height}px + var(--spacing-sm))`
      : 'var(--spacing-sm)'
  }
}

onMounted(() => {
  nextTick(() => {
    updateActionsHeight()
    if ('ResizeObserver' in window) {
      layoutObserver = new ResizeObserver(() => {
        updateActionsHeight()
      })
      if (actionsRef.value) {
        layoutObserver.observe(actionsRef.value)
      }
      if (gameInfoRef.value) {
        layoutObserver.observe(gameInfoRef.value)
      }
    }
  })
})
</script>

<template>
  <div class="ready-screen">
    <!-- 倒數顯示 -->
    <Transition name="countdown">
      <div v-if="isCountingDown" class="countdown-overlay">
        <div class="countdown-number">
          {{ countdown > 0 ? countdown : '開始！' }}
        </div>
      </div>
    </Transition>

    <!-- 遊戲資訊 -->
    <div v-if="!isCountingDown" ref="gameInfoRef" class="game-info">
      <div ref="gameInfoBodyRef" class="game-info-body">
        <!-- 圖示 -->
        <div v-if="icon" class="game-icon">
          {{ icon }}
        </div>

        <!-- 標題 -->
        <h2 class="game-title">{{ title }}</h2>

        <!-- 難度 -->
        <div 
          v-if="difficulty" 
          class="game-difficulty"
          :class="difficultyDisplay[difficulty]?.class"
        >
          {{ difficultyLabel || difficultyDisplay[difficulty]?.label }}
        </div>

        <!-- 準備提示 -->
        <p class="game-ready-hint">
          準備好了嗎？點擊下方按鈕開始遊戲
        </p>
      </div>

      <div ref="actionsRef" class="game-info-actions">
        <!-- 開始按鈕 -->
        <button 
          type="button"
          class="start-button"
          @click="handleStart"
        >
          <span class="start-button-icon">▶</span>
          <span>開始遊戲</span>
        </button>

        <!-- 提示 -->
        <p class="hint">
          {{ showCountdown ? `點擊後將倒數 ${countdownFrom} 秒` : '' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ready-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background:
    radial-gradient(500px 260px at 15% 10%, rgba(59, 130, 246, 0.16), transparent 60%),
    radial-gradient(520px 260px at 90% 0%, rgba(245, 158, 11, 0.14), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.6), transparent 40%);
}

/* 遊戲資訊 */
.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
  animation: fadeIn 0.35s ease-out;
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-2xl);
  padding: 1.5rem 1.75rem;
  box-shadow: var(--shadow-lg);
  position: relative;
  isolation: isolate;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  scroll-padding-bottom: var(--actual-sticky-height, var(--sticky-bar-height));
}

.game-info::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(300px 120px at 20% 0%, rgba(59, 130, 246, 0.08), transparent 60%),
    radial-gradient(260px 120px at 80% 100%, rgba(22, 163, 74, 0.08), transparent 60%),
    var(--color-surface);
  border-radius: inherit;
  outline: 1px solid transparent;
  pointer-events: none;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.game-icon {
  font-size: var(--game-text-6xl);
  line-height: 1;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 6px 14px rgba(15, 23, 42, 0.2));
}

.game-title {
  font-size: var(--game-text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.game-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: var(--game-text-sm);
  font-weight: 600;
}

.difficulty-easy {
  background: var(--color-success);
  color: white;
}

.difficulty-medium,
.difficulty-normal {
  background: var(--color-warning);
  color: white;
}

.difficulty-hard {
  background: var(--color-danger);
  color: white;
}

.game-ready-hint {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0.5rem 0;
  font-size: var(--game-text-base);
}

.game-info-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.game-info-actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-light);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  padding: 0.75rem 0
    calc(env(safe-area-inset-bottom) + var(--spacing-sm));
}

.game-info-actions::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -24px;
  height: 24px;
  background: linear-gradient(to top, transparent, var(--color-surface));
  pointer-events: none;
}

/* 開始按鈕 */
.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  margin-top: 0;
  min-height: var(--min-touch-target);
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-xl);
  font-size: var(--game-text-xl);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-tactile-lg);
}

.start-button:hover {
  filter: brightness(1.05);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.start-button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-tactile-pressed);
}

.start-button-icon {
  font-size: var(--game-text-base);
}

.hint {
  font-size: var(--game-text-sm);
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

/* 倒數覆蓋層 */
.countdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 200;
}

.countdown-number {
  font-size: var(--game-text-6xl);
  font-weight: 900;
  color: white;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: countdownPulse 1s ease-out infinite;
}

@keyframes countdownPulse {
  0% { 
    transform: scale(1); 
    opacity: 1;
  }
  50% { 
    transform: scale(1.1); 
    opacity: 0.9;
  }
  100% { 
    transform: scale(1); 
    opacity: 1;
  }
}

/* 倒數動畫 */
.countdown-enter-active {
  animation: overlayIn 0.2s ease-out;
}

.countdown-leave-active {
  animation: overlayOut 0.3s ease-in;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlayOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* 手機優化 */
@media (max-width: 640px) {
  .ready-screen {
    padding: 1.5rem;
  }
  .start-button {
    padding: 1rem 2rem;
  }
}

:global(.is-ultra-short) .ready-screen .game-icon {
  display: none;
}

:global(.is-ultra-short) .ready-screen .game-title {
  font-size: clamp(1.25rem, 4vh, 2rem);
}

:global(.is-ultra-short) .ready-screen .game-info-actions {
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm)
    calc(env(safe-area-inset-bottom) + var(--spacing-xs));
}

@media (prefers-reduced-motion: reduce) {
  .game-info,
  .countdown-number {
    animation: none;
  }

  .start-button,
  .start-button:hover,
  .start-button:active {
    transition: none;
    transform: none;
  }
}
</style>
