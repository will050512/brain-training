<script setup lang="ts">
/**
 * 遊戲計時器元件
 * 顯示倒數計時或正計時，支援警告狀態
 */
import { computed } from 'vue'

interface Props {
  /** 當前時間（秒） */
  time: number
  /** 總時間（秒），用於計算進度 */
  totalTime?: number
  /** 警告時間閾值（秒） */
  warningThreshold?: number
  /** 是否顯示進度條 */
  showProgress?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否為倒數模式 */
  countdown?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  totalTime: 60,
  warningThreshold: 10,
  showProgress: true,
  size: 'md',
  countdown: true,
})

// 格式化時間
const formattedTime = computed(() => {
  const totalSeconds = Math.max(0, Math.ceil(props.time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// 是否處於警告狀態
const isWarning = computed(() => 
  props.countdown && props.time <= props.warningThreshold && props.time > 0
)

// 進度百分比
const progressPercent = computed(() => {
  if (!props.totalTime) return 100
  return props.countdown 
    ? (props.time / props.totalTime) * 100
    : Math.min(100, (props.time / props.totalTime) * 100)
})

// 尺寸類別
const sizeClasses = computed(() => ({
  'timer-sm': props.size === 'sm',
  'timer-md': props.size === 'md',
  'timer-lg': props.size === 'lg',
}))
</script>

<template>
  <div 
    class="game-timer" 
    :class="[sizeClasses, { 'is-warning': isWarning }]"
  >
    <!-- 時間顯示 -->
    <div class="timer-display">
      <span class="timer-icon">⏱️</span>
      <span class="timer-value">{{ formattedTime }}</span>
    </div>
    
    <!-- 進度條 -->
    <div v-if="showProgress" class="timer-progress">
      <div 
        class="timer-progress-bar"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.game-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.timer-icon {
  font-size: 1.25em;
}

.timer-value {
  font-family: var(--font-sans);
  font-weight: 700;
  color: var(--color-text);
}

/* 尺寸變體 */
.timer-sm .timer-value {
  font-size: 1rem;
}

.timer-md .timer-value {
  font-size: 1.5rem;
}

.timer-lg .timer-value {
  font-size: 2rem;
}

/* 警告狀態 */
.is-warning .timer-display {
  background: var(--color-danger-bg);
  animation: pulse-warning 1s ease-in-out infinite;
}

.is-warning .timer-value {
  color: var(--color-danger);
}

@keyframes pulse-warning {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 進度條 */
.timer-progress {
  width: 100%;
  height: 4px;
  background: var(--color-bg-muted);
  border-radius: 2px;
  overflow: hidden;
}

.timer-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
  transition: width 1s linear;
}

.is-warning .timer-progress-bar {
  background: linear-gradient(90deg, var(--color-danger), var(--color-warning));
}

/* 響應式 */
@media (max-width: 640px) {
  .timer-md .timer-value {
    font-size: 1.25rem;
  }
  
  .timer-lg .timer-value {
    font-size: 1.5rem;
  }
}
</style>
