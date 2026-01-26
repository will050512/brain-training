<script setup lang="ts">
interface Props {
  userName: string
  userAge: number | string | null
  transferCodeLabel: string
  copiedTransferCode: boolean
  syncStatusIcon: string
  syncStatusText: string
  isSyncing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'copy-transfer-code'): void
  (e: 'logout'): void
}>()
</script>

<template>
  <div class="mb-5 bg-[var(--color-surface-elevated)] rounded-2xl shadow-sm border border-[var(--color-border-light)] overflow-hidden">
    <div class="flex items-start gap-4 p-4">
      <div class="w-14 h-14 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-3xl border-2 border-white shadow-inner shrink-0">
        👤
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-lg font-bold text-[var(--color-text)] truncate">{{ props.userName }}</p>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] shadow-sm hover:bg-[var(--color-bg-soft)] min-h-[44px]"
            :disabled="!props.transferCodeLabel"
            aria-label="複製登入碼"
            @click="emit('copy-transfer-code')"
          >
            <span class="uppercase tracking-wider text-[11px]">登入碼</span>
            <span class="font-mono text-[15px] font-bold text-[var(--color-text)] tracking-[0.12em]">
              {{ props.transferCodeLabel || '------' }}
            </span>
            <span class="text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
              {{ props.copiedTransferCode ? '已複製' : '點我複製' }}
            </span>
          </button>
        </div>
        <p class="text-sm text-[var(--color-text-secondary)] mt-1">{{ props.userAge }} 歲 · 保持大腦活躍中</p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            class="btn btn-secondary btn-sm min-h-[44px] px-3"
            @click="emit('logout')"
          >
            切換帳號
          </button>
        </div>
      </div>
    </div>

    <div class="bg-[var(--color-bg-soft)] px-4 py-2 flex items-center justify-between text-sm border-t border-[var(--color-border-light)]">
      <div class="flex items-center gap-2 text-[var(--color-text-secondary)]">
        <span class="text-base" :class="{ 'animate-spin': props.isSyncing }">
          {{ props.syncStatusIcon }}
        </span>
        <span class="font-medium">{{ props.syncStatusText }}</span>
      </div>
      <router-link
        to="/settings"
        class="text-[var(--color-primary)] text-xs font-bold px-2 py-1 rounded hover:bg-[var(--color-surface)] transition-colors"
      >
        設定同步
      </router-link>
    </div>
  </div>
</template>
