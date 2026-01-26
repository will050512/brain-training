<template>
  <div class="section-stack">
    <div class="section-label">遊戲清單</div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      <div
        v-for="game in games"
        :key="game.id"
        class="card-variant-action p-3 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-light)] hover-lift min-h-[170px] flex flex-col"
        @click="onOpenGame(game)"
      >
        <div class="text-3xl sm:text-4xl text-center mb-2 flex-1 flex items-center justify-center">
          <template v-if="resolveGameIcon(game.id)?.path">
            <img
              :src="resolveGameIcon(game.id)?.path"
              :alt="game.name"
              class="mx-auto w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />
          </template>
          <template v-else>
            <span class="emoji-tile text-4xl sm:text-5xl">{{ resolveGameIcon(game.id)?.emoji || game.icon }}</span>
          </template>
        </div>

        <h3 class="text-[length:var(--font-size-lg)] font-bold text-center text-[var(--color-text)] mb-2 line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">{{ game.name }}</h3>

        <div class="flex justify-center mb-2">
          <span
            v-if="primaryDimension(game)"
            class="badge truncate max-w-full px-2 py-0.5 text-xs font-bold"
            :style="{
              backgroundColor: getDimensionColor(primaryDimension(game)!) + '15',
              color: getDimensionColor(primaryDimension(game)!)
            }"
          >
            {{ getDimensionShortName(primaryDimension(game)!) }}
          </span>
        </div>

        <div class="text-center mt-auto border-t border-[var(--color-border-light)] pt-2 w-full">
          <span class="text-[length:calc(var(--font-size-base)*0.85)] text-[var(--color-text-muted)] block mb-0.5">最佳紀錄</span>
          <span class="text-[length:var(--font-size-2xl)] font-black tracking-tight" :class="getScoreClass(getBestScore(game.id))">
            {{ getBestScore(game.id) || '-' }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="games.length === 0" class="text-center py-8 sm:py-12">
      <div class="text-3xl sm:text-4xl mb-3">🎮</div>
      <p class="text-[length:var(--font-size-lg)] text-[var(--color-text-muted)]">此分類暫無遊戲</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'
import type { GameDefinition } from '@/types/game'

defineProps<{
  games: GameDefinition[]
  resolveGameIcon: (gameId: string) => { emoji: string; path?: string } | undefined
  primaryDimension: (game: GameDefinition) => CognitiveDimension | null
  getDimensionColor: (dimension: CognitiveDimension) => string
  getDimensionShortName: (dimension: CognitiveDimension) => string
  getScoreClass: (score: number | null | undefined) => string
  getBestScore: (gameId: string) => number | null | undefined
  onOpenGame: (game: GameDefinition) => void
}>()
</script>
