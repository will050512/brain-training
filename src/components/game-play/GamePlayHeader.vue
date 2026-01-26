<template>
  <div
    class="game-header bg-[var(--color-surface)]/95 backdrop-blur-sm shadow-md border-b border-[var(--color-border)] z-10 sticky top-0"
    :class="{ 'game-header-compact': isMobile, 'game-header-landscape': isLandscape }"
  >
    <div class="container mx-auto flex items-center justify-between px-2 sm:px-4 py-1.5 h-12 sm:h-14 gap-2">
      <button @click="onBack" class="btn btn-secondary btn-sm flex-shrink-0 !px-3 sm:!px-4 h-9 sm:h-10 flex items-center justify-center">
        <span class="text-sm sm:text-base leading-none">返回</span>
      </button>

      <div class="flex-1 min-w-0 mx-1 sm:mx-2 flex flex-col justify-center items-center" :class="{ 'opacity-50': isMobile && isPlaying }">
        <h1 class="text-sm sm:text-base lg:text-xl font-bold text-[var(--color-text)] truncate w-full text-center">
          {{ currentGameName || '遊戲' }}
        </h1>
        <span
          v-if="!isMobile"
          class="badge text-[10px] sm:text-xs mt-0.5"
          :class="`difficulty-${difficulty}`"
        >
          {{ DIFFICULTIES[difficulty].name }}
        </span>
      </div>

      <div class="hidden sm:flex items-center gap-3 flex-shrink-0 ml-auto bg-[var(--color-surface)]">
        <div
          v-if="gameStatus.showProgress !== false && gameStatus.totalRounds"
          class="status-item text-right flex flex-col items-end"
        >
          <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">進度</div>
          <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-progress)] leading-none">
            {{ gameStatus.currentRound || 0 }}/{{ gameStatus.totalRounds }}
          </div>
        </div>

        <div
          v-if="gameStatus.showCounts !== false && (gameStatus.correctCount !== undefined || gameStatus.wrongCount !== undefined)"
          class="status-item text-right flex flex-col items-end"
        >
          <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">對/錯</div>
          <div class="status-value text-sm sm:text-lg font-bold leading-none whitespace-nowrap">
            <span class="text-[var(--color-success)]">{{ gameStatus.correctCount || 0 }}</span>
            <span class="text-[var(--color-text-muted)] mx-0.5">/</span>
            <span class="text-[var(--color-danger)]">{{ gameStatus.wrongCount || 0 }}</span>
          </div>
        </div>

        <div
          v-if="gameStatus.showCombo && gameStatus.combo && gameStatus.combo > 1"
          class="status-item text-right flex flex-col items-end"
        >
          <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">連擊</div>
          <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-combo)] leading-none animate-bounce">
            {{ gameStatus.combo }}x
          </div>
        </div>

        <div
          v-if="gameStatus.showScore !== false"
          class="status-item text-right flex flex-col items-end min-w-[2.5rem] sm:min-w-auto"
        >
          <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">分數</div>
          <div class="status-value text-sm sm:text-lg font-bold text-[var(--color-score)] leading-none">
            {{ gameStatus.score ?? currentScore }}
          </div>
        </div>

        <div
          v-if="gameStatus.showTimer !== false"
          class="status-item text-right flex flex-col items-end min-w-[3.2rem] sm:min-w-[4rem]"
        >
          <div class="status-label text-[10px] text-[var(--color-text-secondary)] leading-none mb-0.5">
            {{ gameStatus.timeLeft !== undefined ? '剩餘' : '用時' }}
          </div>
          <div
            class="status-value text-sm sm:text-lg font-bold leading-none tabular-nums"
            :class="{
              'text-[var(--color-timer-warning)] animate-pulse': gameStatus.timeLeft !== undefined && gameStatus.timeLeft <= 10,
              'text-[var(--color-text)]': gameStatus.timeLeft === undefined || gameStatus.timeLeft > 10
            }"
          >
            {{ formatTime(gameStatus.timeLeft ?? elapsedTime) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameStatusUpdate, Difficulty } from '@/types/game'
import { DIFFICULTIES } from '@/types/game'

defineProps<{
  isMobile: boolean
  isLandscape: boolean
  isPlaying: boolean
  currentGameName: string
  difficulty: Difficulty
  gameStatus: GameStatusUpdate
  currentScore: number
  elapsedTime: number
  formatTime: (seconds: number) => string
  onBack: () => void
}>()
</script>
