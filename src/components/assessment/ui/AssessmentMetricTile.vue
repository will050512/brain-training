<script setup lang="ts">
import { computed } from 'vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  icon: string
  label: string
  value: string | number
  valueClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  valueClass: ''
})

const valueClasses = computed(() => {
  return ['text-2xl font-black', props.valueClass || 'text-[var(--color-text)]'].join(' ')
})
</script>

<template>
  <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col items-center">
    <div class="text-xl mb-2 bg-[var(--color-bg-soft)] w-10 h-10 flex items-center justify-center rounded-full">
      {{ icon }}
    </div>
    <div :class="valueClasses">{{ value }}</div>
    <SubtleLabel :text="label" tone="muted" weight="bold" caps class="mt-1" />
  </div>
</template>
