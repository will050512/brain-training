<template>
  <header class="app-header flex-col items-stretch gap-2 !h-auto py-4 border-b-0 shadow-none bg-transparent">
    <div class="flex items-center justify-between px-1">
      <SubtleLabel :text="stepTitle" tone="muted" weight="bold" />
      <SubtleLabel :text="`${Math.round(progress)}%`" weight="bold" class="text-[var(--color-primary)]" />
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
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineProps<{
  stepTitle: string
  progress: number
}>()
</script>
