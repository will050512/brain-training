<template>
  <div class="grid grid-cols-2 gap-1 p-1 bg-[var(--color-surface-soft)] rounded-xl">
    <button
      class="btn btn-sm min-h-[40px] border-0"
      :class="!showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
      @click="onToggle(false)"
    >
      📌 個人化建議 ({{ activeCount }})
    </button>
    <button
      class="btn btn-sm min-h-[40px] border-0"
      :class="showAllSupplements ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:bg-surface/50'"
      @click="onToggle(true)"
    >
      📚 所有營養素
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showAllSupplements: boolean
  activeCount: number
  onToggle: (value: boolean) => void
}>()
</script>
