<template>
  <header class="flex items-center gap-3 min-h-[44px]">
    <button class="btn btn-ghost btn-circle" @click="onBack">
      <span class="text-xl">←</span>
    </button>
    <h1 class="text-xl font-bold m-0 text-primary">🥗 營養建議</h1>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  onBack: () => void
}>()
</script>
