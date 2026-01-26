<script setup lang="ts">
/**
 * 基礎輸入框組件
 * 支援多種類型和深色模式
 */
import { computed } from 'vue'

type InputSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  size?: InputSize
  disabled?: boolean
  error?: string
  label?: string
  hint?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const inputClasses = computed(() => {
  const classes = [
    'w-full rounded-xl min-h-[var(--min-touch-target)]',
    'bg-[var(--color-surface)]',
    'border-2',
    'text-[var(--color-text)]',
    'placeholder:text-[var(--color-text-muted)]',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ]
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-[length:calc(var(--font-size-base)*0.95)]',
    md: 'px-4 py-2.5 text-[length:var(--font-size-base)]',
    lg: 'px-5 py-3 text-[length:var(--font-size-lg)]'
  }
  classes.push(sizeClasses[props.size])
  
  // Error state
  if (props.error) {
    classes.push('border-red-500 focus:border-red-500 focus:ring-red-500/20')
  } else {
    classes.push('border-[var(--color-border)] focus:border-blue-500 focus:ring-blue-500/20')
  }
  
  // Icon padding
  if (props.icon) {
    classes.push('pl-11')
  }
  
  return classes.join(' ')
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value)
}
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" class="block mb-2 text-[length:var(--font-size-base)] font-medium text-[var(--color-text)]">
      {{ label }}
    </label>
    
    <!-- Input wrapper -->
    <div class="relative">
      <!-- Icon -->
      <span
        v-if="icon"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[var(--color-text-muted)]"
      >
        {{ icon }}
      </span>
      
      <!-- Input -->
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="inputClasses"
        @input="handleInput"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
    </div>
    
    <!-- Error message -->
    <p v-if="error" class="mt-1.5 text-[length:calc(var(--font-size-base)*0.95)] text-red-500 dark:text-red-400">
      {{ error }}
    </p>
    
    <!-- Hint -->
    <p v-else-if="hint" class="mt-1.5 text-[length:calc(var(--font-size-base)*0.95)] text-[var(--color-text-muted)]">
      {{ hint }}
    </p>
  </div>
</template>
