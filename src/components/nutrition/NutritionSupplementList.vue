<template>
  <div v-if="show" class="section-stack">
    <div
      v-for="supplement in supplements"
      :key="supplement.type"
      class="card p-4 relative overflow-hidden transition-all"
      :class="{ 'ring-2 ring-primary ring-offset-2': supplement.isPartnerProduct }"
    >
      <div v-if="supplement.isPartnerProduct" class="absolute top-0 right-0 bg-primary text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">
        合作夥伴
      </div>

      <div class="flex gap-3 items-start">
        <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
          {{ getTypeIcon(supplement.type) }}
        </span>
        <div class="flex-1 min-w-0 space-y-2">
          <div class="pr-16">
            <h3 class="text-lg font-bold truncate leading-tight">{{ supplement.name }}</h3>
            <div class="text-xs text-[var(--color-text-secondary)] flex flex-wrap items-center gap-1 mt-1">
              {{ supplement.nameEn }}
              <span v-if="supplement.partnerName" class="text-primary font-bold">
                by {{ supplement.partnerName }}
              </span>
            </div>
          </div>

          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {{ supplement.description }}
          </p>

          <div class="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 text-sm bg-[var(--color-surface-soft)] p-3 rounded-lg">
            <div class="flex flex-col gap-1">
              <span class="text-xs text-[var(--color-text-secondary)]">針對維度</span>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="dim in supplement.relatedDimensions"
                  :key="dim"
                  class="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-[var(--color-border)]"
                >
                  {{ dimensionNames[dim] }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs text-[var(--color-text-secondary)]">建議劑量</span>
              <span class="font-medium text-xs">{{ supplement.dosageRange }}</span>
            </div>

            <div class="flex flex-col gap-1 col-span-2">
              <span class="text-xs text-[var(--color-text-secondary)]">主要功效</span>
              <span class="text-[var(--color-text)]">{{ supplement.benefits.join('、') }}</span>
            </div>
          </div>

          <details v-if="supplement.precautions.length > 0 || supplement.interactions.length > 0" class="group">
            <summary class="text-xs font-bold text-[var(--color-warning)] cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
              <span class="transition-transform group-open:rotate-90 text-[10px]">▶</span>
              <span>⚠️ 注意事項</span>
            </summary>
            <div class="mt-1 pl-8 pr-2 text-xs text-[var(--color-text-secondary)] space-y-2 pb-2">
              <div v-if="supplement.precautions.length">
                <div class="font-bold text-[var(--color-warning)]">注意事項</div>
                <ul class="list-disc pl-4 space-y-1">
                  <li v-for="(w, i) in supplement.precautions" :key="i">{{ w }}</li>
                </ul>
              </div>
              <div v-if="supplement.interactions.length">
                <div class="font-bold text-[var(--color-info)]">可能交互作用</div>
                <ul class="list-disc pl-4 space-y-1">
                  <li v-for="(w, i) in supplement.interactions" :key="i">{{ w }}</li>
                </ul>
              </div>
            </div>
          </details>

          <div v-if="supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
            <button
              v-if="supplement.partnerUrl"
              class="btn btn-sm btn-secondary min-h-[44px]"
              @click="onOpenPartner(supplement.partnerUrl)"
            >
              👨‍⚕️ 了解更多
            </button>
            <button
              class="btn btn-sm btn-primary min-h-[44px]"
              :class="{ 'col-span-2': !supplement.partnerUrl }"
              :disabled="!supplement.shopUrl"
              @click="onOpenShop(supplement.shopUrl || '')"
            >
              🛒 {{ supplement.shopUrl ? '立即購買' : '即將上線' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CognitiveDimension } from '@/types/cognitive'
import type { SupplementInfo } from '@/services/nutritionPlaceholder'

defineProps<{
  show: boolean
  supplements: SupplementInfo[]
  dimensionNames: Record<CognitiveDimension, string>
  getTypeIcon: (type: string) => string
  onOpenPartner: (url: string) => void
  onOpenShop: (url: string) => void
}>()
</script>
