<template>
  <div
    v-if="show"
    class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 mask-fade-sides"
  >
    <button
      v-for="t in supplementTypes"
      :key="t"
      class="btn btn-sm whitespace-nowrap rounded-full min-h-[36px] px-4"
      :class="selectedType === t ? 'btn-primary' : 'btn-secondary bg-surface border-transparent'"
      @click="onSelect(t)"
    >
      {{ t !== 'all' ? getTypeIcon(t) : '📋' }}
      {{ typeNames[t] || t }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  supplementTypes: string[]
  selectedType: string
  typeNames: Record<string, string>
  getTypeIcon: (type: string) => string
  onSelect: (value: string) => void
}>()
</script>

<style scoped>
.mask-fade-sides {
  mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
}
</style>
