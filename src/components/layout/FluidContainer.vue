<script setup lang="ts">
import { computed } from 'vue'

/**
 * 流體佈局容器元件
 * 使用 clamp() 函數實現真正的流體設計
 * 替換固定寬度限制，提供更好的響應式體驗
 */

interface Props {
  /** 容器尺寸變體 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  /** 是否為遊戲容器 */
  game?: boolean
  /** 自定義最大寬度 */
  maxWidth?: string
  /** 自定義最小寬度 */
  minWidth?: string
  /** 自定義內邊距 */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** 是否居中 */
  center?: boolean
  /** 是否安全區域填充 */
  safeArea?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'lg',
  game: false,
  center: true,
  safeArea: false
})

// 計算容器類別
const containerClass = computed(() => {
  const classes = []

  if (props.game) {
    classes.push(`game-container-${props.size}`)
  } else {
    classes.push(`container-${props.size}`)
  }

  if (props.center) {
    classes.push('mx-auto')
  }

  if (props.padding) {
    classes.push(`p-fluid-${props.padding}`)
  }

  if (props.safeArea) {
    classes.push('safe-area-all')
  }

  return classes.join(' ')
})

// 自定義樣式
const containerStyle = computed(() => {
  const style: Record<string, string> = {}

  if (props.maxWidth) {
    style.maxWidth = props.maxWidth
  }

  if (props.minWidth) {
    style.minWidth = props.minWidth
  }

  return style
})
</script>

<template>
  <div
    class="fluid-container"
    :class="containerClass"
    :style="containerStyle"
  >
    <slot />
  </div>
</template>

<style scoped>
.fluid-container {
  width: 100%;
  overflow-x: hidden;
}

/* 確保內容不會溢出 */
.fluid-container > * {
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}
</style>