<script setup lang="ts">
import type { WeeklyReportTab, WeeklyReportTabItem } from '@/types/weeklyReport'

interface Props {
  modelValue: WeeklyReportTab
  tabs: WeeklyReportTabItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: WeeklyReportTab): void
}>()

const setTab = (value: WeeklyReportTab): void => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-sm -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:backdrop-blur-none border-b border-[var(--color-border-light)] sm:border-0">
    <div class="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
      <button
        v-for="tab in props.tabs"
        :key="tab.key"
        type="button"
        class="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border"
        :class="props.modelValue === tab.key
          ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-transparent shadow-md'
          : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface)]'"
        @click="setTab(tab.key)"
      >
        <span class="mr-1.5 text-base">{{ tab.icon }} {{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>
