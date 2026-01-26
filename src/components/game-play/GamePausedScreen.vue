<template>
  <div class="game-content-fit">
    <div class="bg-[var(--color-surface)] rounded-2xl p-4 sm:p-6 lg:p-8 max-w-sm mx-auto border border-[var(--color-border)] text-center shadow-2xl">
      <div class="text-4xl sm:text-5xl mb-4">⏸️</div>
      <h2 class="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-[var(--color-text)]">遊戲暫停</h2>
      <div class="flex flex-col sm:flex-row gap-3">
        <button @click="onResume" class="btn btn-primary btn-lg flex-1">
          繼續遊戲
        </button>
        <button @click="onQuit" class="btn btn-danger btn-lg flex-1">
          結束遊戲
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  onResume: () => void
  onQuit: () => void
}>()
</script>
