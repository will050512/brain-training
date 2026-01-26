<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
    <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">
      {{ icon }}
    </span>
    <div>
      <div class="font-bold text-[var(--color-text)] text-lg">{{ title }}</div>
      <div class="text-sm text-[var(--color-text-muted)] mt-1">{{ description }}</div>
    </div>
  </div>
</template>
