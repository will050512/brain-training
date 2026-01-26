<script setup lang="ts">
import type { UserStats } from '@/types'

interface Props {
  stats: UserStats
  formatPlayTime: (seconds: number) => string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="mb-6">
    <h2 class="text-lg font-bold text-[var(--color-text)] px-1 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-6 rounded-full bg-[var(--color-primary)]"></span>
      累積成果
    </h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-3 opacity-10 text-6xl pointer-events-none group-hover:scale-110 transition-transform duration-500">📅</div>
        <h3 class="font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <span class="text-xl">📅</span> 每日訓練
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-xl">
            <div class="text-xl font-black text-[var(--color-primary)] mb-1">
              {{ props.stats.streak }}
            </div>
            <div class="text-xs font-medium text-[var(--color-text-secondary)]">連續天數</div>
          </div>
          <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-xl">
            <div class="text-xl font-black text-[var(--color-success)] mb-1">
              {{ Math.round(props.stats.averageScore) }}
            </div>
            <div class="text-xs font-medium text-[var(--color-text-secondary)]">平均分</div>
          </div>
        </div>
      </div>

      <div class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-3 opacity-10 text-6xl pointer-events-none group-hover:scale-110 transition-transform duration-500">🎮</div>
        <h3 class="font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <span class="text-xl">🎮</span> 自由遊戲
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-xl">
            <div class="text-xl font-black text-[var(--color-accent-teal)] mb-1">
              {{ props.stats.totalGamesPlayed }}
            </div>
            <div class="text-xs font-medium text-[var(--color-text-secondary)]">總次數</div>
          </div>
          <div class="text-center p-2 bg-[var(--color-bg-soft)] rounded-xl">
            <div class="text-xl font-black text-[var(--color-accent-warm)] mb-1">
              {{ props.formatPlayTime(props.stats.totalPlayTime) }}
            </div>
            <div class="text-xs font-medium text-[var(--color-text-secondary)]">總時長</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
