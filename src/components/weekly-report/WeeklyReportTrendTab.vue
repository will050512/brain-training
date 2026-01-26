<script setup lang="ts">
import TrendChart from '@/components/charts/TrendChart.vue'
import type { ScoreHistory } from '@/services/scoreCalculator'
import type { DailyActivityCounts, DailyActivityLabels } from '@/types/weeklyReport'

interface Props {
  scoreHistory: ScoreHistory[]
  dailyActivityCounts: DailyActivityCounts
  dayLabels?: DailyActivityLabels
}

const props = withDefaults(defineProps<Props>(), {
  dayLabels: () => ['日', '一', '二', '三', '四', '五', '六']
})

const isActiveDay = (count: number): boolean => count > 0
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
      <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
        <span class="w-1.5 h-5 rounded-full bg-[var(--color-primary)]"></span>
        分數趨勢
      </h2>
      <div class="h-64 w-full">
        <TrendChart :history="props.scoreHistory" />
      </div>
    </section>

    <section>
      <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
        <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-warm)]"></span>
        每日活動分布
      </h2>
      <div class="grid grid-cols-7 gap-2">
        <div
          v-for="(count, index) in props.dailyActivityCounts"
          :key="index"
          class="aspect-[3/4] rounded-xl flex flex-col items-center justify-center border transition-all"
          :class="isActiveDay(count)
            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm scale-105'
            : 'bg-[var(--color-surface-elevated)] border-[var(--color-border-light)] opacity-60'"
        >
          <span
            class="text-xs font-bold mb-1"
            :class="isActiveDay(count) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'"
          >
            {{ props.dayLabels[index] }}
          </span>
          <span class="text-xl font-black text-[var(--color-text)]">{{ count }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
