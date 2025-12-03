<script setup lang="ts">
/**
 * 空狀態組件
 * 當沒有數據或內容時顯示
 */
interface Props {
  icon?: string
  title?: string
  description?: string
  actionLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  title: '暫無內容',
  description: ''
})

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Icon -->
    <div class="text-6xl mb-4 opacity-80">
      {{ icon }}
    </div>
    
    <!-- Title -->
    <h3 class="text-lg font-semibold text-[var(--color-text)] mb-2">
      {{ title }}
    </h3>
    
    <!-- Description -->
    <p v-if="description" class="text-[var(--color-text-muted)] max-w-sm mb-6">
      {{ description }}
    </p>
    
    <!-- Action button -->
    <button
      v-if="actionLabel"
      class="px-6 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-xl
             hover:opacity-90 transition-opacity"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
    
    <!-- Custom action slot -->
    <slot name="action" />
  </div>
</template>
