<script setup lang="ts">
import WeekCalendar from '@/components/ui/WeekCalendar.vue'

type ActivityFilter = 'daily' | 'all'

interface TrainingDataItem {
  minutes: number
  completed: boolean
  sessions: number
}

interface Props {
  activityFilter: ActivityFilter
  trainingData: Record<string, TrainingDataItem>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activityFilter', value: ActivityFilter): void
  (e: 'date-select', value: string): void
  (e: 'week-change', startDate: string, endDate: string): void
}>()

const setFilter = (value: ActivityFilter): void => {
  emit('update:activityFilter', value)
}

const handleWeekChange = (startDate: string, endDate: string): void => {
  emit('week-change', startDate, endDate)
}
</script>

<template>
  <div class="mb-6">
    <h2 class="text-lg font-bold text-[var(--color-text)] px-1 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-6 rounded-full bg-[var(--color-primary)]"></span>
      本週紀錄
    </h2>
    <div class="flex items-center justify-between text-sm text-[var(--color-text-secondary)] mb-3 px-1">
      <span>顯示</span>
      <div class="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-elevated)] p-1 border border-[var(--color-border)] shadow-sm">
        <button
          type="button"
          class="px-3 py-1.5 rounded-full transition-all text-sm font-medium"
          :class="props.activityFilter === 'daily'
            ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]'"
          @click="setFilter('daily')"
        >
          每日訓練
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-full transition-all text-sm font-medium"
          :class="props.activityFilter === 'all'
            ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)]'"
          @click="setFilter('all')"
        >
          全部活動
        </button>
      </div>
    </div>

    <WeekCalendar
      :training-data="props.trainingData"
      @date-select="emit('date-select', $event)"
      @week-change="handleWeekChange"
    />
  </div>
</template>
