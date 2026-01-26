<template>
  <div class="game-content-fit ready-screen-fit max-w-2xl lg:max-w-5xl mx-auto text-center lg:text-left p-2 sm:p-4 w-full">
    <div class="ready-hero ready-hero-layout p-3 sm:p-4">
      <div class="ready-hero-main">
        <div class="text-4xl sm:text-5xl lg:text-6xl mb-4 transform hover:scale-110 transition-transform">{{ currentGame?.icon }}</div>
        <h2 class="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-[var(--color-text)]">{{ currentGame?.name }}</h2>

        <p class="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4 sm:mb-6">
          準備好了嗎？先快速看過玩法，再點擊下方按鈕開始。
        </p>

        <div class="flex items-center justify-center lg:justify-start gap-2 mb-4">
          <span class="badge" :class="`difficulty-${difficulty}`">
            <SubtleLabel :text="DIFFICULTIES[difficulty].name" size="xs" />
          </span>
          <BaseButton variant="secondary" size="sm" @click="onOpenDifficulty">
            調整難度
          </BaseButton>
        </div>
      </div>

      <div class="ready-hero-side">
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 mb-4 max-h-52 lg:max-h-[320px] overflow-auto">
          <div class="section-label text-[var(--color-text-secondary)] mb-2">遊戲說明</div>
          <ul class="space-y-1 text-left text-sm sm:text-base text-[var(--color-text)] leading-snug">
            <li v-if="!currentGame?.instructions || currentGame.instructions.length === 0" class="text-[var(--color-text-secondary)]">此遊戲未提供額外說明，請依畫面提示操作。</li>
            <li v-for="(line, idx) in currentGame?.instructions" :key="idx" class="flex items-start gap-2">
              <span class="text-[var(--color-text-secondary)] mt-0.5">{{ idx + 1 }}.</span>
              <span class="flex-1">{{ line }}</span>
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <div v-if="startError" class="p-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm text-left">
            {{ startError }}
          </div>
          <BaseButton size="lg" full-width class="text-base shadow-md active:scale-95 transition-transform" @click="onStart">
            開始遊戲
          </BaseButton>
          <BaseButton variant="secondary" size="md" full-width class="hidden sm:flex" @click="onBack">
            ← 返回
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { GameDefinition, Difficulty } from '@/types/game'
import { DIFFICULTIES } from '@/types/game'

defineProps<{
  currentGame: GameDefinition | null
  difficulty: Difficulty
  startError: string | null
  onOpenDifficulty: () => void
  onStart: () => void
  onBack: () => void
}>()
</script>
