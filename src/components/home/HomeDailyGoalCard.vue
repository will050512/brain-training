<script setup lang="ts">
import CircularProgress from '@/components/ui/CircularProgress.vue'

interface WeeklyProgress {
  completedDays: number
  totalMinutes: number
  totalSessions: number
}

interface DailyProgress {
  completed: boolean
}

interface Props {
  weeklyProgress: WeeklyProgress
  dailyProgress: DailyProgress
  weeklyTrainingGoal: number
  dailyTrainingDuration: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'open-goal-settings'): void
}>()
</script>

<template>
  <div class="mb-6">
    <h2 class="text-lg font-bold text-[var(--color-text)] px-1 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-6 rounded-full bg-[var(--color-primary)]"></span>
      今日訓練
    </h2>
    <div class="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-2xl p-4 sm:p-5 text-[var(--color-text-inverse)] shadow-lg relative overflow-hidden group">
      <div class="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-surface)]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex items-start sm:items-center justify-between mb-4 gap-3 relative z-10">
        <div class="flex-1 min-w-0">
          <h2 class="text-xl sm:text-2xl font-bold truncate tracking-wide">每日目標</h2>
          <p class="text-[var(--color-bg-soft)] text-sm sm:text-base mt-1 font-medium opacity-90">
            每週 {{ props.weeklyTrainingGoal }} 天 · {{ props.dailyTrainingDuration }} 分鐘/天
          </p>
        </div>
        <button
          type="button"
          class="w-12 h-12 rounded-full bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface)]/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-inner"
          aria-label="調整目標"
          @click="emit('open-goal-settings')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div class="flex items-center justify-center sm:justify-around gap-4 sm:gap-6 mb-5 relative z-10">
        <div class="flex-shrink-0 transform scale-105">
          <CircularProgress
            :value="props.weeklyProgress.completedDays"
            :max="props.weeklyTrainingGoal"
            :size="120"
            :stroke-width="10"
            progress-color="var(--color-surface)"
            track-color="var(--color-track-on-primary)"
            :show-percentage="false"
          >
            <div class="text-center text-[var(--color-text-inverse)]">
              <span class="text-4xl font-black tracking-tight">{{ props.weeklyProgress.completedDays }}</span>
              <span class="text-base opacity-80 font-medium mx-1">/</span>
              <span class="text-xl opacity-90 font-bold">{{ props.weeklyTrainingGoal }}</span>
              <span class="block text-sm opacity-80 mt-1 font-medium">天達標</span>
            </div>
          </CircularProgress>
        </div>

        <div class="space-y-4 flex-1 sm:flex-initial">
          <div class="flex items-center gap-4 bg-[var(--color-surface)]/10 rounded-2xl p-3 backdrop-blur-sm border border-[var(--color-surface)]/10">
            <span class="text-3xl filter drop-shadow-md">⏱️</span>
            <div class="min-w-0 flex-1 text-[var(--color-text-inverse)]">
              <p class="text-2xl font-bold truncate leading-none">{{ props.weeklyProgress.totalMinutes }}</p>
              <p class="text-xs sm:text-sm opacity-80 mt-1">本週訓練分鐘</p>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-[var(--color-surface)]/10 rounded-2xl p-3 backdrop-blur-sm border border-[var(--color-surface)]/10">
            <span class="text-3xl filter drop-shadow-md">🎮</span>
            <div class="min-w-0 flex-1 text-[var(--color-text-inverse)]">
              <p class="text-2xl font-bold truncate leading-none">{{ props.weeklyProgress.totalSessions }}</p>
              <p class="text-xs sm:text-sm opacity-80 mt-1">遊戲次數</p>
            </div>
          </div>
        </div>
      </div>

      <router-link
        to="/daily-challenge"
        class="block w-full py-3 mt-2 bg-[var(--color-surface)] text-[var(--color-primary)] rounded-xl font-bold text-center text-base sm:text-lg
               hover:bg-[var(--color-bg-soft)] active:scale-[0.98] transition-all shadow-md relative z-10 overflow-hidden"
      >
        <span class="relative z-10 flex items-center justify-center gap-2">
          <span class="text-2xl">{{ props.dailyProgress.completed ? '🎉' : '🚀' }}</span>
          {{ props.dailyProgress.completed ? '繼續訓練' : '開始今日訓練' }}
        </span>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-surface-alt)]/50 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000"></div>
      </router-link>
    </div>
  </div>
</template>
