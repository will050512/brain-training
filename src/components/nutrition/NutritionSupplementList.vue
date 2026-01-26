<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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

<template>
  <div v-if="show" class="section-stack">
    <div
      v-for="supplement in supplements"
      :key="supplement.type"
      class="card p-4 relative overflow-hidden transition-all"
      :class="{ 'ring-2 ring-primary ring-offset-2': supplement.isPartnerProduct }"
    >
      <div v-if="supplement.isPartnerProduct" class="absolute top-0 right-0 bg-primary text-white px-2 py-1 rounded-bl-lg">
        <SubtleLabel text="合作夥伴" size="xs" weight="bold" />
      </div>

      <div class="flex gap-3 items-start">
        <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
          {{ getTypeIcon(supplement.type) }}
        </span>
        <div class="flex-1 min-w-0 space-y-2">
          <div class="pr-16">
            <SectionTitle
              :title="supplement.name"
              as="h3"
              size="md"
              spacing="none"
              :show-accent="false"
              class="truncate leading-tight"
            />
            <div class="flex flex-wrap items-center gap-1 mt-1">
              <SubtleLabel :text="supplement.nameEn" tone="secondary" />
              <span v-if="supplement.partnerName">
                <SubtleLabel :text="`by ${supplement.partnerName}`" class="text-primary" />
              </span>
            </div>
          </div>

          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {{ supplement.description }}
          </p>

          <div class="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 text-sm bg-[var(--color-surface-soft)] p-3 rounded-lg">
            <div class="flex flex-col gap-1">
              <SubtleLabel text="針對維度" tone="secondary" />
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="dim in supplement.relatedDimensions"
                  :key="dim"
                  class="px-1.5 py-0.5 rounded bg-surface border border-[var(--color-border)]"
                >
                  <SubtleLabel :text="dimensionNames[dim]" size="xs" />
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <SubtleLabel text="建議劑量" tone="secondary" />
              <SubtleLabel :text="supplement.dosageRange" size="sm" weight="bold" />
            </div>

            <div class="flex flex-col gap-1 col-span-2">
              <SubtleLabel text="主要功效" tone="secondary" />
              <span class="text-[var(--color-text)]">{{ supplement.benefits.join('、') }}</span>
            </div>
          </div>

          <details v-if="supplement.precautions.length > 0 || supplement.interactions.length > 0" class="group">
            <summary class="cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
              <span class="transition-transform group-open:rotate-90 text-[length:calc(var(--font-size-base)*0.8)]">▶</span>
              <SubtleLabel text="⚠️ 注意事項" tone="secondary" weight="bold" class="text-[var(--color-warning)]" />
            </summary>
            <div class="mt-1 pl-8 pr-2 space-y-2 pb-2">
              <div v-if="supplement.precautions.length">
                <SubtleLabel text="注意事項" tone="secondary" weight="bold" class="text-[var(--color-warning)]" />
                <ul class="list-disc pl-4 space-y-1">
                  <li v-for="(w, i) in supplement.precautions" :key="i">
                    <SubtleLabel :text="w" tone="secondary" class="block" />
                  </li>
                </ul>
              </div>
              <div v-if="supplement.interactions.length">
                <SubtleLabel text="可能交互作用" tone="secondary" weight="bold" class="text-[var(--color-info)]" />
                <ul class="list-disc pl-4 space-y-1">
                  <li v-for="(w, i) in supplement.interactions" :key="i">
                    <SubtleLabel :text="w" tone="secondary" class="block" />
                  </li>
                </ul>
              </div>
            </div>
          </details>

          <div v-if="supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
            <BaseButton
              v-if="supplement.partnerUrl"
              variant="secondary"
              size="sm"
              @click="onOpenPartner(supplement.partnerUrl)"
            >
              👨‍⚕️ 了解更多
            </BaseButton>
            <BaseButton
              size="sm"
              :class="{ 'col-span-2': !supplement.partnerUrl }"
              :disabled="!supplement.shopUrl"
              @click="onOpenShop(supplement.shopUrl || '')"
            >
              🛒 {{ supplement.shopUrl ? '立即購買' : '即將上線' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
