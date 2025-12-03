<script setup lang="ts">
/**
 * 載入中旋轉動畫組件
 * 支援多種大小和深色模式
 */
import { computed } from 'vue'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  size?: SpinnerSize
  color?: string
  label?: string
  fullScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  fullScreen: false
})

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }
  return sizes[props.size]
})

const strokeColor = computed(() => props.color || 'currentColor')
</script>

<template>
  <!-- Full screen overlay -->
  <div
    v-if="fullScreen"
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-background)]/80 backdrop-blur-sm"
  >
    <svg
      :class="['animate-spin text-[var(--color-primary)]', sizeClasses]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        :stroke="strokeColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        :fill="strokeColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <p v-if="label" class="mt-4 text-[var(--color-text-secondary)]">
      {{ label }}
    </p>
  </div>
  
  <!-- Inline spinner -->
  <div v-else class="inline-flex flex-col items-center justify-center gap-2">
    <svg
      :class="['animate-spin text-[var(--color-primary)]', sizeClasses]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        :stroke="strokeColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        :fill="strokeColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span v-if="label" class="text-sm text-[var(--color-text-muted)]">
      {{ label }}
    </span>
  </div>
</template>
