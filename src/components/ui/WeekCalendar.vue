<template>
  <div class="week-calendar">
    <!-- 週標題 -->
    <div class="week-header">
      <button class="nav-btn" @click="previousWeek" :disabled="!canGoPrevious">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="week-title">{{ weekTitle }}</span>
      <button class="nav-btn" @click="nextWeek" :disabled="!canGoNext">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <!-- 週日期列表 -->
    <div class="week-days">
      <div
        v-for="day in weekDays"
        :key="day.dateKey"
        class="day-item"
        :class="{
          'is-today': day.isToday,
          'is-past': day.isPast,
          'is-future': day.isFuture,
          'has-training': day.hasTraining,
          'is-completed': day.isCompleted,
          'is-selected': day.dateKey === selectedDate
        }"
        @click="selectDate(day)"
      >
        <span class="day-name">{{ day.dayName }}</span>
        <span class="day-number">{{ day.dayNumber }}</span>
        <div class="day-indicator">
          <span v-if="day.isCompleted" class="indicator completed">✓</span>
          <span v-else-if="day.hasTraining" class="indicator partial">●</span>
          <span v-else class="indicator empty">○</span>
        </div>
      </div>
    </div>

    <!-- 週統計 -->
    <div class="week-stats">
      <div class="stat-item">
        <span class="stat-value">{{ completedDays }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ weeklyGoal }}</span>
        <span class="stat-label">目標</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ totalMinutes }}</span>
        <span class="stat-label">分鐘</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

interface DayInfo {
  date: Date
  dateKey: string
  dayName: string
  dayNumber: number
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  hasTraining: boolean
  isCompleted: boolean
  trainingMinutes: number
}

interface TrainingData {
  [dateKey: string]: {
    minutes: number
    completed: boolean
    sessions: number
  }
}

interface Props {
  /** 訓練資料 (按日期) */
  trainingData?: TrainingData
  /** 允許查看過去幾週 */
  maxPastWeeks?: number
}

const props = withDefaults(defineProps<Props>(), {
  trainingData: () => ({}),
  maxPastWeeks: 12
})

const emit = defineEmits<{
  (e: 'date-select', date: string, data: DayInfo): void
  (e: 'week-change', startDate: string, endDate: string): void
}>()

const settingsStore = useSettingsStore()

// 當前顯示的週偏移量（0 = 本週，-1 = 上週）
const weekOffset = ref(0)
const selectedDate = ref<string | null>(null)

// 日期名稱
const dayNames = ['日', '一', '二', '三', '四', '五', '六']

// 獲取本週的起始日期（週日為起始）
function getWeekStart(date: Date, offset: number = 0): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (offset * 7))
  d.setHours(0, 0, 0, 0)
  return d
}

// 格式化日期為 key
function formatDateKey(date: Date): string {
  const result = date.toISOString().split('T')[0]
  return result || ''
}

// 本週日期
const weekDays = computed<DayInfo[]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = getWeekStart(today, weekOffset.value)
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dateKey = formatDateKey(date)
    const data = props.trainingData[dateKey]
    const dayName = dayNames[i] || ''
    
    return {
      date,
      dateKey,
      dayName,
      dayNumber: date.getDate(),
      isToday: dateKey === formatDateKey(today),
      isPast: date < today,
      isFuture: date > today,
      hasTraining: !!data && data.minutes > 0,
      isCompleted: !!data && data.completed,
      trainingMinutes: data?.minutes || 0
    }
  })
})

// 週標題
const weekTitle = computed(() => {
  if (weekDays.value.length === 0) return ''
  
  const firstDay = weekDays.value[0]
  const lastDay = weekDays.value[6]
  if (!firstDay || !lastDay) return ''
  
  const start = firstDay.date
  const end = lastDay.date
  
  const startMonth = start.getMonth() + 1
  const endMonth = end.getMonth() + 1
  
  if (weekOffset.value === 0) {
    return '本週'
  } else if (weekOffset.value === -1) {
    return '上週'
  } else {
    if (startMonth === endMonth) {
      return `${startMonth}/${start.getDate()} - ${end.getDate()}`
    } else {
      return `${startMonth}/${start.getDate()} - ${endMonth}/${end.getDate()}`
    }
  }
})

