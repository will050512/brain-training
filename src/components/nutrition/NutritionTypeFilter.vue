<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  show: boolean
  supplementTypes: string[]
  selectedType: string
  typeNames: Record<string, string>
  getTypeIcon: (type: string) => string
  onSelect: (value: string) => void
}>()
</script>

<template>
  <div
    v-if="show"
    class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 mask-fade-sides"
  >
    <BaseButton
      v-for="t in supplementTypes"
      :key="t"
      size="sm"
      class="whitespace-nowrap rounded-full min-h-[36px] px-4"
      :variant="selectedType === t ? 'primary' : 'secondary'"
      :class="selectedType === t ? '' : 'bg-surface border-transparent'"
      @click="onSelect(t)"
    >
      {{ t !== 'all' ? getTypeIcon(t) : '📋' }}
      {{ typeNames[t] || t }}
    </BaseButton>
  </div>
</template>

<style scoped>
.mask-fade-sides {
  mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
}
</style>
