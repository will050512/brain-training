<template>
  <section class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
    <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg my-auto">
      <div class="mb-3 inline-block p-4 rounded-full bg-[var(--color-primary-bg)] text-4xl shadow-sm">
        🏆
      </div>
      <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">能力評估完成！</h2>
      <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的各項能力分析</p>

      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
          <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">⚡</div>
          <div class="text-2xl font-black text-[var(--color-reaction)]">{{ result?.scores.reaction }}</div>
          <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">反應力</div>
        </div>
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
          <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">🧠</div>
          <div class="text-2xl font-black text-[var(--color-memory)]">{{ result?.scores.memory }}</div>
          <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">記憶力</div>
        </div>
        <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
          <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">🧩</div>
          <div class="text-2xl font-black text-[var(--color-logic)]">{{ result?.scores.logic }}</div>
          <div class="text-xs uppercase font-bold text-[var(--color-text-muted)] mt-1">邏輯力</div>
        </div>
      </div>

      <div class="bg-[var(--color-surface-alt)] rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-base border border-[var(--color-border)]">
        <div class="border-r border-[var(--color-border)] pr-2">
          <div class="text-[var(--color-text-muted)] text-xs mb-1 uppercase tracking-wider">答對題數</div>
          <div class="font-bold text-lg text-[var(--color-text)]">{{ result?.correctCount }} <span class="text-sm font-normal opacity-60">/ {{ result?.totalQuestions }}</span></div>
        </div>
        <div class="pl-2">
          <div class="text-[var(--color-text-muted)] text-xs mb-1 uppercase tracking-wider">平均反應</div>
          <div class="font-bold text-lg text-[var(--color-text)]">{{ ((result?.averageReactionTime ?? 0) / 1000).toFixed(1) }}s</div>
        </div>
      </div>

      <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-xl p-5 mb-8 text-left relative overflow-hidden">
        <div class="absolute right-0 top-0 opacity-10 text-7xl transform translate-x-1/4 -translate-y-1/4">🎯</div>
        <h3 class="font-bold text-[var(--color-success)] text-xs uppercase tracking-wider mb-2">建議訓練難度</h3>
        <div class="text-4xl font-black text-[var(--color-success)] mb-2">
          {{ difficultyLabel }}
        </div>
        <p class="text-[var(--color-text-primary)] text-base opacity-90 leading-relaxed">
          {{ difficultyDescription }}
        </p>
      </div>

      <div class="flex gap-4 justify-center">
        <button @click="onSaveAndContinue" class="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[60px] text-xl font-bold">
          儲存並開始
        </button>
        <button @click="onRetake" class="btn btn-ghost px-5 btn-lg min-h-[60px] text-lg">
          重測
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AssessmentResult } from '@/services/assessmentService'

defineProps<{
  result: AssessmentResult | null
  difficultyLabel: string
  difficultyDescription: string
  onSaveAndContinue: () => void
  onRetake: () => void
}>()
</script>
