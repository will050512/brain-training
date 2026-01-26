<script setup lang="ts">
interface Props {
  isLoggedIn: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="mb-6">
    <h2 class="text-lg font-bold text-[var(--color-text)] px-1 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-6 rounded-full bg-[var(--color-primary)]"></span>
      快速開始
    </h2>
    <div class="space-y-3">
      <template v-if="props.isLoggedIn">
        <router-link to="/games" class="btn btn-primary btn-lg w-full shadow-md h-14 text-base rounded-2xl border-0">
          <span class="text-2xl mr-3">🎮</span>
          自主訓練
        </router-link>

        <div class="grid grid-cols-2 gap-3">
          <router-link to="/report" class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 group">
            <span class="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">📊</span>
            <div class="text-center">
              <div class="font-bold text-[var(--color-text)] text-base">詳細報告</div>
              <div class="text-xs text-[var(--color-text-secondary)]">查看分析</div>
            </div>
          </router-link>

          <router-link to="/nutrition" class="bg-[var(--color-surface-elevated)] p-3 rounded-2xl shadow-sm border border-[var(--color-border-light)] hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col items-center justify-center gap-2 group">
            <span class="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform">🥗</span>
            <div class="text-center">
              <div class="font-bold text-[var(--color-text)] text-base">腦力營養</div>
              <div class="text-xs text-[var(--color-text-secondary)]">飲食建議</div>
            </div>
          </router-link>
        </div>
      </template>

      <template v-else>
        <router-link to="/login" class="btn btn-primary btn-lg w-full shadow-md h-14 text-base rounded-2xl">
          <span class="text-2xl mr-3">👋</span>
          開始使用
        </router-link>
      </template>
    </div>
  </div>
</template>
