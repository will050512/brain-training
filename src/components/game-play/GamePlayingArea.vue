<template>
  <div
    class="game-content-full w-full h-full min-h-0 overflow-x-hidden"
    :class="{ 'is-paused': isPaused }"
  >
    <component
      :is="gameComponent"
      :key="gameComponentKey"
      :difficulty="difficulty"
      :sub-difficulty="subDifficulty"
      :settings="settings"
      :auto-start="autoStart"
      class="w-full h-full min-h-0"
      :class="{ 'pointer-events-none': isPaused }"
      :isPaused="isPaused"
      @score-change="onScoreChange"
      @score-update="onScoreChange"
      @score:update="onScoreChange"
      @game-start="onGameStart"
      @game-end="onGameEnd"
      @status-update="onStatusUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { Difficulty, SubDifficulty, GameStatusUpdate, GameResult, SettingValue } from '@/types/game'

defineProps<{
  gameComponent: Component | null
  gameComponentKey: number
  difficulty: Difficulty
  subDifficulty: SubDifficulty | undefined
  settings: Record<string, SettingValue>
  autoStart: boolean
  isPaused?: boolean
  onScoreChange: (score: number) => void
  onGameStart: () => void
  onGameEnd: (result: GameResult) => void
  onStatusUpdate: (status: GameStatusUpdate) => void
}>()
</script>

<style scoped>
.is-paused :deep(.game-feedback) {
  display: none;
}
</style>
