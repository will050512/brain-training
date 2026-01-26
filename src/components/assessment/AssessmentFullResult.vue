<template>
  <section class="flex-1 flex flex-col w-full animate-fade-in p-4 md:p-6 overflow-y-auto">
    <BaseCard class="w-full text-center shadow-lg my-auto" variant="elevated" padding="lg">
      <div class="mb-3 inline-block p-4 rounded-full bg-[var(--color-primary-bg)] text-4xl shadow-sm">
        🏆
      </div>
      <h2 class="text-2xl font-bold mb-2 text-[var(--color-text)]">能力評估完成！</h2>
      <p class="text-[var(--color-text-secondary)] mb-6 text-base">您的各項能力分析</p>

      <div class="grid grid-cols-3 gap-3 mb-6">
        <AssessmentMetricTile
          icon="⚡"
          label="反應力"
          :value="result?.scores.reaction ?? 0"
          value-class="text-[var(--color-reaction)]"
        />
        <AssessmentMetricTile
          icon="🧠"
          label="記憶力"
          :value="result?.scores.memory ?? 0"
          value-class="text-[var(--color-memory)]"
        />
        <AssessmentMetricTile
          icon="🧩"
          label="邏輯力"
          :value="result?.scores.logic ?? 0"
          value-class="text-[var(--color-logic)]"
        />
      </div>

      <div class="bg-[var(--color-surface-alt)] rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-base border border-[var(--color-border)]">
        <div class="border-r border-[var(--color-border)] pr-2">
          <SubtleLabel text="答對題數" tone="muted" weight="bold" caps class="mb-1 block" />
          <div class="font-bold text-lg text-[var(--color-text)]">
            {{ result?.correctCount }}
            <SubtleLabel :text="`/ ${result?.totalQuestions}`" size="sm" tone="muted" class="text-sm font-normal opacity-60" />
          </div>
        </div>
        <div class="pl-2">
          <SubtleLabel text="平均反應" tone="muted" weight="bold" caps class="mb-1 block" />
          <div class="font-bold text-lg text-[var(--color-text)]">{{ ((result?.averageReactionTime ?? 0) / 1000).toFixed(1) }}s</div>
        </div>
      </div>

      <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-xl p-5 mb-8 text-left relative overflow-hidden">
        <div class="absolute right-0 top-0 opacity-10 text-7xl transform translate-x-1/4 -translate-y-1/4">🎯</div>
        <SubtleLabel text="建議訓練難度" class="text-[var(--color-success)] mb-2 block" weight="bold" caps />
        <div class="text-4xl font-black text-[var(--color-success)] mb-2">
          {{ difficultyLabel }}
        </div>
        <p class="text-[var(--color-text-primary)] text-base opacity-90 leading-relaxed">
          {{ difficultyDescription }}
        </p>
      </div>

      <div class="flex gap-4 justify-center">
        <BaseButton size="lg" class="flex-1 text-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5" @click="onSaveAndContinue">
          儲存並開始
        </BaseButton>
        <BaseButton variant="ghost" size="lg" class="px-5 text-lg" @click="onRetake">
          重測
        </BaseButton>
      </div>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
import type { AssessmentResult } from '@/services/assessmentService'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AssessmentMetricTile from '@/components/assessment/ui/AssessmentMetricTile.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineProps<{
  result: AssessmentResult | null
  difficultyLabel: string
  difficultyDescription: string
  onSaveAndContinue: () => void
  onRetake: () => void
}>()
</script>
