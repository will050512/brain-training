<script setup lang="ts">
import RadarChart from '@/components/charts/RadarChart.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import WeeklyReportDimensionCard from '@/components/weekly-report/ui/WeeklyReportDimensionCard.vue'
import WeeklyReportStatCard from '@/components/weekly-report/ui/WeeklyReportStatCard.vue'
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
          <SectionTitle title="本週統計" spacing="sm" />
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <WeeklyReportStatCard
              v-for="card in props.weekStatsCards"
              :key="card.label"
              :icon="card.icon"
              :value="card.value"
              :label="card.label"
            />
          </div>
        </section>

        <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-6 shadow-sm border border-[var(--color-border-light)]">
          <SectionTitle
            title="認知能力分布"
            accent-class="bg-[var(--color-accent-purple)]"
          />
          <div class="max-w-md mx-auto aspect-square sm:aspect-[4/3]">
            <RadarChart :scores="props.cognitiveScores" />
          </div>
        </section>
      </div>

      <section>
        <SectionTitle
          title="各維度表現"
          accent-class="bg-[var(--color-accent-teal)]"
        />
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <WeeklyReportDimensionCard
            v-for="item in props.dimensionItems"
            :key="item.key"
            :item="item"
          />
        </div>
      </section>
    </div>
  </div>
</template>
