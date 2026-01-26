<script setup lang="ts">
import type { WeeklyReportActivityFilter } from '@/types/weeklyReport'

interface Props {
  weekRange: string
  activityFilter: WeeklyReportActivityFilter
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activityFilter', value: WeeklyReportActivityFilter): void
}>()

const setFilter = (value: WeeklyReportActivityFilter): void => {
  emit('update:activityFilter', value)
}
</script>

<template>
  <div class="bg-[var(--color-surface-elevated)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-light)]">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="text-center sm:text-left">
        <div class="text-sm text-[var(--color-text-secondary)] mb-1">本週範圍</div>
        <div class="text-xl font-bold text-[var(--color-text)] font-mono">{{ props.weekRange }}</div>
      </div>

      <div class="flex bg-[var(--color-bg-soft)] rounded-xl p-1">
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          :class="props.activityFilter === 'daily'
            ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
          @click="setFilter('daily')"
        >
          每日訓練
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          :class="props.activityFilter === 'all'
            ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'"
          @click="setFilter('all')"
        >
          全部活動
        </button>
      </div>
    </div>
  </div>
</template>
