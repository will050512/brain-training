<script setup lang="ts">
/**
 * 基礎卡片組件
 * 支援多種樣式、密度和深色模式
 */
import { computed } from 'vue'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'action' | 'data' | 'status'
type CardDensity = 'compact' | 'normal' | 'relaxed'

interface Props {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  density?: CardDensity
  hoverable?: boolean
  clickable?: boolean
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  density: 'normal',
  hoverable: false,
  clickable: false,
  active: false
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const cardClasses = computed(() => {
  const classes = [
    'rounded-2xl',
    'transition-all duration-200 ease-out',
    'relative',
    'overflow-hidden'
  ]
  
  // Density overrides padding if specified implicitly by logic or explicitly
  // Mapping density to padding classes if we want to unify
  const densityMap = {
    compact: 'p-3',
    normal: 'p-4 sm:p-5',
    relaxed: 'p-6 sm:p-8'
  }
  
  // Legacy padding support (priority to specific padding prop if it differs from default 'md' when density is 'normal')
  // But for simplicity, let's use density map if available, falling back to padding prop logic
  if (props.padding !== 'md') {
     const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-8'
    }
    classes.push(paddingClasses[props.padding])
  } else {
    classes.push(densityMap[props.density])
  }
  
  // Variant classes
  const variantClasses: Record<CardVariant, string> = {
    default: 'bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-sm',
    elevated: 'bg-[var(--color-surface)] shadow-md border-transparent',
    outlined: 'bg-transparent border-2 border-[var(--color-border)]',
    filled: 'bg-[var(--color-bg-soft)] border-transparent',
    action: 'bg-[var(--color-surface)] border-2 border-transparent hover:border-[var(--color-primary-light)] shadow-sm hover:shadow-md cursor-pointer',
    data: 'bg-[var(--color-surface)] border border-[var(--color-border-light)] shadow-sm flex flex-col justify-between',
    status: 'bg-[var(--color-surface)] border-l-4 border-[var(--color-primary)] shadow-sm'
  }
  
  classes.push(variantClasses[props.variant])
  
  // Hoverable
  if (props.hoverable || props.variant === 'action') {
    classes.push('hover:-translate-y-1 hover:shadow-md')
  }
  
  // Clickable
  if (props.clickable || props.variant === 'action') {
    classes.push('cursor-pointer active:scale-[0.98]')
  }

  // Active state
  if (props.active) {
    classes.push('ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg)]')
  }
  
  return classes.join(' ')
})
</script>

<template>
  <div
    :class="cardClasses"
    @click="(clickable || variant === 'action') ? $emit('click', $event) : null"
    role="article"
  >
    <!-- Background decoration for data variant -->
    <div v-if="variant === 'data'" class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
      <slot name="icon" />
    </div>

    <!-- Header slot -->
    <div v-if="$slots.header" :class="['mb-2', density === 'compact' ? 'mb-2' : 'mb-4']">
      <slot name="header" />
    </div>
    
    <!-- Default content -->
    <div class="relative z-10">
      <slot />
    </div>
    
    <!-- Footer slot -->
    <div v-if="$slots.footer" :class="['mt-4 pt-4 border-t border-[var(--color-border-light)]', density === 'compact' ? 'mt-2 pt-2' : '']">
      <slot name="footer" />
    </div>
  </div>
</template>
