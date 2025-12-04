<template>
  <div class="week-progress-bar">
    <div class="week-header">
      <span class="week-title">本週完成天數</span>
    </div>
    <div class="week-days">
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="day-item"
        :class="{
          'day-completed': day.completed,
          'day-today': day.isToday,
          'day-future': isFutureDay(day.date)
        }"
        @click="$emit('day-click', day)"
      >
        <span class="day-label">{{ day.dayLabel }}</span>
        <span class="day-number">{{ day.dayNumber }}</span>
        <div v-if="day.completed" class="day-check">✓</div>
      </div>
    </div>
    <div class="week-summary" v-if="showSummary">
      <span class="summary-text">
        {{ completedDays }}/{{ totalGoal }} 天
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeekDayInfo } from '@/services/dailyTrainingService'

interface Props {
  /** 週日期資訊陣列 */
  weekDays: WeekDayInfo[]
  /** 已完成天數 */
  completedDays?: number
  /** 目標天數 */
  totalGoal?: number
  /** 是否顯示摘要 */
  showSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  completedDays: 0,
  totalGoal: 7,
  showSummary: false,
})

defineEmits<{
  (e: 'day-click', day: WeekDayInfo): void
}>()

// 判斷是否為未來日期
function isFutureDay(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date > today
}
</script>

<style scoped>
.week-progress-bar {
  background: var(--color-surface, white);
  border-radius: 12px;
  padding: 0.75rem;
}

.week-header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.week-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
}

.week-days {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
}

.day-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.25rem;
  border-radius: 12px;
  background: var(--color-bg-muted, #f3f4f6);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-width: 36px;
}

.day-item:hover {
  background: var(--color-bg-soft, #e5e7eb);
}

.day-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted, #9ca3af);
  text-transform: uppercase;
}

.day-number {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text, #1f2937);
  margin-top: 0.125rem;
}

.day-check {
  position: absolute;
  bottom: -4px;
  font-size: 0.625rem;
  color: white;
  background: #22c55e;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 已完成 */
.day-completed {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  color: white;
}

.day-completed .day-label,
.day-completed .day-number {
  color: white;
}

/* 今天 */
.day-today:not(.day-completed) {
  background: linear-gradient(135deg, #f97316, #fb923c);
}

.day-today:not(.day-completed) .day-label,
.day-today:not(.day-completed) .day-number {
  color: white;
}

/* 未來日期 */
.day-future {
  opacity: 0.5;
  cursor: default;
}

.day-future:hover {
  background: var(--color-bg-muted, #f3f4f6);
}

/* 摘要 */
.week-summary {
  text-align: center;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border-light, #e5e7eb);
}

.summary-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary, #6366f1);
}

/* 深色模式 */
:root.dark .day-item {
  background: var(--color-bg-soft, #374151);
}

:root.dark .day-item:hover {
  background: var(--color-surface-alt, #4b5563);
}

/* 響應式 */
@media (max-width: 400px) {
  .day-item {
    padding: 0.375rem 0.125rem;
    min-width: 32px;
  }
  
  .day-label {
    font-size: 0.5rem;
  }
  
  .day-number {
    font-size: 0.875rem;
  }
}
</style>
