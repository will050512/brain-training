<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface ScoreItem {
  label: string
  value: number
  max: number
}

interface Props {
  title: string
  subtitle?: string
  interpretationLabel: string
  interpretationColor: string
  total: number
  totalMax: number
  items: ScoreItem[]
}

withDefaults(defineProps<Props>(), {
  subtitle: ''
})
</script>

<template>
  <section class="bg-[var(--color-surface-elevated)] rounded-3xl p-5 shadow-sm border border-[var(--color-border-light)] overflow-hidden">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h2 class="text-lg font-bold text-[var(--color-text)]">{{ title }}</h2>
        <SubtleLabel v-if="subtitle" :text="subtitle" tone="secondary" class="mt-1 block" />
      </div>
      <div
        class="text-sm font-bold px-3 py-1 rounded-full border"
        :style="{
          color: interpretationColor,
          borderColor: interpretationColor,
          backgroundColor: 'var(--color-bg-soft)'
        }"
      >
        {{ interpretationLabel }}
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-6 items-center">
      <div
        class="w-32 h-32 rounded-full border-8 flex flex-col items-center justify-center shrink-0"
        :style="{ borderColor: interpretationColor }"
      >
        <span class="text-4xl font-black text-[var(--color-text)]">{{ total }}</span>
        <SubtleLabel :text="`/ ${totalMax}`" tone="secondary" weight="bold" />
      </div>

      <div class="w-full grid grid-cols-2 gap-3">
        <div
          v-for="item in items"
          :key="item.label"
          class="p-2 bg-[var(--color-bg-soft)] rounded-xl flex justify-between items-center"
        >
          <SubtleLabel :text="item.label" tone="secondary" weight="bold" class="truncate mr-2" />
          <span class="text-sm font-bold text-[var(--color-text)] shrink-0">
            {{ item.value }}
            <SubtleLabel :text="`/${item.max}`" size="xs" tone="muted" />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
