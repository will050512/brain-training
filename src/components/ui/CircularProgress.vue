<template>
  <div class="circular-progress" :style="containerStyle">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- 背景圓環 -->
      <circle
        class="progress-background"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="trackColor"
        :stroke-width="strokeWidth"
        fill="none"
      />
      <!-- 進度圓環 -->
      <circle
        class="progress-bar"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="progressColor"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :stroke-linecap="lineCap"
        fill="none"
        :style="progressStyle"
      />
    </svg>
    
    <!-- 中央內容 -->
    <div class="progress-content" :style="contentStyle">
      <slot>
        <div class="default-content">
          <span class="progress-value" :style="valueStyle">{{ displayValue }}</span>
          <span v-if="showLabel" class="progress-label" :style="labelStyle">{{ label }}</span>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 進度值 (0-100) */
  value: number
  /** 最大值 */
  max?: number
  /** 圓環大小 (px) */
  size?: number
  /** 線條寬度 (px) */
  strokeWidth?: number
  /** 進度條顏色 */
  progressColor?: string
  /** 軌道顏色 */
  trackColor?: string
  /** 是否顯示標籤 */
  showLabel?: boolean
  /** 標籤文字 */
  label?: string
  /** 顯示百分比還是數值 */
  showPercentage?: boolean
  /** 線條端點樣式 */
  lineCap?: 'round' | 'square' | 'butt'
  /** 動畫時長 (ms) */
  animationDuration?: number
  /** 是否啟用動畫 */
  animated?: boolean
  /** 自訂顯示值 */
  displayText?: string
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  size: 120,
  strokeWidth: 8,
  progressColor: '#667eea',
  trackColor: '#e5e7eb',
  showLabel: false,
  label: '',
  showPercentage: true,
  lineCap: 'round',
  animationDuration: 600,
  animated: true,
  displayText: undefined
})

// 計算中心點和半徑
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

// 計算進度百分比
const percentage = computed(() => {
  const clampedValue = Math.min(Math.max(props.value, 0), props.max)
  return (clampedValue / props.max) * 100
})

// 計算 stroke-dashoffset
const dashOffset = computed(() => {
  return circumference.value * (1 - percentage.value / 100)
})

// 顯示的值
const displayValue = computed(() => {
  if (props.displayText !== undefined) {
    return props.displayText
  }
  if (props.showPercentage) {
    return `${Math.round(percentage.value)}%`
  }
  return `${props.value}/${props.max}`
})

// 樣式
const containerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  position: 'relative' as const,
}))

const progressStyle = computed(() => ({
  transform: 'rotate(-90deg)',
  transformOrigin: 'center',
  transition: props.animated ? `stroke-dashoffset ${props.animationDuration}ms ease-out` : 'none',
}))

const contentStyle = computed(() => ({
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
}))

const valueStyle = computed(() => ({
  fontSize: `${props.size * 0.2}px`,
  fontWeight: '700',
  lineHeight: '1.2',
}))

const labelStyle = computed(() => ({
  fontSize: `${props.size * 0.11}px`,
  opacity: 0.7,
  marginTop: '2px',
}))
</script>

<style scoped>
.circular-progress {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.progress-background {
  opacity: 0.3;
}

.progress-bar {
  will-change: stroke-dashoffset;
}

.default-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.progress-value {
  color: var(--color-text-primary, #1f2937);
}

.progress-label {
  color: var(--color-text-secondary, #6b7280);
}

/* 深色模式 */
:global(.dark) .progress-value {
  color: #f9fafb;
}

:global(.dark) .progress-label {
  color: #9ca3af;
}
</style>
