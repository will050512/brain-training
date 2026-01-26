<template>
  <section class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
    <BaseCard class="w-full text-center shadow-lg my-auto" variant="elevated" padding="lg">
      <div class="mb-4 inline-block p-4 rounded-full bg-[var(--color-success-bg)] text-4xl shadow-sm">
        🎉
      </div>
      <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">篩檢完成</h2>
      <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的認知篩檢結果如下</p>

      <div class="bg-[var(--color-bg-soft)] rounded-2xl p-5 mb-5 border border-[var(--color-border)] relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-[var(--color-primary)]/20"></div>
        <div class="text-5xl font-black text-[var(--color-primary)] mb-1 tracking-tighter">
          {{ result?.totalScore }}
          <SubtleLabel text="/5" size="sm" tone="muted" class="text-2xl font-medium" />
        </div>
        <SubtleLabel text="總分" tone="secondary" weight="bold" caps />

        <div class="grid grid-cols-2 gap-px bg-[var(--color-border)] mt-5 rounded-xl overflow-hidden border border-[var(--color-border)]">
          <div class="bg-[var(--color-surface)] p-4">
            <div class="text-xl font-bold text-[var(--color-text)]">
              {{ result?.wordRecall.score }} / 3
            </div>
            <SubtleLabel text="詞語回憶" tone="muted" class="mt-1 block" />
          </div>
          <div class="bg-[var(--color-surface)] p-4">
            <div class="text-xl font-bold text-[var(--color-text)]">
              {{ result?.clockDrawing.score }} / 2
            </div>
            <SubtleLabel text="時鐘繪圖" tone="muted" class="mt-1 block" />
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
        <BaseButton size="lg" full-width class="text-xl font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all" @click="onStartDailyTraining">
          開始今日訓練
        </BaseButton>
        <BaseButton variant="ghost" size="md" full-width class="text-base" @click="onViewReport">
          查看詳細報告
        </BaseButton>
      </div>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
import type { MiniCogResult } from '@/services/miniCogService'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineProps<{
  result: MiniCogResult | null
  onStartDailyTraining: () => void
  onViewReport: () => void
}>()
</script>
