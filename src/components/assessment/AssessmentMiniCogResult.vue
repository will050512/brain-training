<template>
  <section class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
    <div class="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg my-auto">
      <div class="mb-4 inline-block p-4 rounded-full bg-[var(--color-success-bg)] text-4xl shadow-sm">
        🎉
      </div>
      <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">篩檢完成</h2>
      <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的認知篩檢結果如下</p>

      <div class="bg-[var(--color-bg-soft)] rounded-2xl p-5 mb-5 border border-[var(--color-border)] relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-[var(--color-primary)]/20"></div>
        <div class="text-5xl font-black text-[var(--color-primary)] mb-1 tracking-tighter">
          {{ result?.totalScore }}<span class="text-2xl text-[var(--color-text-muted)] font-medium">/5</span>
        </div>
        <div class="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">總分</div>

        <div class="grid grid-cols-2 gap-px bg-[var(--color-border)] mt-5 rounded-xl overflow-hidden border border-[var(--color-border)]">
          <div class="bg-[var(--color-surface)] p-4">
            <div class="text-xl font-bold text-[var(--color-text)]">
              {{ result?.wordRecall.score }} / 3
            </div>
            <div class="text-xs text-[var(--color-text-muted)] mt-1">詞語回憶</div>
          </div>
          <div class="bg-[var(--color-surface)] p-4">
            <div class="text-xl font-bold text-[var(--color-text)]">
              {{ result?.clockDrawing.score }} / 2
            </div>
            <div class="text-xs text-[var(--color-text-muted)] mt-1">時鐘繪圖</div>
          </div>
        </div>
      </div>

      <div class="bg-[var(--color-info-bg)]/30 rounded-xl p-4 mb-6 text-left border border-[var(--color-info-bg)] flex gap-4">
        <span class="text-2xl shrink-0 mt-0.5">💡</span>
        <p class="text-[var(--color-text-primary)] text-base leading-relaxed">
          <span class="font-bold block mb-1 text-[var(--color-info)]">系統建議</span>
          已根據結果調整遊戲難度。建議每天進行 15 分鐘認知訓練。
        </p>
      </div>

      <div class="space-y-4">
        <button @click="onStartDailyTraining" class="btn btn-primary btn-lg w-full shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[60px] text-xl font-bold">
          開始今日訓練
        </button>
        <button @click="onViewReport" class="btn btn-ghost w-full text-base min-h-[50px]">
          查看詳細報告
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MiniCogResult } from '@/services/miniCogService'

defineProps<{
  result: MiniCogResult | null
  onStartDailyTraining: () => void
  onViewReport: () => void
}>()
</script>
