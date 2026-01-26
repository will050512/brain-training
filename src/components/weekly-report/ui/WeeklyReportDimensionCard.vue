<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { DimensionItem } from '@/types/weeklyReport'

interface Props {
  item: DimensionItem
}

defineProps<Props>()
</script>

<template>
  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl border border-[var(--color-border-light)] flex items-center gap-4 transition-transform hover:-translate-y-0.5">
    <div class="w-12 h-12 rounded-2xl bg-[var(--color-bg-soft)] flex items-center justify-center text-2xl shadow-inner shrink-0">
      {{ item.icon }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold text-[var(--color-text)]">{{ item.name }}</span>
        <div class="flex items-center gap-2">
          <span
            class="px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)]"
            :class="item.trend.class"
          >
            <SubtleLabel :text="item.trend.arrow" size="xs" weight="bold" />
            <SubtleLabel v-if="item.trend.change !== 0" :text="String(Math.abs(item.trend.change))" size="xs" weight="bold" />
          </span>
          <span class="text-xl font-black text-[var(--color-primary)]">{{ item.score }}</span>
        </div>
      </div>
      <div class="h-2.5 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000 ease-out"
          :style="{
            width: `${item.score}%`,
            backgroundColor: item.score >= 70
              ? 'var(--color-success)'
              : item.score >= 50
                ? 'var(--color-warning)'
                : 'var(--color-danger)'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>
