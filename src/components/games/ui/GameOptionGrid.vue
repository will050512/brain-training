<script setup lang="ts">
/**
 * 遊戲選項網格元件
 * 用於顯示答題選項按鈕
 */
import { computed } from 'vue'

interface Option<T = string | number> {
  /** 選項值 */
  value: T
  /** 顯示文字 */
  label?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 額外樣式類別 */
  class?: string
}

interface Props {
  /** 選項列表 */
  options: (string | number | Option)[]
  /** 列數 */
  columns?: 2 | 3 | 4
  /** 是否禁用所有選項 */
  disabled?: boolean
  /** 已選擇的值（用於顯示選中狀態） */
  selected?: string | number | null
  /** 正確答案（用於顯示正確狀態） */
  correctAnswer?: string | number | null
  /** 顯示模式 */
  variant?: 'default' | 'large' | 'compact'
  /** 選項樣式 */
  optionStyle?: 'solid' | 'outline'
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
  disabled: false,
  selected: null,
  correctAnswer: null,
  variant: 'default',
  optionStyle: 'solid',
})

const emit = defineEmits<{
  (e: 'select', value: string | number): void
}>()

// 標準化選項
const normalizedOptions = computed(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object') {
      return {
        value: opt.value,
        label: opt.label ?? String(opt.value),
        disabled: opt.disabled ?? false,
        class: opt.class ?? '',
      }
    }
    return {
      value: opt,
      label: String(opt),
      disabled: false,
      class: '',
    }
  })
})

// 標準化選項的類型
type NormalizedOption = {
  value: string | number
  label: string
  disabled: boolean
  class: string
}

// 取得選項狀態類別
const getOptionClass = (option: NormalizedOption) => {
  const classes = [option.class]
  
  if (option.disabled || props.disabled) {
    classes.push('option-disabled')
  }
  
  if (props.selected !== null && props.selected === option.value) {
    if (props.correctAnswer !== null) {
      classes.push(props.selected === props.correctAnswer ? 'option-correct' : 'option-wrong')
    } else {
      classes.push('option-selected')
    }
  } else if (props.correctAnswer !== null && props.correctAnswer === option.value) {
    classes.push('option-correct-answer')
  }
  
  return classes.filter(Boolean).join(' ')
}

const handleSelect = (option: NormalizedOption) => {
  if (option.disabled || props.disabled) return
  emit('select', option.value)
}
</script>

<template>
  <div 
    class="option-grid"
    :class="[
      `columns-${columns}`,
      `variant-${variant}`,
      `style-${optionStyle}`
    ]"
  >
    <button
      v-for="option in normalizedOptions"
      :key="String(option.value)"
      type="button"
      class="option-button"
      :class="getOptionClass(option)"
      :disabled="option.disabled || disabled"
      @click="handleSelect(option)"
    >
      <span class="option-label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.option-grid {
  display: grid;
  gap: var(--game-gap);
  width: 100%;
}

/* 列數 */
.columns-2 {
  grid-template-columns: repeat(2, 1fr);
}

.columns-3 {
  grid-template-columns: repeat(3, 1fr);
}

.columns-4 {
  grid-template-columns: repeat(4, 1fr);
}

/* 選項按鈕 */
.option-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: clamp(1.125rem, 3vw, 1.5rem);
  min-height: var(--game-touch-min);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* 樣式變體 - 實心 */
.style-solid .option-button {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  color: var(--color-text-primary);
}

.style-solid .option-button:not(:disabled):hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.style-solid .option-button:not(:disabled):active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* 樣式變體 - 外框 */
.style-outline .option-button {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.style-outline .option-button:not(:disabled):hover {
  background: var(--color-primary);
  color: white;
}

/* 尺寸變體 */
.variant-large .option-button {
  padding: 1.25rem;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  min-height: var(--game-touch-comfort);
}

.variant-compact .option-button {
  padding: 0.75rem;
  font-size: 1rem;
}

/* 狀態 */
.option-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-selected {
  background: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  color: white !important;
  transform: scale(0.98);
}

.option-correct {
  background: var(--color-success) !important;
  border-color: var(--color-success) !important;
  color: white !important;
  animation: correct-pulse 0.3s ease-out;
}

.option-wrong {
  background: var(--color-danger) !important;
  border-color: var(--color-danger) !important;
  color: white !important;
  animation: wrong-shake 0.3s ease-out;
}

.option-correct-answer {
  border-color: var(--color-success) !important;
  box-shadow: 0 0 0 2px var(--color-success);
}

/* 選項文字 */
.option-label {
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}

/* 動畫 */
@keyframes correct-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes wrong-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 手機優化 */
@media (max-width: 640px) {
  .option-button {
    padding: 0.875rem;
    font-size: clamp(1.125rem, 3.4vw, 1.375rem);
  }
  
  .variant-large .option-button {
    padding: 1rem;
    font-size: clamp(1.375rem, 4.2vw, 1.75rem);
  }
  
  /* 手機上 4 列改為 2 列 */
  .columns-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 大螢幕 */
@media (min-width: 768px) {
  .option-button {
    padding: 1.25rem;
    font-size: 1.375rem;
  }
}
</style>
