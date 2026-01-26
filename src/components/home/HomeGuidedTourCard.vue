<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SubtleLabel from '@/components/common/SubtleLabel.vue'

const emit = defineEmits<{
  (e: 'dismiss'): void
  (e: 'open'): void
}>()
</script>

<template>
  <div class="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-[180px]">
        <div class="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1">
          <SubtleLabel text="新手導覽" class="text-[var(--color-primary)]" />
        </div>
        <h2 class="text-lg font-bold text-[var(--color-text)] mt-2">使用說明</h2>
        <SubtleLabel text="依序完成這幾步，操作更安心。" tone="secondary" class="mt-1 block" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton
          type="button"
          variant="secondary"
          size="sm"
          class="min-h-[44px] px-4"
          @click="emit('dismiss')"
        >
          不再提示
        </BaseButton>
        <BaseButton
          type="button"
          size="sm"
          class="min-h-[44px] px-5"
          @click="emit('open')"
        >
          開啟教學
        </BaseButton>
      </div>
    </div>
    <div class="mt-4 grid gap-3">
      <div class="flex items-start gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
        <div class="h-10 w-10 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center text-lg font-bold">
          1
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[var(--color-text)]">先完成能力評估</p>
          <SubtleLabel text="系統會自動調整適合的難度。" tone="secondary" class="mt-1 block" />
        </div>
      </div>
      <div class="flex items-start gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
        <div class="h-10 w-10 rounded-full bg-[var(--color-accent-warm)]/20 text-[var(--color-accent-warm)] flex items-center justify-center text-lg font-bold">
          2
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[var(--color-text)]">每天做今日訓練</p>
          <SubtleLabel text="累積成就與認知趨勢。" tone="secondary" class="mt-1 block" />
        </div>
      </div>
      <div class="flex items-start gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
        <div class="h-10 w-10 rounded-full bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] flex items-center justify-center text-lg font-bold">
          3
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-[var(--color-text)]">記好登入碼</p>
          <SubtleLabel text="換設備也能還原完整資料。" tone="secondary" class="mt-1 block" />
        </div>
      </div>
    </div>
  </div>
</template>
