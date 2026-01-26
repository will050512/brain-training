<template>
  <section class="flex-1 h-full flex flex-col gap-5 p-4 md:p-6 overflow-y-auto animate-fade-in w-full">
    <div class="shrink-0 space-y-1 pt-2">
      <h2 class="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
        <span>🧠</span> 選擇評估方式
      </h2>
      <p class="text-[var(--color-text-secondary)] text-sm">了解您的認知狀態，量身打造訓練計畫</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 shrink-0">
      <AssessmentSelectOptionCard
        icon="⏱️"
        title="Mini-Cog™ 快篩"
        description="透過詞語記憶與畫鐘測驗，快速篩檢認知功能狀態。"
        meta-label="⚡ 3 分鐘"
        recommended
        meta-variant="primary"
        @click="onStartMiniCog"
      />
      <AssessmentSelectOptionCard
        icon="📋"
        title="完整能力評估"
        description="全面測試反應、記憶與邏輯能力，提供詳細雷達圖分析。"
        meta-label="🎯 5 分鐘"
        @click="onStartFullAssessment"
      />
    </div>

    <div class="flex items-center gap-3 shrink-0 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] mt-2">
      <label class="text-base font-medium text-[var(--color-text-muted)] whitespace-nowrap">Mini-Cog 語言</label>
      <div class="relative flex-1">
        <select
          :value="selectedLanguage"
          class="w-full appearance-none bg-transparent text-[var(--color-text)] py-2 pl-2 pr-8 focus:outline-none text-base font-medium h-12"
          @change="onLanguageChange"
        >
          <option value="zh-TW">繁體中文</option>
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center text-[var(--color-text-muted)]">
          <svg class="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>

    <div v-if="hasRecentMiniCog" class="mt-auto pt-4 shrink-0 pb-2">
      <div class="bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <div class="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-lg">📊</div>
          <div>
            <p class="font-bold text-[var(--color-success)] text-sm mb-0.5">最近記錄</p>
            <p class="text-sm text-[var(--color-text-secondary)] opacity-80">{{ formatRecentMiniCogDate }}</p>
          </div>
        </div>
        <BaseButton
          variant="outline"
          size="md"
          class="border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white px-5 text-base"
          @click="onViewMiniCogHistory"
        >
          查看
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import AssessmentSelectOptionCard from '@/components/assessment/ui/AssessmentSelectOptionCard.vue'

const props = defineProps<{
  selectedLanguage: 'zh-TW' | 'zh-CN' | 'en'
  hasRecentMiniCog: boolean
  formatRecentMiniCogDate: string
  onStartMiniCog: () => void
  onStartFullAssessment: () => void
  onViewMiniCogHistory: () => void
}>()

const emit = defineEmits<{
  (event: 'update:selectedLanguage', value: 'zh-TW' | 'zh-CN' | 'en'): void
}>()

function onLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:selectedLanguage', target.value as typeof props.selectedLanguage)
}
</script>
