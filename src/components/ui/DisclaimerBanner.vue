<template>
  <div class="disclaimer-banner bg-amber-50 border-t border-amber-200 px-4 py-3">
    <div class="container mx-auto">
      <div class="flex items-start gap-3">
        <span class="text-amber-600 text-xl flex-shrink-0">⚠️</span>
        <div class="flex-1 text-sm text-amber-800">
          <p class="font-medium mb-1">重要聲明</p>
          <p>
            本系統提供的 MMSE/MoCA/CASI 分數為基於遊戲表現的估算值，僅供參考，
            <strong>不可作為醫療診斷依據</strong>。如有認知功能相關疑慮，請諮詢專業醫師或職能治療師進行正式評估。
          </p>
        </div>
        <button 
          v-if="dismissible"
          @click="emit('dismiss')" 
          class="text-amber-600 hover:text-amber-800 flex-shrink-0"
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
