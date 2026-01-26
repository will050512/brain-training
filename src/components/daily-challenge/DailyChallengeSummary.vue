<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineProps<{
  totalGames: number
  estimatedMinutes: number
  coveredCount: number
  completedGames: number
  todayProgress: number
  isCompleted: boolean
  canContinue: boolean
  isStarting: boolean
  status: string
  isRegenerating: boolean
  onStart: () => void
  onRegenerate: () => void
}>()
</script>

<template>
  <section class="card p-3 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg-soft)] border border-[var(--color-border-light)] shadow-sm">
    <h2 class="sr-only">訓練摘要</h2>

    <div class="flex justify-around items-center mb-3">
      <div class="flex flex-col items-center">
        <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ totalGames }}</span>
        <SubtleLabel text="個遊戲" tone="secondary" class="mt-0.5" />
      </div>
      <div class="w-px h-8 bg-[var(--color-border)]/60"></div>
      <div class="flex flex-col items-center">
        <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ estimatedMinutes }}</span>
        <SubtleLabel text="分鐘" tone="secondary" class="mt-0.5" />
      </div>
      <div class="w-px h-8 bg-[var(--color-border)]/60"></div>
      <div class="flex flex-col items-center">
        <span class="text-2xl font-extrabold text-[var(--color-primary)] leading-tight">{{ coveredCount }}</span>
        <SubtleLabel text="項能力" tone="secondary" class="mt-0.5" />
      </div>
    </div>

    <div v-if="completedGames > 0" class="bg-[var(--color-surface)]/60 rounded-xl p-2.5 mb-3 backdrop-blur-sm border border-[var(--color-border)]/40 shadow-inner">
      <div class="flex justify-between mb-1 font-semibold">
        <SubtleLabel text="今日進度" tone="secondary" />
        <SubtleLabel :text="`${Math.round(todayProgress)}%`" class="text-[var(--color-primary)]" />
      </div>
      <div class="h-2.5 bg-[var(--color-border)]/40 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-[var(--color-accent-warm)] to-[var(--color-warning)] rounded-full transition-all duration-700 ease-out"
          :style="{ width: `${todayProgress}%` }"
        ></div>
      </div>
      <SubtleLabel :text="`已完成 ${completedGames} / ${totalGames}`" size="xs" tone="muted" class="text-center mt-1.5 block" />
    </div>

    <BaseButton
      size="lg"
      full-width
      class="justify-center shadow-md hover:shadow-lg transform transition-all active:scale-95 touch-manipulation"
      :class="{ 'opacity-90 saturate-50': isCompleted }"
      :disabled="isStarting"
      @click="onStart"
    >
      <span v-if="isStarting" class="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-text-inverse)] border-t-transparent mr-2"></span>
      <template v-else-if="isCompleted">
        <span class="text-xl mr-2 filter drop-shadow-sm">🎉</span>
        <div class="flex flex-col items-start leading-tight">
          <span class="font-bold text-sm">今日已完成！</span>
          <SubtleLabel text="點擊再次挑戰" size="xs" class="opacity-90" />
        </div>
      </template>
      <template v-else-if="canContinue">
        <span class="text-lg mr-2">▶️</span> 繼續訓練
      </template>
      <template v-else>
        <span class="text-lg mr-2">🚀</span> 開始今日訓練
      </template>
    </BaseButton>

    <div v-if="status === 'not-started'" class="mt-3 text-center">
      <BaseButton
        variant="ghost"
        size="sm"
        class="py-1 h-auto text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        @click="onRegenerate"
        :disabled="isRegenerating"
      >
        🔄 重新生成訓練內容
      </BaseButton>
    </div>
  </section>
</template>
