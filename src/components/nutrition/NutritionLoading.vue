<template>
  <div class="py-12 text-center text-[var(--color-text-secondary)]">
    <div class="spinner mx-auto mb-4"></div>
    <p class="animate-pulse">正在分析您的需求...</p>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
