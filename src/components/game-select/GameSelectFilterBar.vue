<template>
  <div class="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl shadow-sm">
    <div class="flex gap-2 px-3 py-2 sm:px-4 sm:py-3 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-center md:overflow-visible">
      <button
        @click="onSelect(null)"
        class="flex-shrink-0 px-4 py-2 rounded-full font-semibold transition-colors whitespace-nowrap min-h-[var(--min-touch-target)] text-[length:var(--font-size-base)]"
        :class="selectedDimension === null
          ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
          : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'"
      >
        全部
      </button>
      <button
        v-for="dim in cognitiveDimensions"
        :key="dim.id"
        @click="onSelect(dim.id)"
        class="flex-shrink-0 px-4 py-2 rounded-full font-semibold transition-colors whitespace-nowrap min-h-[var(--min-touch-target)] text-[length:var(--font-size-base)]"
        :class="selectedDimension === dim.id
          ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
          : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'"
      >
        <span class="mr-1">{{ dim.icon }}</span>
        <span class="hidden xs:inline">{{ dim.name }}</span>
        <span class="xs:hidden">{{ dim.name.slice(0, 2) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CognitiveDimensionInfo, CognitiveDimension } from '@/types/cognitive'

defineProps<{
  selectedDimension: CognitiveDimension | null
  cognitiveDimensions: CognitiveDimensionInfo[]
  onSelect: (dimension: CognitiveDimension | null) => void
}>()
</script>
