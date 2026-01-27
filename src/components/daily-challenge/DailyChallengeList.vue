<template>
  <section class="space-y-2">
    <h2 class="text-base font-bold text-[var(--color-text)] pl-3 border-l-4 border-[var(--color-primary)] flex items-center">訓練清單</h2>
    <div class="space-y-2">
      <div
        v-for="(game, index) in games"
        :key="game.gameId"
        class="card card-clickable flex items-center justify-between p-3 transition-all duration-200 group border-[var(--color-border-light)]"
        :class="[
          game.isCompleted ? 'opacity-70 bg-[var(--color-bg-soft)] grayscale-[0.3]' : 'bg-[var(--color-surface)]',
          !game.isCompleted && !isCompleted && index === completedGames ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-bg)] shadow-md transform -translate-y-0.5 z-10' : 'hover:border-[var(--color-primary)]/30'
        ]"
        @click="onStartGame(game)"
      >
        <div class="flex items-center flex-1 gap-3">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors"
            :class="!game.isCompleted && !isCompleted && index === completedGames ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]'"
          >
            {{ index + 1 }}
          </div>

          <div class="shrink-0">
            <template v-if="resolveGameIcon(game.gameId)?.path">
              <div class="w-10 h-10">
                <img
                  :src="resolveGameIcon(game.gameId)?.path"
                  :alt="game.game.name"
                  class="w-full h-full object-contain drop-shadow-sm transition-transform group-hover:scale-110"
                />
              </div>
            </template>
            <template v-else>
              <div class="emoji-tile w-10 h-10 text-2xl bg-[var(--color-bg-muted)]/50 group-hover:bg-[var(--color-bg-muted)] transition-colors">
                <span class="transition-transform group-hover:scale-110 inline-block">
                  {{ resolveGameIcon(game.gameId)?.emoji || game.game.icon }}
                </span>
              </div>
            </template>
          </div>

          <div class="flex flex-col min-w-0">
            <div class="font-bold text-base text-[var(--color-text)] truncate mb-0.5 group-hover:text-[var(--color-primary)] transition-colors">{{ game.game.name }}</div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded border" :class="getDifficultyClass(game.difficulty)">
                <SubtleLabel :text="getDifficultyText(game.difficulty)" size="xs" tone="inherit" />
              </span>
              <div class="flex gap-0.5 ml-0.5">
                <span
                  v-for="dim in game.targetDimensions"
                  :key="dim"
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{ backgroundColor: dimensionColors[dim] }"
                  :title="dimensionNames[dim]"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-shrink-0 ml-2">
          <div v-if="game.isCompleted" class="w-6 h-6 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)] border border-[var(--color-success)]/20">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div v-else class="w-6 h-6 rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center text-[var(--color-text-secondary)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { CognitiveDimension } from '@/types/cognitive'
import type { TrainingGameItem } from '@/services/dailyTrainingService'

defineProps<{
  games: TrainingGameItem[]
  completedGames: number
  isCompleted: boolean
  dimensionColors: Record<CognitiveDimension, string>
  dimensionNames: Record<CognitiveDimension, string>
  resolveGameIcon: (gameId: string) => { emoji: string; path?: string } | undefined
  getDifficultyClass: (difficulty: string) => string
  getDifficultyText: (difficulty: string) => string
  onStartGame: (game: TrainingGameItem) => void
}>()
</script>
