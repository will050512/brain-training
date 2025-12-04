<script setup lang="ts">
/**
 * 遊戲進度條元件
 * 顯示回合進度或完成百分比
 */
import { computed } from 'vue'

interface Props {
  /** 當前值 */
  current: number
  /** 最大值 */
  total: number
  /** 是否顯示文字 */
  showLabel?: boolean
  /** 標籤格式 */
  labelFormat?: 'fraction' | 'percent' | 'custom'
  /** 自訂標籤 */
  customLabel?: string
  /** 顏色主題 */
  color?: 'primary' | 'success' | 'warning' | 'danger'
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否顯示動畫 */
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  labelFormat: 'fraction',
  color: 'primary',
  size: 'md',
  animated: true,
})

// 進度百分比
const percent = computed(() => {
  if (props.total <= 0) return 0
  return Math.min(100, Math.round((props.current / props.total) * 100))
})

// 標籤文字
const label = computed(() => {
  if (props.customLabel) return props.customLabel
  
  switch (props.labelFormat) {
    case 'fraction':
      return `${props.current} / ${props.total}`
    case 'percent':
      return `${percent.value}%`
    default:
      return `${props.current} / ${props.total}`
  }
})

// 顏色類別
const colorClass = computed(() => `progress-${props.color}`)

// 尺寸類別
const sizeClass = computed(() => `progress-${props.size}`)
</script>

<template>
  <div class="game-progress" :class="[sizeClass]">
    <!-- 標籤 -->
    <div v-if="showLabel" class="progress-label">
      <span class="progress-text">{{ label }}</span>
    </div>
    
    <!-- 進度條 -->
    <div class="progress-track">
      <div 
        class="progress-bar"
        :class="[colorClass, { animated }]"
        :style="{ width: `${percent}%` }"
        role="progressbar"
        :aria-valuenow="current"
        :aria-valuemin="0"
        :aria-valuemax="total"
      >
        <!-- 發光效果 -->
        <div v-if="animated" class="progress-glow"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-progress {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.progress-track {
  width: 100%;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* 顏色變體 */
.progress-primary {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
}

.progress-success {
  background: linear-gradient(90deg, var(--color-success), #4ade80);
}

.progress-warning {
  background: linear-gradient(90deg, var(--color-warning), #fbbf24);
}

.progress-danger {
  background: linear-gradient(90deg, var(--color-danger), #f87171);
}

/* 尺寸變體 */
.progress-sm .progress-track {
  height: 4px;
}

.progress-md .progress-track {
  height: 8px;
}

.progress-lg .progress-track {
  height: 12px;
}

/* 動畫效果 */
.progress-bar.animated .progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
