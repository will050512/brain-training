<template>
  <section class="flex-1 flex flex-col p-4 md:p-6 w-full animate-slide-up overflow-y-auto">
    <div class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-lg flex flex-col min-h-full sm:min-h-0 rounded-2xl">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-[var(--color-primary-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner shrink-0">
          🧠
        </div>
        <h2 class="text-2xl font-bold mb-3 text-[var(--color-text)]">準備好了嗎？</h2>
        <p class="text-[var(--color-text-secondary)] text-base leading-relaxed">
          將進行三個簡單測驗，<br/>幫助系統了解您目前的狀態。
        </p>
      </div>

      <div class="space-y-4 mb-8 flex-1">
        <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
          <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">⚡</span>
          <div>
            <div class="font-bold text-[var(--color-text)] text-lg">反應力</div>
            <div class="text-sm text-[var(--color-text-muted)] mt-1">快速選擇看到的顏色</div>
          </div>
        </div>
        <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
          <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">🧠</span>
          <div>
            <div class="font-bold text-[var(--color-text)] text-lg">記憶力</div>
            <div class="text-sm text-[var(--color-text-muted)] mt-1">記住數字序列並輸入</div>
          </div>
        </div>
        <div class="flex items-center gap-5 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]/50">
          <span class="text-3xl bg-white rounded-xl w-12 h-12 flex items-center justify-center shadow-sm shrink-0">🧩</span>
          <div>
            <div class="font-bold text-[var(--color-text)] text-lg">邏輯力</div>
            <div class="text-sm text-[var(--color-text-muted)] mt-1">簡單的數學計算</div>
          </div>
        </div>
      </div>

      <div class="space-y-4 shrink-0">
        <button @click="onStart" class="btn btn-primary btn-lg w-full text-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[60px]">
          開始測試
        </button>
        <button @click="onBack" class="btn btn-ghost w-full min-h-[50px] text-[var(--color-text-muted)] text-base">
          稍後再說
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  onStart: () => void
  onBack: () => void
}>()
</script>
