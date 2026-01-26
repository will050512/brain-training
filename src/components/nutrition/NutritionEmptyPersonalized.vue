<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'

defineProps<{
  show: boolean
  onShowAll: () => void
}>()
</script>

<template>
  <div v-if="show" class="card text-center py-12 px-4">
    <div class="text-6xl mb-4">✨</div>
    <SectionTitle title="目前沒有特別建議" spacing="sm" :show-accent="false" class="justify-center" />
    <p class="text-[var(--color-text-secondary)] text-sm mb-6">
      根據您的訓練表現，目前沒有特別需要加強的營養素。<br>持續保持良好的訓練習慣！
    </p>
    <BaseButton variant="outline" size="md" @click="onShowAll">
      瀏覽所有營養素 →
    </BaseButton>
  </div>
</template>
