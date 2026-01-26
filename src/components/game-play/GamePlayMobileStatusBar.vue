<template>
  <div class="fixed top-12 left-0 right-0 z-20 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)] px-2 py-1">
    <div class="flex items-center justify-between gap-2 text-xs">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div
          v-if="gameStatus.showTimer !== false"
          class="flex items-center gap-1 text-[var(--color-timer-warning)] font-bold"
          :class="{ 'animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10 }"
        >
          <span>⏱️</span>
          <span class="tabular-nums">{{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}</span>
        </div>
        <div
          v-if="gameStatus.showScore !== false"
          class="flex items-center gap-1 text-[var(--color-score)] font-bold"
        >
          <span>🎯</span>
          <span>{{ gameStatus.score ?? currentScore }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <div
          v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
          class="text-[var(--color-progress)] font-bold"
        >
          {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
        </div>
        <div
          v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
          class="flex items-center gap-1"
        >
          <span class="text-[var(--color-success)] font-bold">{{ gameStatus.correctCount || 0 }}</span>
          <span class="text-[var(--color-text-muted)]">/</span>
          <span class="text-[var(--color-danger)] font-bold">{{ gameStatus.wrongCount || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameStatusUpdate } from '@/types/game'

defineProps<{
  gameStatus: GameStatusUpdate
  currentScore: number
  elapsedTime: number
  formatTime: (seconds: number) => string
}>()
</script>
