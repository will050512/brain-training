<template>
  <div class="training-goal-settings">
    <div class="settings-header">
      <h3 class="settings-title">訓練目標設定</h3>
      <p class="settings-desc">根據您的時間安排，設定每週訓練計畫</p>
    </div>

    <!-- 每週訓練天數 -->
    <div class="setting-group">
      <label class="setting-label">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        每週訓練天數
      </label>
      <div class="option-chips">
        <button
          v-for="option in weeklyOptions"
          :key="option.value"
          class="chip"
          :class="{ active: weeklyGoal === option.value }"
          @click="setWeeklyGoal(option.value)"
        >
          <span class="chip-value">{{ option.value }}</span>
          <span class="chip-label">天</span>
        </button>
      </div>
      <div class="setting-hint">
        <span class="hint-tag" :class="goalDifficultyClass">{{ goalDifficultyText }}</span>
      </div>
    </div>

    <!-- 每日訓練時長 -->
    <div class="setting-group">
      <label class="setting-label">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        每日訓練時長
      </label>
      <div class="duration-slider">
        <input
          type="range"
          :min="10"
          :max="30"
          :step="5"
          :value="dailyDuration"
          @input="onDurationInput"
          class="slider"
        />
        <div class="duration-marks">
          <span
            v-for="d in [10, 15, 20, 25, 30]"
            :key="d"
            class="mark"
            :class="{ active: dailyDuration >= d }"
          >
            {{ d }}
          </span>
        </div>
      </div>
      <div class="duration-display">
        <span class="duration-value">{{ dailyDuration }}</span>
        <span class="duration-unit">分鐘/天</span>
      </div>
      <div class="duration-desc">
        約可完成 {{ estimatedGames }} 款遊戲
      </div>
    </div>

    <!-- 週訓練總覽 -->
    <div class="summary-card">
      <div class="summary-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        週訓練計畫
      </div>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="stat-number">{{ weeklyGoal }}</span>
          <span class="stat-text">天</span>
        </div>
        <span class="summary-times">×</span>
        <div class="summary-stat">
          <span class="stat-number">{{ dailyDuration }}</span>
          <span class="stat-text">分鐘</span>
        </div>
        <span class="summary-equals">=</span>
        <div class="summary-stat total">
          <span class="stat-number">{{ totalWeeklyMinutes }}</span>
          <span class="stat-text">分鐘/週</span>
        </div>
      </div>
      <div class="summary-message">
        {{ summaryMessage }}
      </div>
    </div>

    <!-- 儲存按鈕 -->
    <button v-if="showSaveButton" class="save-btn" @click="saveSettings">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
      儲存設定
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettingsStore, WEEKLY_TRAINING_OPTIONS, DAILY_TRAINING_OPTIONS, type WeeklyTrainingGoal, type DailyTrainingDuration } from '@/stores/settingsStore'

interface Props {
  showSaveButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSaveButton: false
})

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'change', settings: { weeklyGoal: number; dailyDuration: number }): void
}>()

const settingsStore = useSettingsStore()

// 本地狀態（允許即時更新顯示）
const weeklyGoal = ref<WeeklyTrainingGoal>(settingsStore.weeklyTrainingGoal)
const dailyDuration = ref<DailyTrainingDuration>(settingsStore.dailyTrainingDuration)

// 每週選項
const weeklyOptions = WEEKLY_TRAINING_OPTIONS

// 目標難度分類
const goalDifficultyClass = computed(() => {
  if (weeklyGoal.value <= 2) return 'easy'
  if (weeklyGoal.value <= 4) return 'medium'
  return 'hard'
})

const goalDifficultyText = computed(() => {
  const option = weeklyOptions.find(o => o.value === weeklyGoal.value)
  return option?.description || ''
})

// 預估遊戲數量
const estimatedGames = computed(() => {
  const option = DAILY_TRAINING_OPTIONS.find(o => o.value === dailyDuration.value)
  return option?.games || '6-8'
})

// 週總訓練時間
const totalWeeklyMinutes = computed(() => {
  return weeklyGoal.value * dailyDuration.value
})

// 總結訊息
const summaryMessage = computed(() => {
  const mins = totalWeeklyMinutes.value
  if (mins < 60) {
    return '持續訓練，循序漸進是最好的開始！'
  } else if (mins < 120) {
    return '很好的訓練計畫！保持這個節奏。'
  } else if (mins < 180) {
    return '積極的訓練目標！加油堅持下去。'
  } else {
    return '高強度訓練！記得適當休息。'
  }
})

// 設定每週目標
function setWeeklyGoal(goal: WeeklyTrainingGoal) {
  weeklyGoal.value = goal
  settingsStore.setWeeklyTrainingGoal(goal)
  emitChange()
}

// 處理時長輸入
function onDurationInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value) as DailyTrainingDuration
  dailyDuration.value = value
  settingsStore.setDailyTrainingDuration(value)
  emitChange()
}

// 發送變更事件
function emitChange() {
  emit('change', {
    weeklyGoal: weeklyGoal.value,
    dailyDuration: dailyDuration.value
  })
}

// 儲存設定
function saveSettings() {
  emit('save')
}

// 監聽 store 變化
watch(() => settingsStore.weeklyTrainingGoal, (val) => {
  weeklyGoal.value = val
})

watch(() => settingsStore.dailyTrainingDuration, (val) => {
  dailyDuration.value = val
})
</script>

<style scoped>
.training-goal-settings {
  padding: 20px;
}

.settings-header {
  margin-bottom: 24px;
  text-align: center;
}

.settings-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.settings-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.setting-group {
  margin-bottom: 28px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.setting-label svg {
  color: var(--color-primary);
}

.option-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 10px 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--color-primary-light);
  background: var(--color-bg-soft);
}

.chip.active {
  border-color: transparent;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  box-shadow: var(--shadow-sm);
}

.chip-value {
  font-size: 18px;
  font-weight: 700;
}

.chip-label {
  font-size: 12px;
  opacity: 0.9;
}

.setting-hint {
  margin-top: 8px;
}

.hint-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.hint-tag.easy {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.hint-tag.medium {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.hint-tag.hard {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.duration-slider {
  padding: 0 8px;
  margin-bottom: 8px;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--color-bg-muted);
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gradient-primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(30, 58, 138, 0.4);
  transition: transform 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.duration-marks {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.mark {
  font-size: 12px;
  color: var(--color-text-muted);
  transition: color 0.2s ease;
}

.mark.active {
  color: var(--color-primary);
  font-weight: 600;
}

.duration-display {
  text-align: center;
  margin: 12px 0 4px;
}

.duration-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.duration-unit {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.duration-desc {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.summary-card {
  background: var(--color-primary-bg);
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 20px;
  margin-top: 24px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.summary-header svg {
  color: var(--color-primary);
}

.summary-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.summary-stat {
  text-align: center;
}

.summary-stat .stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.summary-stat .stat-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  display: block;
}

.summary-stat.total .stat-number {
  color: var(--color-primary);
  font-size: 28px;
}

.summary-times,
.summary-equals {
  font-size: 20px;
  color: var(--color-text-muted);
  font-weight: 300;
}

.summary-message {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 24px;
  border: none;
  border-radius: 12px;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(30, 58, 138, 0.4);
}

.save-btn:active {
  transform: translateY(0);
}

/* 響應式 */
@media (max-width: 767px) {
  .training-goal-settings {
    padding: 16px;
  }

  .option-chips {
    justify-content: center;
  }

  .chip {
    padding: 8px 14px;
  }

  .chip-value {
    font-size: 16px;
  }

  .duration-value {
    font-size: 28px;
  }

  .summary-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>
