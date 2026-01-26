<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'

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
        <SubtleLabel text="次數" size="xs" tone="muted" />
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-lg font-bold text-[var(--color-score-good)]">{{ Math.round(props.averageScore) }}</span>
        <SubtleLabel text="均分" size="xs" tone="muted" />
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-lg font-bold text-[var(--color-combo)]">{{ props.streak }}</span>
        <SubtleLabel text="連勝" size="xs" tone="muted" />
      </div>
      <div class="flex flex-col items-center p-2 bg-[var(--color-bg-soft)] rounded-lg">
        <span class="text-sm font-bold text-[var(--color-progress)] mt-1">{{ props.totalPlayTimeLabel }}</span>
        <SubtleLabel text="時長" size="xs" tone="muted" />
      </div>
    </div>
  </div>
</template>
