<script setup lang="ts">
/**
 * 基礎按鈕組件
 * 支援多種變體、大小和深色模式
 */
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'
type ButtonType = 'button' | 'submit' | 'reset'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: string
  type?: ButtonType
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  fullWidth: false,
  type: 'button'
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
  
  // Size classes (Touch target >= 44px ensured)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[length:calc(var(--font-size-base)*0.95)] min-h-[44px] min-w-[44px]',
    md: 'px-5 py-2.5 text-[length:var(--font-size-base)] min-h-[48px]',
    lg: 'px-7 py-3.5 text-[length:var(--font-size-lg)] min-h-[56px]',
    xl: 'px-9 py-4.5 text-[length:var(--font-size-xl)] min-h-[64px]'
  }
  classes.push(sizeClasses[props.size])
  
  // Variant classes
  const variantClasses = {
    primary: [
      'bg-[var(--color-primary)] text-[var(--color-text-inverse)]',
      'hover:bg-[var(--color-primary-dark)]',
      'shadow-sm hover:shadow-md active:shadow-sm',
      'active:scale-[0.98]',
      'border border-transparent'
    ].join(' '),
    secondary: [
      'bg-[var(--color-surface)] text-[var(--color-text-primary)]',
      'border border-[var(--color-border)]',
      'hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-dark)]',
      'shadow-sm',
      'active:bg-[var(--color-bg-muted)]'
    ].join(' '),
    outline: [
      'bg-transparent text-[var(--color-primary)]',
      'border-2 border-[var(--color-primary)]',
      'hover:bg-[var(--color-primary-bg)]',
      'active:bg-[var(--color-primary)] active:text-white'
    ].join(' '),
    ghost: [
      'bg-transparent text-[var(--color-text-secondary)]',
      'hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]',
      'active:bg-[var(--color-bg-muted)]'
    ].join(' '),
    danger: [
      'bg-[var(--color-danger)] text-white',
      'hover:bg-red-700',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
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
    :type="props.type"
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
