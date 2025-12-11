<script setup lang="ts">
/**
 * 遊戲狀態列元件
 * 顯示時間、分數、進度等遊戲狀態資訊
 */
import { computed } from 'vue'
import GameTimer from './GameTimer.vue'
import GameProgress from './GameProgress.vue'

interface Props {
  /** 剩餘時間（秒） */
  timeLeft?: number
  /** 總時間（秒） */
  totalTime?: number
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
  /** 是否顯示計時器 */
  showTimer?: boolean
  /** 是否顯示進度 */
  showProgress?: boolean
  /** 是否顯示分數 */
  showScore?: boolean
  /** 是否顯示正確/錯誤計數 */
  showCounts?: boolean
  /** 是否顯示連擊 */
  showCombo?: boolean
  /** 佈局方向 */
  layout?: 'horizontal' | 'vertical'
  /** 是否緊湊模式（手機） */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  timeLeft: 0,
  totalTime: 60,
  currentRound: 0,
  totalRounds: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  combo: 0,
  showTimer: true,
  showProgress: true,
  showScore: true,
  showCounts: true,
  showCombo: false,
  layout: 'horizontal',
  compact: false,
})

// 進度百分比
const progressPercent = computed(() => {
  if (props.totalRounds <= 0) return 0
  return Math.round((props.currentRound / props.totalRounds) * 100)
})
</script>

<template>
  <div 
    class="game-status-bar"
    :class="{ 
      'layout-vertical': layout === 'vertical',
      'is-compact': compact 
    }"
  >
    <!-- 計時器 -->
    <div v-if="showTimer" class="status-item timer-item">
      <GameTimer
        :time="timeLeft"
        :total-time="totalTime"
        :show-progress="false"
        :size="compact ? 'sm' : 'md'"
      />
    </div>

    <!-- 進度/回合 -->
    <div v-if="showProgress && totalRounds > 0" class="status-item progress-item">
      <span class="status-label">{{ compact ? '題' : '題目' }}</span>
      <span class="status-value">{{ currentRound }} / {{ totalRounds }}</span>
    </div>

    <!-- 分數 -->
    <div v-if="showScore" class="status-item score-item">
      <span class="status-label">{{ compact ? '分' : '分數' }}</span>
      <span class="status-value score-value">{{ score }}</span>
    </div>

    <!-- 正確/錯誤計數 -->
    <div v-if="showCounts" class="status-item counts-item">
      <span class="correct-count">
        <span class="count-icon">✓</span>
        <span class="count-value">{{ correctCount }}</span>
      </span>
      <span class="wrong-count">
        <span class="count-icon">✗</span>
        <span class="count-value">{{ wrongCount }}</span>
      </span>
    </div>

    <!-- 連擊 -->
    <div v-if="showCombo && combo > 0" class="status-item combo-item">
      <span class="combo-label">🔥</span>
      <span class="combo-value">{{ combo }}x</span>
    </div>
  </div>
</template>

<style scoped>
.game-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.layout-vertical {
  flex-direction: column;
  align-items: stretch;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.layout-vertical .status-item {
  flex-direction: row;
  justify-content: space-between;
}

.status-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.score-value {
  color: var(--color-primary);
}

/* 正確/錯誤計數 */
.counts-item {
  flex-direction: row;
  gap: 1rem;
}

.correct-count,
.wrong-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.count-icon {
  font-size: 0.875rem;
}

.correct-count .count-icon {
  color: var(--color-success);
}

.wrong-count .count-icon {
  color: var(--color-danger);
}

.count-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.correct-count .count-value {
  color: var(--color-success);
}

.wrong-count .count-value {
  color: var(--color-danger);
}

/* 連擊 */
.combo-item {
  flex-direction: row;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  border-radius: var(--radius-full);
  animation: combo-pulse 0.5s ease-out;
}

.combo-label {
  font-size: 1rem;
}

.combo-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
}

@keyframes combo-pulse {
  0% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 緊湊模式 */
.is-compact {
  padding: 0.5rem 0.75rem;
  gap: 0.75rem;
}

.is-compact .status-value {
  font-size: 1rem;
}

.is-compact .count-value {
  font-size: 1rem;
}

/* 響應式 */
@media (max-width: 640px) {
  .game-status-bar {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .status-label {
    font-size: 0.75rem;
  }
  
  .status-value {
    font-size: 1.25rem;
  }
  
  .counts-item {
    gap: 0.5rem;
  }
}
</style>
