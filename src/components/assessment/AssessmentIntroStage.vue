<template>
  <section class="flex-1 flex flex-col p-4 md:p-6 w-full animate-slide-up overflow-y-auto">
    <div class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-lg flex flex-col min-h-full sm:min-h-0 rounded-2xl">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-[var(--color-primary-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner shrink-0">
          🧠
        </div>
        <h2 class="text-2xl font-bold mb-3 text-[var(--color-text)]">準備好了嗎？</h2>
        <p class="text-[var(--color-text-secondary)] text-base leading-relaxed">
          將進行三個簡單測驗，<br/>幫助系統了解您目前的狀態。
        </p>
      </div>

      <div class="space-y-4 mb-8 flex-1">
        <AssessmentInfoRow icon="⚡" title="反應力" description="快速選擇看到的顏色" />
        <AssessmentInfoRow icon="🧠" title="記憶力" description="記住數字序列並輸入" />
        <AssessmentInfoRow icon="🧩" title="邏輯力" description="簡單的數學計算" />
      </div>

      <div class="space-y-4 shrink-0">
        <BaseButton size="lg" full-width class="text-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" @click="onStart">
          開始測試
        </BaseButton>
        <BaseButton variant="ghost" size="md" full-width class="text-[var(--color-text-muted)] text-base" @click="onBack">
          稍後再說
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import AssessmentInfoRow from '@/components/assessment/ui/AssessmentInfoRow.vue'

defineProps<{
  onStart: () => void
  onBack: () => void
}>()
</script>
