<script setup lang="ts">
import { computed } from 'vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { PersonalizedNutritionResult } from '@/services/nutritionPlaceholder'

interface Props {
  nutritionUnlocked: boolean
  nutritionResult: PersonalizedNutritionResult | null
  nutritionUnlockPercent: number
  nutritionUnlockProgress: number
  nutritionUnlockRequired: number
}

const props = defineProps<Props>()

const highPriorityRecommendations = computed(() => {
  return props.nutritionResult?.recommendations.filter(rec => rec.priority === 'high') || []
})

const mediumPriorityRecommendations = computed(() => {
  return props.nutritionResult?.recommendations.filter(rec => rec.priority === 'medium') || []
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div v-if="!props.nutritionUnlocked" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="text-6xl mb-4">🔒</div>
      <h3 class="text-xl font-bold text-[var(--color-text)] mb-2">尚未解鎖</h3>
      <p class="text-[var(--color-text-secondary)] mb-6">
        完成 {{ props.nutritionUnlockRequired }} 場遊戲後解鎖營養建議
      </p>

      <div class="w-full max-w-xs bg-[var(--color-surface-elevated)] rounded-full h-4 overflow-hidden shadow-inner mb-2">
        <div
          class="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] transition-all duration-1000"
          :style="{ width: `${props.nutritionUnlockPercent}%` }"
        ></div>
      </div>
      <p class="text-sm font-bold text-[var(--color-primary)]">
        {{ props.nutritionUnlockProgress }} / {{ props.nutritionUnlockRequired }}
      </p>
    </div>

    <template v-else-if="props.nutritionResult">
      <div class="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 p-4 rounded-xl flex gap-3 items-start">
        <span class="text-xl shrink-0">⚠️</span>
        <SubtleLabel
          text="以下營養建議僅供參考，不構成醫療診斷。開始任何補充計畫前請諮詢專業醫療人員。"
          tone="secondary"
          class="leading-relaxed"
        />
      </div>

      <section v-if="highPriorityRecommendations.length > 0">
        <SectionTitle title="重點關注">
          <template #prefix>
            <span class="text-xl">🔴</span>
          </template>
        </SectionTitle>
        <div class="space-y-4">
          <div
            v-for="rec in highPriorityRecommendations"
            :key="rec.id"
            class="bg-[var(--color-danger)]/5 border-l-4 border-[var(--color-danger)] rounded-r-xl p-4 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-lg text-[var(--color-text)]">{{ rec.supplement.name }}</span>
              <span
                v-if="rec.supplement.isPartnerProduct"
                class="px-2 py-0.5 bg-[var(--color-warning)] text-white rounded-full"
              >
                <SubtleLabel text="合作" size="xs" class="text-white" />
              </span>
            </div>
            <p class="text-sm text-[var(--color-text-secondary)] mb-3 leading-relaxed">{{ rec.reason }}</p>

            <div class="flex flex-wrap gap-2 mb-3">
              <span
                v-for="(benefit, i) in rec.supplement.benefits.slice(0, 2)"
                :key="i"
                class="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)]"
              >
                <SubtleLabel :text="benefit" tone="secondary" />
              </span>
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-danger)]/10">
              <SubtleLabel :text="`建議劑量：${rec.supplement.dosageRange}`" tone="muted" />
              <a
                v-if="rec.supplement.isPartnerProduct && rec.supplement.partnerUrl"
                :href="rec.supplement.partnerUrl"
                target="_blank"
                class="text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <SubtleLabel text="了解更多 →" class="text-[var(--color-primary)]" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section v-if="mediumPriorityRecommendations.length > 0">
        <SectionTitle title="建議考慮">
          <template #prefix>
            <span class="text-xl">🟡</span>
          </template>
        </SectionTitle>
        <div class="space-y-4">
          <div
            v-for="rec in mediumPriorityRecommendations"
            :key="rec.id"
            class="bg-[var(--color-warning)]/5 border-l-4 border-[var(--color-warning)] rounded-r-xl p-4 shadow-sm"
          >
            <h3 class="font-bold text-[var(--color-text)] mb-2">{{ rec.supplement.name }}</h3>
            <p class="text-sm text-[var(--color-text-secondary)] mb-2 leading-relaxed">{{ rec.reason }}</p>
            <SubtleLabel :text="`建議劑量：${rec.supplement.dosageRange}`" tone="muted" />
          </div>
        </div>
      </section>

      <section
        v-if="props.nutritionResult.cognitiveBasedAdvice.length > 0"
        class="bg-[var(--color-surface-elevated)] p-5 rounded-2xl border border-[var(--color-border-light)]"
      >
        <SectionTitle title="認知評估建議" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>🧠</span>
          </template>
        </SectionTitle>
        <ul class="space-y-2 list-disc list-inside text-sm text-[var(--color-text-secondary)]">
          <li
            v-for="(advice, i) in props.nutritionResult.cognitiveBasedAdvice"
            :key="i"
            class="leading-relaxed pl-1"
          >
            {{ advice }}
          </li>
        </ul>
      </section>

      <section class="bg-[var(--color-success)]/5 p-5 rounded-2xl border border-[var(--color-success)]/20">
        <SectionTitle title="一般保健建議" spacing="sm" :show-accent="false">
          <template #prefix>
            <span>💡</span>
          </template>
        </SectionTitle>
        <ul class="space-y-2 list-disc list-inside text-sm text-[var(--color-text-secondary)]">
          <li
            v-for="(advice, i) in props.nutritionResult.generalAdvice"
            :key="i"
            class="leading-relaxed pl-1"
          >
            {{ advice }}
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
      <div class="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4"></div>
      <p>正在分析您的認知數據...</p>
    </div>
  </div>
</template>
