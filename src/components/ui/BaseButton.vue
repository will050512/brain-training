<script setup lang="ts">
/**
 * 基礎按鈕組件
 * 支援多種變體、大小和深色模式
 */
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  fullWidth: false
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const baseClasses = computed(() => {
  const classes = [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-xl',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ]
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2 text-base min-h-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
    xl: 'px-8 py-4 text-xl min-h-[56px]'
  }
  classes.push(sizeClasses[props.size])
  
  // Variant classes
  const variantClasses = {
    primary: [
      'bg-blue-600 text-white',
      'hover:bg-blue-700 active:bg-blue-800',
      'focus:ring-blue-500',
      'dark:bg-blue-500 dark:hover:bg-blue-600'
    ].join(' '),
    secondary: [
      'bg-[var(--color-bg-soft)] text-[var(--color-text)]',
      'hover:bg-[var(--color-surface)] active:bg-[var(--color-bg-soft)]',
      'focus:ring-[var(--color-primary)]',
      'border border-[var(--color-border)]'
    ].join(' '),
    outline: [
      'bg-transparent text-[var(--color-primary)]',
      'border-2 border-[var(--color-primary)]',
      'hover:bg-[var(--color-primary)] hover:text-white',
      'focus:ring-[var(--color-primary)]'
    ].join(' '),
    ghost: [
      'bg-transparent text-[var(--color-text-secondary)]',
      'hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]',
      'focus:ring-[var(--color-border)]'
    ].join(' '),
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 active:bg-red-800',
      'focus:ring-red-500',
      'dark:bg-red-500 dark:hover:bg-red-600'
    ].join(' ')
  }
  classes.push(variantClasses[props.variant])
  
  // Full width
  if (props.fullWidth) {
    classes.push('w-full')
  }
  
  return classes.join(' ')
})

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :class="baseClasses"
    :disabled="isDisabled"
    @click="$emit('click', $event)"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    
    <!-- Icon -->
    <span v-if="icon && !loading" class="text-lg">{{ icon }}</span>
    
    <!-- Content -->
    <slot />
  </button>
</template>
