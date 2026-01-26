<template>
  <div class="card p-6 text-center flex flex-col items-center shadow-md">
    <p class="text-sm mb-6" style="color: var(--color-text-muted)">
      進行簡短測試以建立您的基線能力
    </p>

    <div class="flex justify-center gap-2 mb-8">
      <div
        v-for="(game, index) in assessmentGames"
        :key="game.id"
        class="w-3 h-3 rounded-full transition-all duration-300"
        :class="index < currentAssessmentGame ? 'bg-[var(--color-success)] scale-100' :
                index === currentAssessmentGame ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-bg-muted)]'"
      ></div>
    </div>

    <div v-if="currentGame" class="py-4 w-full flex flex-col items-center">
      <div class="text-7xl mb-6 animate-bounce" style="animation-duration: 2s;">
        {{ currentGame.icon }}
      </div>
      <h3 class="title-lg mb-3">
        {{ currentGame.name }}
      </h3>
      <p class="mb-8 max-w-xs mx-auto" style="color: var(--color-text-secondary)">
        {{ currentGame.description }}
      </p>

      <button
        @click="onStart"
        class="btn btn-primary btn-lg w-full max-w-xs shadow-lg hover-lift"
      >
        開始測試
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'

defineProps<{
  assessmentGames: Array<{ id: string; dimension: CognitiveDimension; name: string; icon: string; description: string }>
  currentAssessmentGame: number
  currentGame: { id: string; dimension: CognitiveDimension; name: string; icon: string; description: string } | null
  onStart: () => void
}>()
</script>
