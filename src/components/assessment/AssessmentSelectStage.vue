<template>
  <section class="flex-1 h-full flex flex-col gap-5 p-4 md:p-6 overflow-y-auto animate-fade-in w-full">
    <div class="shrink-0 space-y-1 pt-2">
      <h2 class="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
        <span>🧠</span> 選擇評估方式
      </h2>
      <p class="text-[var(--color-text-secondary)] text-sm">了解您的認知狀態，量身打造訓練計畫</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 shrink-0">
      <button
        class="card text-left p-5 relative group transition-all duration-300 border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)] active:scale-[0.98] bg-[var(--color-surface)] shadow-sm min-h-[140px]"
        @click="onStartMiniCog"
      >
        <div class="absolute -top-2 -right-2 z-10">
          <span class="bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-xs font-bold px-2 py-1 rounded-lg shadow-sm animate-pulse">
            推薦
          </span>
        </div>
        <div class="flex items-start gap-4">
          <div class="text-4xl bg-[var(--color-primary-bg)] w-14 h-14 flex items-center justify-center rounded-xl shrink-0">⏱️</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-[var(--color-text)] leading-tight mb-1">Mini-Cog™ 快篩</h3>
            <div class="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] mt-2">
              <span class="bg-[var(--color-primary-bg)] px-2 py-1 rounded text-sm">⚡ 3 分鐘</span>
            </div>
          </div>
        </div>
        <p class="text-sm text-[var(--color-text-secondary)] mt-4 leading-relaxed line-clamp-2">
          透過詞語記憶與畫鐘測驗，快速篩檢認知功能狀態。
        </p>
      </button>

      <button
        class="card text-left p-5 group transition-all duration-300 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 active:scale-[0.98] bg-[var(--color-surface)] shadow-sm min-h-[140px]"
        @click="onStartFullAssessment"
      >
        <div class="flex items-start gap-4">
          <div class="text-4xl bg-[var(--color-bg-muted)] w-14 h-14 flex items-center justify-center rounded-xl shrink-0">📋</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-[var(--color-text)] leading-tight mb-1">完整能力評估</h3>
            <div class="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mt-2">
              <span class="bg-[var(--color-bg-muted)] px-2 py-1 rounded text-sm">🎯 5 分鐘</span>
            </div>
          </div>
        </div>
        <p class="text-sm text-[var(--color-text-secondary)] mt-4 leading-relaxed line-clamp-2">
          全面測試反應、記憶與邏輯能力，提供詳細雷達圖分析。
        </p>
      </button>
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
        <button
          class="btn btn-sm btn-outline border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white h-12 min-h-[48px] px-5 text-base"
          @click="onViewMiniCogHistory"
        >
          查看
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
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
