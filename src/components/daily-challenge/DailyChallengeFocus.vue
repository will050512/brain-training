<template>
  <section class="space-y-2">
    <h2 class="text-base font-bold text-[var(--color-text)] pl-3 border-l-4 border-[var(--color-primary)] flex items-center">今日訓練重點</h2>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <div
        v-for="dim in allDimensions"
        :key="dim"
        class="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 relative border border-transparent aspect-square sm:aspect-auto h-20 sm:h-auto"
        :class="coveredDimensions.has(dim) ? 'bg-[var(--color-surface)] shadow-sm border-[var(--color-border-light)] opacity-100 transform hover:-translate-y-1' : 'opacity-40 grayscale bg-[var(--color-bg-muted)]'"
        :style="{ color: coveredDimensions.has(dim) ? dimensionColors[dim] : undefined }"
      >
        <span class="text-2xl mb-1 filter drop-shadow-sm">{{ dimensionIcons[dim] }}</span>
        <span class="text-[10px] font-bold text-[var(--color-text-secondary)] mt-0.5">{{ dimensionNames[dim] }}</span>
        <div v-if="coveredDimensions.has(dim)" class="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-success)] text-[var(--color-text-inverse)] rounded-full flex items-center justify-center shadow-sm border-2 border-[var(--color-surface)] animate-fade-in">
          <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="4">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'

defineProps<{
  allDimensions: CognitiveDimension[]
  coveredDimensions: Set<CognitiveDimension>
  dimensionIcons: Record<CognitiveDimension, string>
  dimensionNames: Record<CognitiveDimension, string>
  dimensionColors: Record<CognitiveDimension, string>
}>()
</script>
