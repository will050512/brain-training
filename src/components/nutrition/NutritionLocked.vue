<template>
  <div class="card p-8 section-stack items-center text-center">
    <div class="text-6xl mb-2 animate-bounce">🔒</div>
    <h2 class="text-lg font-bold">功能尚未解鎖</h2>
    <p class="text-[var(--color-text-secondary)] text-sm max-w-xs mx-auto">
      為了提供精準的個人化營養建議，我們需要收集更多您的訓練數據。
    </p>

    <div class="w-full max-w-xs bg-[var(--color-surface-soft)] rounded-full h-3 overflow-hidden mt-4">
      <div
        class="h-full bg-primary transition-all duration-1000"
        :style="{ width: `${progressPercent}%` }"
      ></div>
    </div>
    <p class="text-xs font-bold text-primary mt-2">
      訓練進度：{{ completedSessionsCount }} / {{ requiredSessions }} 場
    </p>

    <div class="bg-[var(--color-surface-soft)] p-4 rounded-xl text-left w-full max-w-xs mt-2">
      <h3 class="font-bold text-sm mb-2">解鎖後您將獲得：</h3>
      <ul class="list-disc pl-5 text-xs space-y-1 text-[var(--color-text-secondary)]">
        <li>✨ 基於認知表現的精準營養建議</li>
        <li>💊 針對弱項維度的補充方案</li>
        <li>👨‍⚕️ 專業醫師與營養師的建議</li>
      </ul>
    </div>

    <button class="btn btn-primary w-full max-w-xs mt-4 min-h-[44px]" @click="onGoTraining">
      前往每日訓練
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  completedSessionsCount: number
  requiredSessions: number
  onGoTraining: () => void
}>()

const progressPercent = computed(() =>
  Math.min((props.completedSessionsCount / props.requiredSessions) * 100, 100)
)
</script>
