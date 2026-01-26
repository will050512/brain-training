<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

type TopDimension = {
  dimension: CognitiveDimension
  icon: string
  name: string
  score: number
  trend: number
  trendClass: string
}

interface UnlockProgress {
  remaining: number
  percentage: number
}

interface CognitiveTrend {
  dimensions: Record<CognitiveDimension, { score: number; trend: number }>
  hasDecline: boolean
}

interface Props {
  hasSufficientData: boolean
  unlockProgress: UnlockProgress
  cognitiveTrend: CognitiveTrend | null
  topDimensions: TopDimension[]
  hasDeclineWarning: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="mb-6">
    <SectionTitle title="趨勢摘要" spacing="sm" class="px-1" />
    <div class="bg-[var(--color-surface-elevated)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-light)]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-[var(--color-text)] flex items-center gap-2">
          <span class="text-2xl">📊</span> 認知趨勢
        </h3>
        <router-link
          v-if="props.hasSufficientData"
          to="/report"
          class="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors px-3 py-1.5 rounded-full hover:bg-[var(--color-primary)]/10"
        >
          查看詳情 →
        </router-link>
      </div>

      <div v-if="!props.hasSufficientData" class="p-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">🔒</span>
          <span class="text-base font-medium text-[var(--color-text)]">完成 {{ props.unlockProgress.remaining }} 場遊戲後解鎖</span>
        </div>
        <div class="h-3 bg-[var(--color-primary)]/10 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent-purple)] rounded-full transition-all duration-500 shadow-[var(--shadow-glow)]"
            :style="{ width: props.unlockProgress.percentage + '%' }"
          ></div>
        </div>
      </div>

      <template v-else-if="props.cognitiveTrend">
        <div v-if="props.hasDeclineWarning" class="mb-4 p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 rounded-xl flex items-start gap-3">
          <span class="text-2xl shrink-0">⚠️</span>
          <SubtleLabel text="偵測到部分能力有變化，建議保持每日訓練習慣。" class="pt-1" />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="dim in props.topDimensions"
            :key="dim.dimension"
            class="text-center p-3 bg-[var(--color-bg-soft)] rounded-2xl border border-[var(--color-border-light)]"
          >
            <span class="text-2xl mb-1 block filter drop-shadow-sm">{{ dim.icon }}</span>
            <p class="text-lg font-black" :class="dim.trendClass">{{ dim.score }}</p>
            <SubtleLabel :text="dim.name" tone="secondary" class="mt-0.5" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
