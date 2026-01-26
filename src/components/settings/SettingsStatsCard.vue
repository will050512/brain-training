<script setup lang="ts">
interface Props {
  totalGamesPlayed: number
  averageScore: number
  streak: number
  totalPlayTimeLabel: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">📊</span>
      <h3 class="font-semibold text-[var(--color-text)]">訓練概況</h3>
    </div>

    <div class="grid grid-cols-4 gap-2">
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-lg font-bold text-[var(--color-primary)]">{{ props.totalGamesPlayed }}</span>
        <span class="text-[10px] text-[var(--color-text-muted)]">次數</span>
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-lg font-bold text-[var(--color-score-good)]">{{ Math.round(props.averageScore) }}</span>
        <span class="text-[10px] text-[var(--color-text-muted)]">均分</span>
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-lg font-bold text-[var(--color-combo)]">{{ props.streak }}</span>
        <span class="text-[10px] text-[var(--color-text-muted)]">連勝</span>
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-sm font-bold text-[var(--color-progress)] mt-1">{{ props.totalPlayTimeLabel }}</span>
        <span class="text-[10px] text-[var(--color-text-muted)]">時長</span>
      </div>
    </div>
  </div>
</template>
