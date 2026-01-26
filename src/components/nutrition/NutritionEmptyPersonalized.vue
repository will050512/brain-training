<template>
  <div v-if="show" class="card text-center py-12 px-4">
    <div class="text-6xl mb-4">✨</div>
    <h3 class="font-bold text-lg mb-2">目前沒有特別建議</h3>
    <p class="text-[var(--color-text-secondary)] text-sm mb-6">
      根據您的訓練表現，目前沒有特別需要加強的營養素。<br>持續保持良好的訓練習慣！
    </p>
    <button class="btn btn-outline min-h-[44px]" @click="onShowAll">
      瀏覽所有營養素 →
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  onShowAll: () => void
}>()
</script>
