<script setup lang="ts">
/**
 * 遊戲準備畫面元件
 * 顯示遊戲開始前的說明與倒數
 */
import { ref, watch, onUnmounted } from 'vue'

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
    <div v-if="!isCountingDown" class="game-info">
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
  overflow: hidden;
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
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-2xl);
  padding: 1.5rem 1.75rem;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

.game-info::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(300px 120px at 20% 0%, rgba(59, 130, 246, 0.08), transparent 60%),
    radial-gradient(260px 120px at 80% 100%, rgba(22, 163, 74, 0.08), transparent 60%);
  pointer-events: none;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.game-icon {
  font-size: 4rem;
  line-height: 1;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 6px 14px rgba(15, 23, 42, 0.2));
}

.game-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.game-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
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
  font-size: 1rem;
}

/* 開始按鈕 */
.start-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  margin-top: 1rem;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 1.25rem;
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
  font-size: 1rem;
}

.hint {
  font-size: 0.875rem;
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
  font-size: 6rem;
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
  
  .game-icon {
    font-size: 3rem;
  }
  
  .game-title {
    font-size: 1.5rem;
  }
  
  .start-button {
    padding: 1rem 2rem;
    font-size: 1.25rem;
  }
  
  .countdown-number {
    font-size: 4rem;
  }
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
