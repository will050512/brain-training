<template>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-center px-4" style="color: var(--color-text-muted)">
      評估結果將幫助系統為您推薦合適的訓練難度
    </p>

    <button
      @click="onSelect('mini-cog')"
      class="card p-4 text-left transition-all relative overflow-hidden group border-2 touch-min"
      :class="assessmentChoice === 'mini-cog'
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
        : 'border-transparent hover:border-[var(--color-border)]'"
    >
      <div v-if="assessmentChoice === 'mini-cog'" class="absolute top-0 right-0 bg-[var(--color-primary)] text-[var(--color-text-inverse)] px-2 py-1 rounded-bl-lg font-bold">
        <SubtleLabel text="已選擇" size="xs" class="text-[var(--color-text-inverse)]" />
      </div>
      <div class="flex items-start gap-4">
        <span class="text-3xl mt-1">🧠</span>
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <p class="font-bold text-lg" style="color: var(--color-text)">Mini-Cog 認知篩檢</p>
            <span class="badge badge--success">強烈推薦</span>
          </div>
          <p class="text-sm mb-3" style="color: var(--color-text-secondary)">
            國際標準認知篩檢工具，包含詞語回憶與時鐘繪圖測試，約 3-5 分鐘。
          </p>
          <div class="flex flex-wrap gap-2">
            <span class="badge badge--neutral bg-[var(--color-surface)]">✓ 精準難度匹配</span>
            <span class="badge badge--neutral bg-[var(--color-surface)]">✓ 專業報告</span>
          </div>
        </div>
      </div>
    </button>

    <button
      @click="onSelect('quick')"
      class="card p-4 text-left transition-all border-2 touch-min"
      :class="assessmentChoice === 'quick'
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
        : 'border-transparent hover:border-[var(--color-border)]'"
    >
      <div class="flex items-start gap-4">
        <span class="text-2xl mt-1">⚡</span>
        <div class="flex-1">
          <p class="font-bold text-lg mb-1" style="color: var(--color-text)">3 分鐘快評</p>
          <p class="text-sm" style="color: var(--color-text-secondary)">
            透過題組快速評估反應/記憶/邏輯，可作為基線。
          </p>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import SubtleLabel from '@/components/common/SubtleLabel.vue'

defineProps<{
  assessmentChoice: 'mini-cog' | 'quick'
  onSelect: (value: 'mini-cog' | 'quick') => void
}>()
</script>
