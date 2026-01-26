<script setup lang="ts">
import RadarChart from '@/components/charts/RadarChart.vue'
import type { CognitiveScores } from '@/types/cognitive'
import type { DimensionItem, WeekStatsCard } from '@/types/weeklyReport'

interface Props {
  weekStatsCards: WeekStatsCard[]
  cognitiveScores: CognitiveScores
  dimensionItems: DimensionItem[]
}

const props = defineProps<Props>()
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="space-y-6">
        <section>
          <h2 class="text-lg font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-[var(--color-primary)]"></span>
            本週統計
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="card in props.weekStatsCards"
              :key="card.label"
              class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center"
            >
              <span class="text-2xl mb-2">{{ card.icon }}</span>
              <span class="text-2xl font-black text-[var(--color-text)]">{{ card.value }}</span>
              <span class="text-xs font-medium text-[var(--color-text-secondary)]">{{ card.label }}</span>
            </div>
          </div>
        </section>

        <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-6 shadow-sm border border-[var(--color-border-light)]">
          <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-purple)]"></span>
            認知能力分布
          </h2>
          <div class="max-w-md mx-auto aspect-square sm:aspect-[4/3]">
            <RadarChart :scores="props.cognitiveScores" />
          </div>
        </section>
      </div>

      <section>
        <h2 class="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span class="w-1.5 h-5 rounded-full bg-[var(--color-accent-teal)]"></span>
          各維度表現
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div
            v-for="item in props.dimensionItems"
            :key="item.key"
            class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl border border-[var(--color-border-light)] flex items-center gap-4 transition-transform hover:-translate-y-0.5"
          >
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-bg-soft)] flex items-center justify-center text-2xl shadow-inner shrink-0">
              {{ item.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-[var(--color-text)]">{{ item.name }}</span>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)]"
                    :class="item.trend.class"
                  >
                    {{ item.trend.arrow }}
                    <span v-if="item.trend.change !== 0">
                      {{ Math.abs(item.trend.change) }}
                    </span>
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
        </div>
      </section>
    </div>
  </div>
</template>
