<script setup lang="ts">
import { computed } from 'vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  label: string
  count: number
}

const props = defineProps<Props>()

const isActive = computed(() => props.count > 0)
</script>

<template>
  <div
    class="aspect-[3/4] rounded-xl flex flex-col items-center justify-center border transition-all"
    :class="isActive
      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm scale-105'
      : 'bg-[var(--color-surface-elevated)] border-[var(--color-border-light)] opacity-60'"
  >
    <SubtleLabel
      :text="label"
      weight="bold"
      class="mb-1"
      :class="isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'"
    />
    <span class="text-xl font-black text-[var(--color-text)]">{{ count }}</span>
  </div>
</template>