// 已完成天數
const completedDays = computed(() => {
  return weekDays.value.filter(d => d.isCompleted).length
})

// 每週目標
const weeklyGoal = computed(() => settingsStore.weeklyTrainingGoal)

// 總訓練分鐘
const totalMinutes = computed(() => {
  return weekDays.value.reduce((sum, d) => sum + d.trainingMinutes, 0)
})

// 是否可以往前
const canGoPrevious = computed(() => {
  return Math.abs(weekOffset.value) < props.maxPastWeeks
})

// 是否可以往後（不能超過本週）
const canGoNext = computed(() => {
  return weekOffset.value < 0
})

// 上一週
function previousWeek() {
  if (canGoPrevious.value) {
    weekOffset.value--
    emitWeekChange()
  }
}

// 下一週
function nextWeek() {
  if (canGoNext.value) {
    weekOffset.value++
    emitWeekChange()
  }
}

// 選擇日期
function selectDate(day: DayInfo) {
  selectedDate.value = day.dateKey
  emit('date-select', day.dateKey, day)
}

// 發送週變更事件
function emitWeekChange() {
  const start = weekDays.value[0]?.dateKey || ''
  const end = weekDays.value[6]?.dateKey || ''
  emit('week-change', start, end)
}

// 重置到本週
function resetToCurrentWeek() {
  weekOffset.value = 0
  selectedDate.value = null
}

// 初始化時發送週變更事件
onMounted(() => {
  emitWeekChange()
})

// 監聽訓練資料變化
watch(() => props.trainingData, () => {
  // 當資料更新時可以做額外處理
}, { deep: true })

// 暴露方法
defineExpose({
  resetToCurrentWeek,
  weekDays,
  selectedDate
})
</script>

<style scoped>
.week-calendar {
  background: var(--color-bg-secondary, #ffffff);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--color-bg-tertiary, #f3f4f6);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-bg-hover, #e5e7eb);
  color: var(--color-text-primary, #1f2937);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.week-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}

.week-days {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.day-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
}

.day-item:hover {
  background: var(--color-bg-tertiary, #f3f4f6);
}

.day-item.is-today {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.day-item.is-today .day-name,
.day-item.is-today .day-number,
.day-item.is-today .indicator {
  color: white;
}

.day-item.is-selected:not(.is-today) {
  background: var(--color-primary-light, #eef2ff);
  border: 2px solid var(--color-primary, #667eea);
}

.day-item.is-future {
  opacity: 0.5;
}

.day-name {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 4px;
}

.day-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
  margin-bottom: 4px;
}

.day-indicator {
  font-size: 10px;
}

.indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.indicator.completed {
  background: #10b981;
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.indicator.partial {
  color: #f59e0b;
}

.indicator.empty {
  color: var(--color-text-muted, #d1d5db);
}

.week-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary, #667eea);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--color-border, #e5e7eb);
}

/* 深色模式 */
:global(.dark) .week-calendar {
  background: #1f2937;
}

:global(.dark) .nav-btn {
  background: #374151;
  color: #9ca3af;
}

:global(.dark) .nav-btn:hover:not(:disabled) {
  background: #4b5563;
  color: #f9fafb;
}

:global(.dark) .week-title {
  color: #f9fafb;
}

:global(.dark) .day-item:hover {
  background: #374151;
}

:global(.dark) .day-item.is-selected:not(.is-today) {
  background: rgba(102, 126, 234, 0.2);
}

:global(.dark) .day-name {
  color: #9ca3af;
}

:global(.dark) .day-number {
  color: #f9fafb;
}

:global(.dark) .indicator.empty {
  color: #4b5563;
}

:global(.dark) .week-stats {
  border-top-color: #374151;
}

:global(.dark) .stat-divider {
  background: #374151;
}

:global(.dark) .stat-label {
  color: #9ca3af;
}

/* 響應式 */
@media (max-width: 767px) {
  .week-calendar {
    padding: 12px;
  }

  .day-item {
    padding: 6px 2px;
    border-radius: 8px;
  }

  .day-name {
    font-size: 11px;
  }

  .day-number {
    font-size: 14px;
  }

  .stat-item {
    padding: 0 12px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>
