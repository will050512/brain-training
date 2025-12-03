<script setup lang="ts">
/**
 * 基礎卡片組件
 * 支援多種樣式和深色模式
 */
import { computed } from 'vue'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled'

interface Props {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hoverable: false,
  clickable: false
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const cardClasses = computed(() => {
  const classes = [
    'rounded-2xl',
    'transition-all duration-200'
  ]
  
  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }
  classes.push(paddingClasses[props.padding])
  
  // Variant classes
  const variantClasses = {
    default: [
      'bg-[var(--color-surface)]',
      'border border-[var(--color-border)]'
    ].join(' '),
    elevated: [
      'bg-[var(--color-surface)]',
      'shadow-lg shadow-black/5',
      'dark:shadow-black/20'
    ].join(' '),
    outlined: [
      'bg-transparent',
      'border-2 border-[var(--color-border)]'
    ].join(' '),
    filled: [
      'bg-[var(--color-bg-soft)]'
    ].join(' ')
  }
  classes.push(variantClasses[props.variant])
  
  // Hoverable
  if (props.hoverable) {
    classes.push('hover:shadow-xl hover:-translate-y-1')
  }
  
  // Clickable
  if (props.clickable) {
    classes.push('cursor-pointer')
  }
  
  return classes.join(' ')
})
</script>

<template>
  <div
    :class="cardClasses"
    @click="clickable ? $emit('click', $event) : null"
  >
    <!-- Header slot -->
    <div v-if="$slots.header" class="mb-4">
      <slot name="header" />
    </div>
    
    <!-- Default content -->
    <slot />
    
    <!-- Footer slot -->
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-[var(--color-border)]">
      <slot name="footer" />
    </div>
  </div>
</template>
