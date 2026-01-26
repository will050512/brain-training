<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'

interface Props {
  appVersion: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="text-center py-6 pb-10">
    <img src="@/assets/logo.svg" alt="愛護腦" class="w-12 h-12 mx-auto mb-3 opacity-80 filter grayscale hover:grayscale-0 transition-all duration-500" />
    <p class="font-bold text-[var(--color-text)] text-sm mb-1">愛護腦 AI MindCare</p>
    <SubtleLabel :text="`v${props.appVersion}`" tone="muted" />
  </div>
</template>
