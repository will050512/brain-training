<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  showAllSupplements: boolean
  activeCount: number
  onToggle: (value: boolean) => void
}>()
</script>

<template>
  <div class="grid grid-cols-2 gap-1 p-1 bg-[var(--color-surface-soft)] rounded-xl">
    <BaseButton
      size="sm"
      variant="ghost"
      class="min-h-[40px] border-0"
      :class="!showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
      @click="onToggle(false)"
    >
      📌 個人化建議 ({{ activeCount }})
    </BaseButton>
    <BaseButton
      size="sm"
      variant="ghost"
      class="min-h-[40px] border-0"
      :class="showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
      @click="onToggle(true)"
    >
      📚 所有營養素
    </BaseButton>
  </div>
</template>
