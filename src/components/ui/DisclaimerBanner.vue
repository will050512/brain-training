<template>
  <div class="disclaimer-banner alert alert--warning px-4 py-3">
    <div class="container mx-auto">
      <div class="flex items-start gap-3">
        <span class="text-amber-600 dark:text-amber-400 text-xl flex-shrink-0">⚠️</span>
        <div class="alert__content text-sm">
          <p class="alert__title">重要聲明</p>
          <p>
            本系統提供的 MMSE/MoCA/CASI 分數為基於遊戲表現的估算值，僅供參考，
            <strong>不可作為醫療診斷依據</strong>。如有認知功能相關疑慮，請諮詢專業醫師或職能治療師進行正式評估。
          </p>
        </div>
        <button 
          v-if="dismissible"
          @click="emit('dismiss')" 
          class="alert__action flex-shrink-0 transition-colors"
          aria-label="關閉"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dismissible?: boolean
}>()

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<style scoped>
.disclaimer-banner {
  font-size: var(--font-size-base, 16px);
}
</style>
