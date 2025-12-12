<script setup lang="ts">
/**
 * TipBanner - 提示橫幅組件
 * 用於顯示提示、建議或注意事項
 */

defineProps<{
  /** 提示類型 */
  type?: 'info' | 'success' | 'warning' | 'tip'
  /** 標題 */
  title?: string
  /** 是否可關閉 */
  dismissible?: boolean
  /** 圖示（可選，預設根據 type 決定） */
  icon?: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const typeStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  tip: 'bg-purple-50 border-purple-200 text-purple-800',
}

const typeIcons = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  tip: '💭',
}
</script>

<template>
  <div
    :class="[
      'rounded-lg border p-4 flex items-start gap-3',
      typeStyles[type || 'info']
    ]"
    role="alert"
  >
    <span class="text-xl flex-shrink-0">
      {{ icon || typeIcons[type || 'info'] }}
    </span>
    <div class="flex-1 min-w-0">
      <p v-if="title" class="font-medium mb-1">{{ title }}</p>
      <div class="text-sm opacity-90">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      aria-label="關閉"
      @click="emit('dismiss')"
    >
      ✕
    </button>
  </div>
</template>
