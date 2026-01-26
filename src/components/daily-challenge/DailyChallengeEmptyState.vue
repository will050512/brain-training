<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  onReload: () => void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center px-6">
    <div class="text-6xl mb-4 animate-bounce">📋</div>
    <div>
      <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">暫無訓練計畫</h3>
      <p class="text-[var(--color-text-secondary)]">無法生成訓練計畫，請檢查網路連線</p>
    </div>
    <BaseButton class="shadow-lg" @click="onReload">
      重新載入
    </BaseButton>
  </div>
</template>
