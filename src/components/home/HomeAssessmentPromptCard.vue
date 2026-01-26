<template>
  <div class="mb-5">
    <div class="bg-gradient-to-r from-[var(--color-accent-warm)] to-[var(--color-coordination)] rounded-2xl p-4 text-[var(--color-text-inverse)] shadow-md">
      <div class="flex items-center gap-3 mb-3">
        <span class="text-3xl">🧪</span>
        <div>
          <h2 class="font-bold">認知評估</h2>
          <p class="text-[var(--color-bg-soft)] text-sm opacity-90">完成評估後即可開始訓練</p>
        </div>
      </div>

      <router-link
        to="/assessment"
        class="block w-full py-3 bg-[var(--color-surface)] text-[var(--color-accent-warm)] rounded-xl font-bold text-center
               hover:bg-[var(--color-bg-soft)] transition-colors shadow-md text-base"
      >
        開始評估（約 5 分鐘）
      </router-link>
    </div>
  </div>
</template>
