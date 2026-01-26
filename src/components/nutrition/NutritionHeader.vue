<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  onBack: () => void
}>()
</script>

<template>
  <header class="flex items-center gap-3 min-h-[44px]">
    <BaseButton
      variant="ghost"
      size="sm"
      class="rounded-full w-11 h-11"
      @click="onBack"
    >
      <span class="text-xl">←</span>
    </BaseButton>
    <h1 class="text-xl font-bold m-0 text-primary">🥗 營養建議</h1>
  </header>
</template>
