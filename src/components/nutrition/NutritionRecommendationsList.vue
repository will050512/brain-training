<template>
  <div v-if="show" class="section-stack">
    <div
      v-for="rec in recommendations"
      :key="rec.id"
      class="card p-4 relative overflow-hidden transition-all active:scale-[0.99]"
      :class="{ 'ring-2 ring-primary ring-offset-2': rec.supplement.isPartnerProduct }"
    >
      <div
        class="absolute top-0 right-0 rounded-bl-xl px-3 py-1 text-xs font-bold"
        :class="getPriorityClass(rec.priority)"
      >
        {{ getPriorityText(rec.priority) }}
      </div>

      <div class="flex gap-3 items-start mt-2">
        <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
          {{ getTypeIcon(rec.supplement.type) }}
        </span>
        <div class="flex-1 min-w-0 space-y-2">
          <div class="pr-16">
            <h3 class="text-lg font-bold truncate leading-tight">{{ rec.supplement.name }}</h3>
            <div class="text-xs text-[var(--color-text-secondary)] flex flex-wrap items-center gap-1 mt-1">
              {{ rec.supplement.nameEn }}
              <span v-if="rec.supplement.partnerName" class="text-primary font-medium px-1.5 py-0.5 bg-[var(--color-surface-soft)] rounded">
                by {{ rec.supplement.partnerName }}
              </span>
            </div>
          </div>

          <div class="p-3 bg-[var(--color-surface-soft)] rounded-lg border-l-2 border-primary/30">
            <span class="text-xs font-bold text-primary block mb-1">📋 建議原因</span>
            <p class="text-sm text-[var(--color-text)] leading-relaxed m-0">
              {{ rec.reason }}
            </p>
          </div>

          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {{ rec.supplement.description }}
          </p>

          <div class="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 text-sm bg-[var(--color-surface-soft)] p-3 rounded-lg">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-[var(--color-text-secondary)]">針對維度</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="dim in rec.supplement.relatedDimensions"
                  :key="dim"
                  class="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-[var(--color-border)]"
                >
                  {{ dimensionNames[dim] }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs text-[var(--color-text-secondary)]">建議劑量</span>
              <span class="font-medium text-xs">{{ rec.supplement.dosageRange }}</span>
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <details v-if="rec.supplement.precautions.length > 0" class="group">
              <summary class="text-xs font-bold text-[var(--color-warning)] cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
                <span>⚠️ 注意事項</span>
              </summary>
              <ul class="mt-1 pl-8 pr-2 text-xs text-[var(--color-text-secondary)] list-disc space-y-1 pb-2">
                <li v-for="(warning, idx) in rec.supplement.precautions" :key="idx">
                  {{ warning }}
                </li>
              </ul>
            </details>

            <details v-if="rec.supplement.interactions.length > 0" class="group">
              <summary class="text-xs font-bold text-[var(--color-info)] cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
                <span>💊 可能交互作用</span>
              </summary>
              <ul class="mt-1 pl-8 pr-2 text-xs text-[var(--color-text-secondary)] list-disc space-y-1 pb-2">
                <li v-for="(interaction, idx) in rec.supplement.interactions" :key="idx">
                  {{ interaction }}
                </li>
              </ul>
            </details>
          </div>

          <div v-if="rec.supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
            <button
              v-if="rec.supplement.partnerUrl"
              class="btn btn-sm btn-secondary min-h-[44px]"
              @click="onOpenPartner(rec.supplement.partnerUrl)"
            >
              👨‍⚕️ 了解更多
            </button>
            <button
              class="btn btn-sm btn-primary min-h-[44px]"
              :class="{ 'col-span-2': !rec.supplement.partnerUrl }"
              :disabled="!rec.supplement.shopUrl"
              @click="onOpenShop(rec.supplement.shopUrl || '')"
            >
              🛒 {{ rec.supplement.shopUrl ? '立即購買' : '即將上線' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'
import type { NutritionRecommendation } from '@/services/nutritionPlaceholder'

defineProps<{
  show: boolean
  recommendations: NutritionRecommendation[]
  dimensionNames: Record<CognitiveDimension, string>
  getTypeIcon: (type: string) => string
  getPriorityClass: (priority: string) => string
  getPriorityText: (priority: string) => string
  onOpenPartner: (url: string) => void
  onOpenShop: (url: string) => void
}>()
</script>
