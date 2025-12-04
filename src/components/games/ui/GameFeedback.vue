<script setup lang="ts">
/**
 * 遊戲回饋元件
 * 顯示答題結果回饋（正確/錯誤/連擊等）
 */
import { computed, watch } from 'vue'
import type { FeedbackType } from '@/games/core/gameTypes'

interface Props {
  /** 回饋類型 */
  type: FeedbackType
  /** 是否顯示 */
  show: boolean
  /** 訊息文字 */
  message?: string
  /** 獲得分數 */
  score?: number
  /** 連擊數 */
  combo?: number
  /** 正確答案（錯誤時顯示） */
  correctAnswer?: string
  /** 自動隱藏時間（毫秒），0 為不自動隱藏 */
  autoHideDuration?: number
  /** 位置 */
  position?: 'center' | 'top' | 'bottom'
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  autoHideDuration: 1000,
  position: 'center',
  size: 'md',
})

const emit = defineEmits<{
  (e: 'hidden'): void
}>()

// 圖示映射
const iconMap: Record<NonNullable<FeedbackType>, string> = {
  correct: '✓',
  wrong: '✗',
  timeout: '⏱️',
  perfect: '⭐',
  combo: '🔥',
}

// 預設訊息
const defaultMessages: Record<NonNullable<FeedbackType>, string> = {
  correct: '正確！',
  wrong: '錯誤',
  timeout: '時間到',
  perfect: '完美！',
  combo: '連擊！',
}

// 計算顯示內容
const displayIcon = computed(() => props.type ? iconMap[props.type] : '')
const displayMessage = computed(() => props.message || (props.type ? defaultMessages[props.type] : ''))

// 自動隱藏
watch(() => props.show, (newVal) => {
  if (newVal && props.autoHideDuration > 0) {
    setTimeout(() => {
      emit('hidden')
    }, props.autoHideDuration)
  }
})
</script>

<template>
  <Transition name="feedback">
    <div 
      v-if="show && type"
      class="game-feedback"
      :class="[
        `feedback-${type}`,
        `position-${position}`,
        `size-${size}`
      ]"
    >
      <!-- 圖示 -->
      <span class="feedback-icon">{{ displayIcon }}</span>
      
      <!-- 訊息 -->
      <span class="feedback-message">{{ displayMessage }}</span>
      
      <!-- 分數 -->
      <span v-if="score && score > 0" class="feedback-score">
        +{{ score }}
      </span>
      
      <!-- 連擊數 -->
      <span v-if="combo && combo > 1" class="feedback-combo">
        {{ combo }}x 連擊
      </span>
      
      <!-- 正確答案 -->
      <span v-if="type === 'wrong' && correctAnswer" class="feedback-correct-answer">
        正確答案：{{ correctAnswer }}
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.game-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: var(--radius-xl);
  font-weight: 600;
  z-index: 100;
}

/* 位置 */
.position-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.position-top {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
}

.position-bottom {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
}

/* 尺寸 */
.size-sm {
  padding: 0.5rem 1rem;
}

.size-sm .feedback-icon {
  font-size: 1.5rem;
}

.size-sm .feedback-message {
  font-size: 1rem;
}

.size-md .feedback-icon {
  font-size: 2.5rem;
}

.size-md .feedback-message {
  font-size: 1.25rem;
}

.size-lg .feedback-icon {
  font-size: 3.5rem;
}

.size-lg .feedback-message {
  font-size: 1.5rem;
}

/* 類型樣式 */
.feedback-correct {
  background: var(--gradient-result-good);
  color: var(--color-success);
  border: 2px solid var(--color-success);
}

.feedback-wrong {
  background: var(--gradient-result-danger);
  color: var(--color-danger);
  border: 2px solid var(--color-danger);
  animation: shake 0.3s ease-in-out;
}

.feedback-timeout {
  background: var(--gradient-result-warning);
  color: var(--color-warning);
  border: 2px solid var(--color-warning);
}

.feedback-perfect {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #b45309;
  border: 2px solid #f59e0b;
  animation: perfect-glow 0.5s ease-out;
}

.feedback-combo {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  border: none;
  animation: combo-bounce 0.3s ease-out;
}

.feedback-icon {
  line-height: 1;
}

.feedback-message {
  font-weight: 700;
}

.feedback-score {
  font-size: 1.25em;
  font-weight: 700;
  color: inherit;
  opacity: 0.9;
}

.feedback-combo {
  font-size: 0.875em;
  opacity: 0.9;
}

.feedback-correct-answer {
  font-size: 0.875em;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 0.25rem;
}

/* 動畫 */
@keyframes shake {
  0%, 100% { transform: translate(-50%, -50%); }
  25% { transform: translate(calc(-50% - 5px), -50%); }
  75% { transform: translate(calc(-50% + 5px), -50%); }
}

@keyframes perfect-glow {
  0% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8); }
  100% { box-shadow: 0 0 0 transparent; }
}

@keyframes combo-bounce {
  0% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

/* 進入/離開動畫 */
.feedback-enter-active {
  animation: feedback-in 0.2s ease-out;
}

.feedback-leave-active {
  animation: feedback-out 0.2s ease-in;
}

@keyframes feedback-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes feedback-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}

/* 手機優化 */
@media (max-width: 640px) {
  .game-feedback {
    padding: 0.75rem 1.5rem;
  }
  
  .size-md .feedback-icon {
    font-size: 2rem;
  }
  
  .size-md .feedback-message {
    font-size: 1rem;
  }
}
</style>
