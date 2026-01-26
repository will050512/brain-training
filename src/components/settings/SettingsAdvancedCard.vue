<script setup lang="ts">
interface Props {
  isLoggedIn: boolean
  resetWelcome: () => void
  confirmClearData: () => void | Promise<void>
}

const props = defineProps<Props>()
</script>

<template>
  <div class="card p-3 sm:p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xl">⚙️</span>
      <h3 class="font-semibold text-[var(--color-text)]">進階操作</h3>
    </div>

    <div class="flex flex-col gap-2">
      <button
        type="button"
        class="btn bg-[var(--color-bg-soft)] text-[var(--color-text)] hover:bg-[var(--color-border-light)] w-full py-3 text-sm font-medium rounded-xl transition-colors text-left px-4 flex justify-between items-center"
        @click="props.resetWelcome"
      >
        <span>重新顯示歡迎畫面</span>
        <span class="text-[var(--color-text-muted)]">→</span>
      </button>

      <button
        v-if="props.isLoggedIn"
        type="button"
        class="btn bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:opacity-80 dark:hover:bg-[var(--color-danger-bg)] dark:hover:opacity-80 w-full py-3 text-sm font-medium rounded-xl transition-colors text-left px-4 flex justify-between items-center"
        @click="props.confirmClearData"
      >
        <span>清除所有遊戲記錄</span>
        <span>🗑️</span>
      </button>
    </div>
  </div>
</template>
