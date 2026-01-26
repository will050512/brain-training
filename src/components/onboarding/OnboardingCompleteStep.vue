<template>
  <div class="text-center pt-8">
    <div class="text-8xl mb-6 animate-pulse">🎉</div>
    <h1 class="title-lg mb-4">設定完成！</h1>
    <p class="text-lg mb-8" style="color: var(--color-text-secondary)">
      您的腦力訓練之旅即將開始<br>
      祝您訓練愉快！
    </p>

    <div v-if="assessmentResults.length > 0" class="card p-5 mb-4 text-left">
      <h3 class="font-bold mb-4 flex items-center gap-2" style="color: var(--color-text)">
        <span>📊</span> 您的初始評估
      </h3>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="result in assessmentResults" :key="result.dimension" class="text-center p-2 rounded-lg bg-[var(--color-bg-soft)]">
          <p class="text-2xl font-bold text-[var(--color-primary)]">{{ result.score }}</p>
          <SubtleLabel :text="result.dimension" size="xs" class="mt-1 capitalize opacity-70" style="color: var(--color-text)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'
import type { CognitiveDimension } from '@/types/cognitive'

defineProps<{
  assessmentResults: Array<{ dimension: CognitiveDimension; score: number; accuracy: number; responseTime: number }>
}>()
</script>
