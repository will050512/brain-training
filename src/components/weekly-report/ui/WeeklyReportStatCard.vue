<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  icon: string
  value: string | number
  label: string
}

defineProps<Props>()
</script>

<template>
  <div class="bg-[var(--color-surface-elevated)] p-4 rounded-2xl shadow-sm border border-[var(--color-border-light)] flex flex-col items-center text-center">
    <span class="text-2xl mb-2">{{ icon }}</span>
    <span class="text-2xl font-black text-[var(--color-text)]">{{ value }}</span>
    <SubtleLabel :text="label" tone="secondary" />
  </div>
</template>
