<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'
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

<template>
  <div v-if="show" class="section-stack">
    <div
      v-for="rec in recommendations"
      :key="rec.id"
      class="card p-4 relative overflow-hidden transition-all active:scale-[0.99]"
      :class="{ 'ring-2 ring-primary ring-offset-2': rec.supplement.isPartnerProduct }"
    >
      <div
        class="absolute top-0 right-0 rounded-bl-xl px-3 py-1"
        :class="getPriorityClass(rec.priority)"
      >
        <SubtleLabel :text="getPriorityText(rec.priority)" size="xs" weight="bold" />
      </div>

      <div class="flex gap-3 items-start mt-2">
        <span class="emoji-tile text-3xl bg-[var(--color-surface-soft)] shrink-0 rounded-xl w-14 h-14 flex items-center justify-center">
          {{ getTypeIcon(rec.supplement.type) }}
        </span>
        <div class="flex-1 min-w-0 space-y-2">
          <div class="pr-16">
            <SectionTitle
              :title="rec.supplement.name"
              as="h3"
              size="md"
              spacing="none"
              :show-accent="false"
              class="truncate leading-tight"
            />
            <div class="flex flex-wrap items-center gap-1 mt-1">
              <SubtleLabel :text="rec.supplement.nameEn" tone="secondary" />
              <span v-if="rec.supplement.partnerName" class="px-1.5 py-0.5 bg-[var(--color-surface-soft)] rounded">
                <SubtleLabel :text="`by ${rec.supplement.partnerName}`" class="text-primary" />
              </span>
            </div>
          </div>

          <div class="p-3 bg-[var(--color-surface-soft)] rounded-lg border-l-2 border-primary/30">
            <SectionTitle
              title="建議原因"
              as="h4"
              size="sm"
              spacing="none"
              :show-accent="false"
              class="text-primary"
            >
              <template #prefix>
                <span>📋</span>
              </template>
            </SectionTitle>
            <p class="text-sm text-[var(--color-text)] leading-relaxed m-0">
              {{ rec.reason }}
            </p>
          </div>

          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {{ rec.supplement.description }}
          </p>

          <div class="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 text-sm bg-[var(--color-surface-soft)] p-3 rounded-lg">
            <div class="flex flex-col gap-1">
              <SubtleLabel text="針對維度" tone="secondary" />
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="dim in rec.supplement.relatedDimensions"
                  :key="dim"
                  class="px-1.5 py-0.5 rounded bg-surface border border-[var(--color-border)]"
                >
                  <SubtleLabel :text="dimensionNames[dim]" size="xs" />
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <SubtleLabel text="建議劑量" tone="secondary" />
              <SubtleLabel :text="rec.supplement.dosageRange" size="sm" weight="bold" />
            </div>
          </div>

          <div class="space-y-2 pt-1">
            <details v-if="rec.supplement.precautions.length > 0" class="group">
              <summary class="cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                <span class="transition-transform group-open:rotate-90 text-[length:calc(var(--font-size-base)*0.8)]">▶</span>
                <SubtleLabel text="⚠️ 注意事項" tone="secondary" weight="bold" class="text-[var(--color-warning)]" />
              </summary>
              <ul class="mt-1 pl-8 pr-2 list-disc space-y-1 pb-2">
                <li v-for="(warning, idx) in rec.supplement.precautions" :key="idx">
                  <SubtleLabel :text="warning" tone="secondary" class="block" />
                </li>
              </ul>
            </details>

            <details v-if="rec.supplement.interactions.length > 0" class="group">
              <summary class="cursor-pointer list-none flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-soft)] transition-colors select-none">
                <span class="transition-transform group-open:rotate-90 text-[length:calc(var(--font-size-base)*0.8)]">▶</span>
                <SubtleLabel text="💊 可能交互作用" tone="secondary" weight="bold" class="text-[var(--color-info)]" />
              </summary>
              <ul class="mt-1 pl-8 pr-2 list-disc space-y-1 pb-2">
                <li v-for="(interaction, idx) in rec.supplement.interactions" :key="idx">
                  <SubtleLabel :text="interaction" tone="secondary" class="block" />
                </li>
              </ul>
            </details>
          </div>

          <div v-if="rec.supplement.isPartnerProduct" class="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-[var(--color-border)]">
            <BaseButton
              v-if="rec.supplement.partnerUrl"
              variant="secondary"
              size="sm"
              @click="onOpenPartner(rec.supplement.partnerUrl)"
            >
              👨‍⚕️ 了解更多
            </BaseButton>
            <BaseButton
              size="sm"
              :class="{ 'col-span-2': !rec.supplement.partnerUrl }"
              :disabled="!rec.supplement.shopUrl"
              @click="onOpenShop(rec.supplement.shopUrl || '')"
            >
              🛒 {{ rec.supplement.shopUrl ? '立即購買' : '即將上線' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
