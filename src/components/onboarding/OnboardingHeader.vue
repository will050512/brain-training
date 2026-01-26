<template>
  <header class="app-header flex-col items-stretch gap-2 !h-auto py-4 border-b-0 shadow-none bg-transparent">
    <div class="flex items-center justify-between px-1">
      <span class="text-sm font-semibold" style="color: var(--color-text-muted)">{{ stepTitle }}</span>
      <span class="text-xs font-bold" style="color: var(--color-primary)">{{ Math.round(progress) }}%</span>
    </div>
    <div class="h-1.5 w-full bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: progress + '%', backgroundColor: 'var(--color-primary)' }"
      ></div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  stepTitle: string
  progress: number
}>()
</script>
