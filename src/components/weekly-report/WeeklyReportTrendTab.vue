<script setup lang="ts">
import TrendChart from '@/components/charts/TrendChart.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import WeeklyReportActivityDayTile from '@/components/weekly-report/ui/WeeklyReportActivityDayTile.vue'
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
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)]">
      <SectionTitle title="分數趨勢" />
      <div class="h-64 w-full">
        <TrendChart :history="props.scoreHistory" />
      </div>
    </section>

    <section>
      <SectionTitle
        title="每日活動分布"
        accent-class="bg-[var(--color-accent-warm)]"
      />
      <div class="grid grid-cols-7 gap-2">
        <WeeklyReportActivityDayTile
          v-for="(count, index) in props.dailyActivityCounts"
          :key="index"
          :label="props.dayLabels[index] ?? ''"
          :count="count"
        />
      </div>
    </section>
  </div>
</template>
